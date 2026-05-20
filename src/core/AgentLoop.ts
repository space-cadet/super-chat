/**
 * AgentLoop — Manual multi-step tool calling loop.
 *
 * Mirrors obsidian-ai's proven implementation but stays framework-agnostic.
 * Uses callbacks (not pure async generator) because approval requires UI
 * interaction mid-stream.
 *
 * Each call to run() performs up to maxSteps iterations of:
 *   1. Stream LLM response with tools (single step via stopWhen)
 *   2. Detect tool calls from the stream
 *   3. Execute tool (auto-approved or via user confirmation)
 *   4. Feed tool result back into conversation
 *   5. Repeat until no more tool calls or maxSteps reached
 */

import type {
	ChatMessage,
	ChatSession,
	LLMAdapter,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from "./types";
import { ToolExecutor } from "./ToolExecutor";
import { estimateTokens } from "./tokenEstimator";

export interface AgentLoopOptions {
	llmAdapter: LLMAdapter;
	toolExecutor?: ToolExecutor;
	maxSteps?: number;
	autoApply?: boolean;
	/** Called with accumulated text whenever a text-delta arrives. */
	onTextDelta?: (accumulatedText: string) => void;
	/** Called when a tool call is detected (before execution/approval). */
	onToolCall?: (call: ToolCall) => void;
	/** Called when a tool result is available (after execution/approval). */
	onToolResult?: (call: ToolCall, result: ToolResult) => void;
	/** Called to request user approval. Return result to approve, null to reject. */
	requestApproval?: (call: ToolCall) => Promise<ToolResult | null>;
}

export interface AgentLoopResult {
	text: string;
	tokenEstimate: number;
	stepsTaken: number;
}

/**
 * Default tool result formatter — serializes to JSON.
 * Override per-tool by providing a custom formatter.
 */
export type ToolResultFormatter = (
	toolName: string,
	result: ToolResult,
) => string;

const defaultFormatter: ToolResultFormatter = (toolName, result) => {
	if (result.error) {
		return `Error: ${result.error}`;
	}

	// Per-tool formatting for better LLM consumption
	switch (toolName) {
		case "search_web": {
			try {
				const data = JSON.parse(result.content ?? "[]");
				if (!Array.isArray(data) || data.length === 0) return "No search results found.";
				let md = `Found ${data.length} result${data.length !== 1 ? "s" : ""}:\n\n`;
				for (const item of data) {
					md += `- **${item.title}**\n  ${item.snippet}\n  <${item.url}>\n\n`;
				}
				return md.trim();
			} catch {
				return result.content ?? "Search completed.";
			}
		}
		case "get_weather": {
			try {
				const data = JSON.parse(result.content ?? "{}");
				return (
					`**${data.location}**\n\n` +
					`- Temperature: ${data.temperature}${data.units}\n` +
					`- Condition: ${data.condition}\n` +
					`- Humidity: ${data.humidity}\n` +
					`- Forecast: ${data.forecast}`
				);
			} catch {
				return result.content ?? "Weather data unavailable.";
			}
		}
		case "fetch_arxiv": {
			try {
				const data = JSON.parse(result.content ?? "[]");
				if (!Array.isArray(data) || data.length === 0) return "No papers found.";
				let md = `Found ${data.length} paper${data.length !== 1 ? "s" : ""}:\n\n`;
				for (const paper of data) {
					md += `- **${paper.title}** (${paper.year})\n`;
					md += `  Authors: ${paper.authors.join(", ")}\n`;
					md += `  ${paper.snippet}\n`;
					md += `  <${paper.url}>\n\n`;
				}
				return md.trim();
			} catch {
				return result.content ?? "arXiv search completed.";
			}
		}
		case "calculate":
			return `Result: ${result.content}`;
		default:
			return result.content ?? JSON.stringify(result, null, 2);
	}
};

/**
 * Converts ChatMessage[] to the format expected by LLMAdapter.streamChatWithTools.
 */
function toAdapterMessages(
	messages: ChatMessage[],
): Array<{ role: string; content: string }> {
	return messages.map((m) => ({
		role: m.role,
		content: m.content,
	}));
}

export class AgentLoop {
	private opts: AgentLoopOptions;
	private formatResult: ToolResultFormatter;

	constructor(
		opts: AgentLoopOptions,
		formatResult: ToolResultFormatter = defaultFormatter,
	) {
		this.opts = opts;
		this.formatResult = formatResult;
	}

	/**
	 * Runs the agent loop with the given initial messages and tools.
	 *
	 * @param session - Chat session (for metadata)
	 * @param messages - Conversation messages (system + history + user)
	 * @param tools - Tool definitions to make available to the LLM
	 * @param signal - AbortSignal for cancellation
	 * @returns Final accumulated text and metadata
	 */
	async run(
		session: ChatSession,
		messages: ChatMessage[],
		tools: ToolDefinition[],
		signal?: AbortSignal,
		callbacks?: {
			onTextDelta?: (accumulatedText: string) => void;
			onToolCall?: (call: ToolCall) => void;
			onToolResult?: (call: ToolCall, result: ToolResult) => void;
		},
	): Promise<AgentLoopResult> {
		const { llmAdapter, toolExecutor, maxSteps = 5, autoApply = false } =
			this.opts;

		let fullText = "";
		let currentMessages = [...messages];

		for (let step = 0; step < maxSteps; step++) {
			let stepText = "";
			let pendingCalls: ToolCall[] = [];

			// Stream one step from the LLM
			const stream = llmAdapter.streamChatWithTools(
				toAdapterMessages(currentMessages),
				tools,
				signal,
			);

			for await (const event of stream) {
				if (signal?.aborted) break;

				switch (event.type) {
					case "text-delta":
						stepText += event.text;
						fullText += event.text;
						this.opts.onTextDelta?.(fullText);
						callbacks?.onTextDelta?.(fullText);
						break;
					case "tool-call":
						pendingCalls.push(event.call);
						this.opts.onToolCall?.(event.call);
						callbacks?.onToolCall?.(event.call);
						break;
					case "tool-error":
						console.warn(
							`[AgentLoop] tool-error from stream: ${event.callId} — ${event.error}`,
						);
						break;
					case "error":
						throw new Error(event.message);
					// finish, tool-result from stream are bookkeeping
					default:
						break;
				}
			}

			if (signal?.aborted) {
				console.log(`[AgentLoop] aborted during step ${step}`);
				break;
			}

			if (pendingCalls.length === 0) {
				console.log(
					`[AgentLoop] done — no tool calls at step ${step}, ${fullText.length} chars`,
				);
				return { text: fullText, tokenEstimate: estimateTokens(fullText), stepsTaken: step + 1 };
			}

			// Execute tools (with approval if not autoApply)
			const results: { call: ToolCall; result: ToolResult }[] = [];
			for (const call of pendingCalls) {
				console.log(
					`[AgentLoop] step ${step} tool-call: ${call.name}`,
					call.args,
				);

				let result: ToolResult;
				if (autoApply || !this.opts.requestApproval) {
					result = toolExecutor
						? await toolExecutor.execute(call)
						: {
								success: false,
								error: "No tool executor configured",
							};
				} else {
					result =
						(await this.opts.requestApproval(call)) ?? {
							success: false,
							error: "User rejected the tool call",
						};
				}

				console.log(
					`[AgentLoop] step ${step} tool-result:`,
					result.error ?? "success",
				);
				this.opts.onToolResult?.(call, result);
				callbacks?.onToolResult?.(call, result);
				results.push({ call, result });
			}

			// Build assistant message (text + all tool calls)
			const assistantParts: Array<{
				type: string;
				[key: string]: unknown;
			}> = [];
			if (stepText) {
				assistantParts.push({ type: "text", text: stepText });
			}
			for (const { call } of results) {
				assistantParts.push({
					type: "tool-call",
					toolCallId: call.id,
					toolName: call.name,
					input: call.args,
				});
			}

			const assistantMsg: ChatMessage = {
				id: `assistant-${session.id}-${step}`,
				role: "assistant",
				content: JSON.stringify(assistantParts),
				timestamp: Date.now(),
			};

			// Build tool result messages
			const toolMessages: ChatMessage[] = results.map(({ call, result }) => {
				const formatted = this.formatResult(call.name, result);
				const toolParts = [
					{
						type: "tool-result",
						toolCallId: call.id,
						toolName: call.name,
						output: {
							type: "text",
							value: formatted,
						},
					},
				];
				return {
					id: `tool-${call.id}`,
					role: "assistant", // Vercel SDK uses "tool" role, but our types say 'user'|'assistant'|'system'
					content: JSON.stringify(toolParts),
					timestamp: Date.now(),
				};
			});

			currentMessages = [
				...currentMessages,
				assistantMsg,
				...toolMessages,
			];
		}

		return { text: fullText, tokenEstimate: estimateTokens(fullText), stepsTaken: maxSteps };
	}
}
