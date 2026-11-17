import type { LLMAdapter, ProviderInfo, StreamEvent, ToolDefinition } from "super-chat";

const pause = (milliseconds: number, signal?: AbortSignal) =>
	new Promise<void>((resolve) => {
		if (signal?.aborted) return resolve();
		const finish = () => {
			clearTimeout(timeout);
			signal?.removeEventListener("abort", finish);
			resolve();
		};
		const timeout = setTimeout(finish, milliseconds);
		signal?.addEventListener("abort", finish, { once: true });
	});

export class MockTextLLMAdapter implements LLMAdapter {
	async *streamChat(
		messages: { role: string; content: string }[],
		signal?: AbortSignal,
	): AsyncIterable<string> {
		const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
		const response = latestUserMessage?.content
			? `You said: “${latestUserMessage.content}”. This is a local chat preview; no model service or device tools are connected.`
			: "This is a local chat preview. No model service or device tools are connected.";

		for (const word of response.split(/(?<=\s)/)) {
			if (signal?.aborted) return;
			yield word;
			await pause(35, signal);
		}
	}

	async *streamChatWithTools(
		messages: { role: string; content: string }[],
		_tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncIterable<StreamEvent> {
		for await (const text of this.streamChat(messages, signal)) {
			yield { type: "text-delta", text };
		}
		yield { type: "finish", reason: "text-complete" };
	}

	getProviders(): ProviderInfo[] {
		return [];
	}

	getModels(): [] {
		return [];
	}

	async testConnection(): Promise<{ ok: boolean; message: string }> {
		return { ok: false, message: "This build uses local preview responses." };
	}
}
