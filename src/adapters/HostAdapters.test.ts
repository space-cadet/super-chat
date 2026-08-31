import { describe, expect, it } from "vitest";
import { HostRAGAdapter } from "./HostAdapters";
import type { RetrievalCapability } from "../contracts/host";

describe("HostRAGAdapter", () => {
	it("passes retrieval limits and cancellation into the host capability", async () => {
		let receivedRequest: { query: string; maxResults?: number } | undefined;
		let receivedSignal: AbortSignal | undefined;
		const capability: RetrievalCapability = {
			id: "test.retrieval",
			kind: "retrieval",
			retrieve: async (request, context) => {
				receivedRequest = request;
				receivedSignal = context.signal;
				return [];
			},
		};
		const signal = new AbortController().signal;
		const adapter = new HostRAGAdapter(capability);

		expect(await adapter.retrieveSources("host query", signal, { maxResults: 4 })).toEqual([]);
		expect(receivedRequest).toEqual({ query: "host query", maxResults: 4 });
		expect(receivedSignal).toBe(signal);
	});
});
