import { describe, expect, test, vi } from "vitest";
import type { LLMAdapter, StreamEvent, ToolDefinition } from "../../src/core/types";
import { createChatEngineForHost } from "../../src/adapters/HostAdapters";
import {
	createArxiviteExternalHost,
	createRetrievedSourceCapability,
} from "./arxiviteExternalAdapter";

vi.mock("@/lib/rag/chatbotIntentRouter", () => ({
	ChatbotIntentType: {
		BOOKMARKS_QUERY: "bookmarks_query",
		BOOKMARK_STATS: "bookmark_stats",
		PROFILE_QUERY: "profile_query",
		SEARCH_HISTORY_QUERY: "search_history",
		PDF_CONTENT_QUERY: "pdf_content_query",
	},
}));

vi.mock("@/lib/rag/bookmarkRetrieval", () => ({
	BookmarkRetrieval: class {
		async retrieve() {
			return {
				papers: [],
				totalCount: 2,
				reasoning: "Two bookmarked papers were found.",
			};
		}
		async getStats() {
			return { totalCount: 2, stats: { categories: { physics: 2 } } };
		}
	},
}));

vi.mock("@/lib/rag/profileRetrieval", () => ({
	ProfileRetrieval: class {
		async retrieve() {
			return {
				interests: ["quantum information"],
				topicDistribution: [],
				expertise: {
					level: "researcher",
					focusAreas: ["quantum information"],
					venues: [],
					primaryTopics: [],
				},
				hasProfile: true,
			};
		}
	},
}));

vi.mock("@/lib/rag/searchHistoryRetrieval", () => ({
	SearchHistoryRetrieval: class {
		async retrieve() {
			return {
				recentSearches: [{ query: "quantum information", timestamp: "2026-09-01" }],
				frequentSearches: [],
				hasHistory: true,
			};
		}
	},
}));

vi.mock("@/lib/rag/bookmarkContextFormatter", () => ({
	BookmarkContextFormatter: class {
		formatPapers(_papers: unknown[], totalCount: number) {
			return `Bookmarks found: ${totalCount}`;
		}
		formatStats(totalCount: number) {
			return `Bookmark count: ${totalCount}`;
		}
	},
}));

vi.mock("@/lib/rag/profileContextFormatter", () => ({
	ProfileContextFormatter: class {
		formatProfile(profile: { interests: string[] }) {
			return `Interests: ${profile.interests.join(", ")}`;
		}
	},
}));

vi.mock("@/lib/rag/searchHistoryContextFormatter", () => ({
	SearchHistoryContextFormatter: class {
		formatHistory(history: { recentSearches: Array<{ query: string }> }) {
			return `Recent searches: ${history.recentSearches.map((item) => item.query).join(", ")}`;
		}
	},
}));

vi.mock("@/lib/pdf", () => ({
	pdfContentService: {
		queryChunks: async () => [],
		formatChunksAsContext: () => "",
	},
}));

const { ToolRegistry } = await import("../../../arxivite/src/lib/rag/toolRegistry");
const { registerChatbotTools } = await import(
	"../../../arxivite/src/lib/rag/toolRegistry.chatbot"
);

class RegistryLLMAdapter implements LLMAdapter {
	async *streamChatWithTools(
		messages: Array<{ role: string; content: string }>,
		_tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncIterable<StreamEvent> {
		if (signal?.aborted) return;
		const hasToolResult = messages.some((message) =>
			message.content.includes('"tool-result"'),
		);
		if (hasToolResult) {
			yield { type: "text-delta", text: "The Arxivite registry returned the bookmark result." };
			yield { type: "finish", reason: "text-complete" };
			return;
		}
		yield {
			type: "tool-call",
			call: {
				id: "arxivite-bookmarks-call",
				name: "bookmarks",
				args: { action: "query_bookmarks", query: "my bookmarks" },
			},
		};
		yield { type: "finish", reason: "tool-calls-detected" };
	}

	async *streamChat(
		_messages: Array<{ role: string; content: string }>,
		signal?: AbortSignal,
	): AsyncIterable<string> {
		if (!signal?.aborted) yield "Arxivite registry host ready.";
	}

	getProviders() {
		return [{ id: "arxivite-test", name: "Arxivite test provider" }];
	}

	getModels() {
		return [];
	}

	testConnection = async () => ({ ok: true, message: "Arxivite test provider ready" });
}

async function collectEvents(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const events: StreamEvent[] = [];
	for await (const event of stream) events.push(event);
	return events;
}

describe("external Arxivite integration adapter", () => {
	test("loads Arxivite's real chatbot registry and exposes current host tool metadata", async () => {
		const registry = new ToolRegistry();
		await registerChatbotTools(registry);
		const host = createArxiviteExternalHost({
			registry,
			userId: "arxivite-test-user",
		});
		const tools = await host.capabilities.tools!.getTools({ requestId: "metadata" });

		expect(tools.map((tool) => tool.name)).toEqual([
			"bookmarks",
			"bookmark-stats",
			"profile",
			"search-history",
			"pdf-content",
		]);
		expect(tools[0]).toMatchObject({
			name: "bookmarks",
			title: "Bookmarks Tool",
			risk: "read",
			approval: "never",
		});
	});

	test("runs a real Arxivite registry tool through the current ChatEngine", async () => {
		const registry = new ToolRegistry();
		await registerChatbotTools(registry);
		const host = createArxiviteExternalHost({
			registry,
			userId: "arxivite-test-user",
		});
		const engine = await createChatEngineForHost({
			host,
			llmAdapter: new RegistryLLMAdapter(),
		});
		engine.createSession("Arxivite registry test");

		const events = await collectEvents(
			engine.sendMessage("Show me my bookmarks", { enableTools: true }),
		);

		expect(events.some((event) => event.type === "tool-call")).toBe(true);
		expect(events.some((event) => event.type === "tool-result")).toBe(true);
		expect(engine.getActiveSession()?.messages.at(-1)?.content).toBe(
			"The Arxivite registry returned the bookmark result.",
		);
		engine.dispose();
	});

	test("carries an Arxivite paper source through retrieval and session reload", async () => {
		const registry = new ToolRegistry();
		await registerChatbotTools(registry);
		const host = createArxiviteExternalHost({
			registry,
			userId: "arxivite-test-user",
			retrieval: createRetrievedSourceCapability({
				id: "arxiv:2401.12345",
				title: "A deterministic integration paper",
				content: "This source was supplied by the external Arxivite test adapter.",
				uri: "https://arxiv.org/abs/2401.12345",
				provenance: {
					capabilityId: "arxivite.external.retrieval",
					sourceId: "arxiv:2401.12345",
					retrievedAt: 0,
				},
			}),
		});
		const engine = await createChatEngineForHost({
			host,
			llmAdapter: new RegistryLLMAdapter(),
		});
		engine.createSession("Arxivite retrieval test");

		const events = await collectEvents(
			engine.sendMessage("Show me my bookmarks", {
				enableRAG: true,
				enableTools: true,
			}),
		);

		expect(events).toContainEqual({
			type: "rag-status",
			status: "complete",
			progress: 1,
		});
		expect(engine.getActiveSession()?.turns?.at(-1)?.retrievedSources?.[0]).toMatchObject({
			id: "arxiv:2401.12345",
			provenance: {
				capabilityId: "arxivite.external.retrieval",
				sourceId: "arxiv:2401.12345",
			},
		});

		const reloaded = await createChatEngineForHost({
			host,
			llmAdapter: new RegistryLLMAdapter(),
		});
		await reloaded.loadSessions();
		expect(reloaded.getActiveSession()?.turns?.at(-1)?.retrievedContext).toContain(
			"deterministic integration paper",
		);
		expect(reloaded.getActiveSession()?.messages.at(-1)?.sources?.[0]?.id).toBe(
			"arxiv:2401.12345",
		);
		engine.dispose();
		reloaded.dispose();
	});
});
