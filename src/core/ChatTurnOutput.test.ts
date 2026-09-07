import { describe, expect, it } from "vitest";
import { ChatTurnOutput } from "./ChatTurnOutput";

describe("ChatTurnOutput", () => {
	it("preserves text and tool ordering without depending on the UI", () => {
		const output = new ChatTurnOutput();
		const call = {
			id: "call-1",
			name: "read_document",
			args: { path: "paper.md" },
		};

		output.appendText("I will read it.");
		output.recordToolCall(call);
		output.recordToolResult("call-1", {
			success: true,
			content: "Document contents",
		});
		output.appendText(" Here is the result.");
		output.finishText();

		expect(output.snapshot()).toEqual({
			text: "I will read it. Here is the result.",
			toolCalls: [{ call, result: { success: true, content: "Document contents" } }],
			contentParts: [
				{ type: "text", content: "I will read it." },
				{
					type: "tool_call",
					call,
					result: { success: true, content: "Document contents" },
				},
				{ type: "text", content: " Here is the result." },
			],
		});
	});

	it("does not expose mutable call or result objects", () => {
		const output = new ChatTurnOutput();
		const call = { id: "call-1", name: "read", args: { path: "a" } };
		output.recordToolCall(call);

		const snapshot = output.snapshot();
		(snapshot.toolCalls[0].call.args as { path: string }).path = "changed";

		expect(output.snapshot().toolCalls[0].call.args.path).toBe("a");
	});
});
