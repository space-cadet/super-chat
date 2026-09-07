import type {
	ChatContentPart,
	ToolCall,
	ToolResult,
} from "./types";

export interface ChatTurnOutputEntry {
	call: ToolCall;
	result?: ToolResult;
}

export interface ChatTurnOutputSnapshot {
	text: string;
	toolCalls: ChatTurnOutputEntry[];
	contentParts: ChatContentPart[];
}

/**
 * Collect one turn's model output without depending on React or a host.
 *
 * This mirrors the proven obsidian-ai turn-output mechanic: streamed text is
 * kept separate from the presentation parts, and tool results are attached to
 * their originating calls by ID.
 */
export class ChatTurnOutput {
	private text = "";
	private textCheckpoint = 0;
	private toolCalls: ChatTurnOutputEntry[] = [];
	private contentParts: ChatContentPart[] = [];

	appendText(content: string): void {
		if (content) this.text += content;
	}

	setText(text: string): void {
		this.text = text;
	}

	recordToolCall(call: ToolCall): ChatContentPart[] {
		this.appendPendingText();
		this.toolCalls.push({ call: { ...call, args: { ...call.args } } });
		this.contentParts.push({
			type: "tool_call",
			call: { ...call, args: { ...call.args } },
		});
		this.textCheckpoint = this.text.length;
		return this.contentParts.map(cloneContentPart);
	}

	recordToolResult(callId: string, result: ToolResult): ChatContentPart[] {
		const callEntry = this.toolCalls.find(
			(entry) => entry.call.id === callId,
		);
		if (callEntry) callEntry.result = { ...result };

		const part = this.contentParts.find(
			(candidate) =>
				candidate.type === "tool_call" && candidate.call.id === callId,
		);
		if (part?.type === "tool_call") part.result = { ...result };

		return this.contentParts.map(cloneContentPart);
	}

	finishText(): void {
		this.appendPendingText();
		this.textCheckpoint = this.text.length;
	}

	snapshot(): ChatTurnOutputSnapshot {
		return {
			text: this.text,
			toolCalls: this.toolCalls.map(({ call, result }) => ({
				call: { ...call, args: { ...call.args } },
				...(result ? { result: { ...result } } : {}),
			})),
			contentParts: this.contentParts.map(cloneContentPart),
		};
	}

	private appendPendingText(): void {
		const pendingText = this.text.slice(this.textCheckpoint);
		if (pendingText) {
			this.contentParts.push({ type: "text", content: pendingText });
		}
	}
}

function cloneContentPart(part: ChatContentPart): ChatContentPart {
	if (part.type === "text") return { ...part };
	return {
		type: "tool_call",
		call: { ...part.call, args: { ...part.call.args } },
		...(part.result ? { result: { ...part.result } } : {}),
	};
}
