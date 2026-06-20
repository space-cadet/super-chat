/**
 * AgentLoop — Manual multi-step tool calling loop.
 *
 * Refactored to use an AsyncGenerator for real-time event streaming.
 * All communication happens via yielded StreamEvents — no callbacks.
 *
 * Each call to run() performs up to maxSteps iterations of:
 *   1. Stream LLM response with tools (single step via stopWhen)
 *   2. Detect tool calls from the stream and yield them
 *   3. Execute tool (auto-approved or via user confirmation)
 *   4. Yield tool results and feed them back into conversation
 *   5. Repeat until no more tool calls or maxSteps reached
 */

import type {
	ChatMessage,
	ChatSession,
	LLMAdapter,
	StreamEvent,
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
	 * Yields StreamEvent in real-time as the loop progresses:
	 *   - text-delta: as text arrives from the LLM
	 *   - tool-call: when a tool call is detected
	 *   - tool-result: after tool execution completes
	 *   - pending-approval: when approval is needed (if not autoApply)
	 *   - step-finish: when a step completes (tools executed, messages updated)
	 *
	 * Returns AgentLoopResult when the loop finishes.
	 *
	 * @param session - Chat session (for metadata)
	 * @param messages - Conversation messages (system + history + user)
	 * @param tools - Tool definitions to make available to the LLM
	 * @param signal - AbortSignal for cancellation
	 */
	async *run(
		session: ChatSession,
		messages: ChatMessage[],
		tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncGenerator<StreamEvent, AgentLoopResult> {
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
						yield event;
						break;
					case "tool-call":
						pendingCalls.push(event.call);
						yield event;
						break;
					case "tool-error":
						console.warn(
							`[AgentLoop] tool-error from stream: ${event.callId} — ${event.error}`,
						);
						yield event;
						break;
					case "error":
						throw new Error(event.message);
					// finish, step-finish from stream are bookkeeping
					default:
						break;
				}
			}

			if (signal?.aborted) {
				console.log(`[AgentLoop] aborted during step ${step}`);
				return {
					text: fullText,
					tokenEstimate: estimateTokens(fullText),
					stepsTaken: step + 1,
				};
			}

			if (pendingCalls.length === 0) {
				console.log(
					`[AgentLoop] done — no tool calls at step ${step}, ${fullText.length} chars`,
				);
				return {
					text: fullText,
					tokenEstimate: estimateTokens(fullText),
					stepsTaken: step + 1,
				};
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
					// Notify consumer that approval is needed
					yield { type: "pending-approval", call };
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
				yield { type: "tool-result", callId: call.id, result };
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
					role: "assistant",
					content: JSON.stringify(toolParts),
					timestamp: Date.now(),
				};
			});

			currentMessages = [...currentMessages, assistantMsg, ...toolMessages];

			yield { type: "step-finish", step: step + 1 };
		}

		return {
			text: fullText,
			tokenEstimate: estimateTokens(fullText),
			stepsTaken: maxSteps,
		};
	}
}
