import { describe, expect, it } from "vitest";
import {
	runRetrievalConformance,
	validateRetrievalResponse,
} from "./retrievalConformance";
import type { RetrievalCapability } from "./host";

function source(id: string, capabilityId = "fixture.retrieval") {
	return {
		id,
		title: `Source ${id}`,
		content: `Evidence ${id}`,
		provenance: {
			capabilityId,
			sourceId: id,
			retrievedAt: 1,
		},
	};
}

describe("retrieval host conformance", () => {
	it("accepts legacy arrays and rich partial outcomes", () => {
		expect(validateRetrievalResponse([source("one")], "fixture.retrieval")).toMatchObject({
			valid: true,
			responseKind: "array",
			status: "complete",
			sourceCount: 1,
		});
		expect(validateRetrievalResponse({
			sources: [source("one")],
			status: "partial",
			warnings: ["One result timed out"],
			error: { code: "unavailable", message: "Partial result" },
		}, "fixture.retrieval")).toMatchObject({
			valid: true,
			responseKind: "result",
			status: "partial",
		});
	});

	it("rejects invalid provenance, duplicates, and inconsistent terminal results", () => {
		const report = validateRetrievalResponse({
			sources: [source("one", "wrong.capability"), source("one")],
			status: "unavailable",
		}, "fixture.retrieval");

		expect(report.valid).toBe(false);
		expect(report.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
			"response.error",
			"response.sources[0].provenance.capabilityId",
			"response.sources[1].id",
		]));
	});

	it("runs a capability with a deterministic request and operation context", async () => {
		let receivedRequest: unknown;
		let receivedContext: unknown;
		const capability: RetrievalCapability = {
			id: "fixture.retrieval",
			kind: "retrieval",
			retrieve: async (request, context) => {
				receivedRequest = request;
				receivedContext = context;
				return [source("one")];
			},
		};

		const report = await runRetrievalConformance({ capability });

		expect(report.valid).toBe(true);
		expect(receivedRequest).toEqual({
			query: "super-chat retrieval conformance",
			maxResults: 3,
		});
		expect(receivedContext).toEqual({
			requestId: "super-chat-retrieval-conformance",
		});
	});

	it("reports thrown host failures as conformance failures", async () => {
		const report = await runRetrievalConformance({
			capability: {
				id: "fixture.retrieval",
				kind: "retrieval",
				retrieve: async () => {
					throw new Error("host unavailable");
				},
			},
		});

		expect(report).toMatchObject({
			valid: false,
			responseKind: "error",
			issues: [{ path: "retrieve", message: "host unavailable" }],
		});
	});
});
