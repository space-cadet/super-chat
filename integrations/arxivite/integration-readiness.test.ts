import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import type {
	ChatPersistenceCapability,
	IdentityCapability,
	RetrievalCapability,
	SuperChatHost,
} from "../../src/contracts/host";
import {
	assertHostContract,
	validateHostContract,
} from "../../src/contracts/validation";
import { runRetrievalConformance } from "../../src/contracts/retrievalConformance";

const arxiviteRoot = resolve(
	process.env.ARXIVITE_ROOT ?? "/Users/deepak/code/arxivite",
);
const superChatRoot = resolve(
	process.env.SUPER_CHAT_ROOT ?? "/Users/deepak/code/super-chat",
);

function git(...args: string[]): string {
	return execFileSync("git", args, {
		cwd: arxiviteRoot,
		encoding: "utf8",
	}).trim();
}

function readArxivite(relativePath: string): string {
	return readFileSync(resolve(arxiviteRoot, relativePath), "utf8");
}

test("the original Arxivite checkout is clean and the submodule is pinned", () => {
	expect(git("status", "--porcelain")).toBe("");

	const gitlink = git("ls-tree", "HEAD", "packages/super-chat")
		.match(/[0-9a-f]{40}/)?.[0];
	const submoduleHead = execFileSync(
		"git",
		["-C", resolve(arxiviteRoot, "packages/super-chat"), "rev-parse", "HEAD"],
		{ encoding: "utf8" },
	).trim();

	expect(gitlink).toMatch(/^[0-9a-f]{40}$/);
	expect(submoduleHead).toBe(gitlink);

	const currentSuperChatHead = execFileSync(
		"git",
		["-C", superChatRoot, "rev-parse", "HEAD"],
		{ encoding: "utf8" },
	).trim();
	console.info(
		`Arxivite submodule=${submoduleHead.slice(0, 12)}; current super-chat=${currentSuperChatHead.slice(0, 12)}`,
	);
});

test("the active Arxivite path is still the transitional wrapper", () => {
	const page = readArxivite("src/pages/chatbot.tsx");
	const assistant = readArxivite("src/components/chat/ChatbotAssistant.tsx");

	expect(page).toContain("useState(false)");
	expect(assistant).toContain("new ChatEngine({");
	expect(assistant).toContain("new ArxiviteLLMAdapter(");
	expect(assistant).toContain("new ArxiviteToolAdapter(");
	expect(assistant).toContain("await addMessage({");
	expect(assistant).toContain("for await (const event of stream)");

	// These are not yet part of the active path.
	expect(assistant).not.toContain("SuperChatApp");
	expect(assistant).not.toContain("ArxivitePersistenceAdapter");
	expect(assistant).not.toContain("ArxiviteRAGAdapter");
});

test("the disposable Arxivite-shaped host satisfies the shared host contract", async () => {
	const identity: IdentityCapability = {
		id: "arxivite.test.identity",
		kind: "identity",
		getIdentity: async () => ({ id: "arxivite-test-user" }),
	};

	const sessions = new Map();
	const persistence: ChatPersistenceCapability = {
		id: "arxivite.test.persistence",
		kind: "persistence",
		schemaVersion: 1,
		loadSessions: async () => [...sessions.values()],
		saveSession: async (session) => {
			sessions.set(session.id, session);
		},
		deleteSession: async (sessionId) => {
			sessions.delete(sessionId);
		},
		archiveSession: async () => undefined,
	};

	const retrieval: RetrievalCapability = {
		id: "arxivite.test.retrieval",
		kind: "retrieval",
		retrieve: async (request, context) => [{
			id: "arxiv:2301.00001",
			title: "A test paper",
			content: `Retrieved for ${request.query}`,
			uri: "https://arxiv.org/abs/2301.00001",
			score: 1,
			metadata: { requestId: context.requestId },
			provenance: {
				capabilityId: "arxivite.test.retrieval",
				sourceId: "arxiv:2301.00001",
				retrievedAt: 0,
			},
		}],
	};

	const host: SuperChatHost = {
		id: "arxivite-test-host",
		name: "Arxivite Test Host",
		version: "0",
		capabilities: { identity, persistence, retrieval },
	};

	const report = validateHostContract(host);
	expect(report.valid).toBe(true);
	assertHostContract(host);

	const retrievalReport = await runRetrievalConformance({ capability: retrieval });
	expect(retrievalReport.valid).toBe(true);
	expect(retrievalReport.sourceCount).toBe(1);
});
