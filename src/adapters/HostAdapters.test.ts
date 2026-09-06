import { describe, expect, it } from "vitest";
import { HostRAGAdapter, HostToolAdapter } from "./HostAdapters";
import type {
	RetrievalCapability,
	ToolCapability,
	HostToolDescriptor,
} from "../contracts/host";

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

	it("passes rich retrieval outcomes through the neutral host adapter", async () => {
		const capability: RetrievalCapability = {
			id: "test.retrieval",
			kind: "retrieval",
			retrieve: async () => ({
				sources: [],
				status: "partial",
				warnings: ["One source was unavailable"],
				error: { code: "unavailable", message: "Partial result" },
			}),
		};
		const adapter = new HostRAGAdapter(capability);

		expect(await adapter.retrieveSources("partial query")).toMatchObject({
			status: "partial",
			warnings: ["One source was unavailable"],
		});
	});
});

describe("HostToolAdapter", () => {
	function tool(name: string, approval: HostToolDescriptor["approval"] = "never"):
		HostToolDescriptor {
		return {
			name,
			title: name,
			description: `Run ${name}.`,
			parameters: { type: "object", properties: {} },
			risk: approval === "never" ? "read" : "write",
			approval,
		};
	}

	it("composes providers and routes calls with cancellation", async () => {
		let receivedSignal: AbortSignal | undefined;
		const first: ToolCapability = {
			id: "provider.first",
			kind: "tools",
			getTools: async () => [tool("read_first")],
			executeTool: async (_call, context) => {
				receivedSignal = context.signal;
				return { success: true, content: "first" };
			},
		};
		const second: ToolCapability = {
			id: "provider.second",
			kind: "tools",
			getTools: async () => [tool("write_second", "always")],
			executeTool: async () => ({ success: true, content: "second" }),
		};
		const adapter = await HostToolAdapter.create([first, second]);
		const signal = new AbortController().signal;

		expect(adapter.getAvailableTools().map(({ name }) => name)).toEqual([
			"read_first",
			"write_second",
		]);
		expect(
			await adapter.executeTool(
				{ id: "call-1", name: "read_first", args: {} },
				signal,
			),
		).toEqual({ success: true, content: "first" });
		expect(receivedSignal).toBe(signal);
	});

	it("rejects duplicate tool names before execution", async () => {
		const duplicate = (id: string): ToolCapability => ({
			id,
			kind: "tools",
			getTools: async () => [tool("same_tool")],
			executeTool: async () => ({ success: true }),
		});

		await expect(
			HostToolAdapter.create([duplicate("one"), duplicate("two")]),
		).rejects.toThrow("Duplicate host tool name: same_tool");
	});
});
