import { buildBudgetedHistory } from "../context/contextBudget";
import { estimateStructuredTokens } from "../core/tokenEstimator";
import { resolveAttachments, type PdfAttachmentExtractor } from "../context/AttachmentEngine";
import { getThinkingProviderOptions } from "../api/thinkingProviderOptions";
/**
 * VercelLLMAdapter — Bridges super-chat's LLMAdapter interface to Vercel AI SDK v6.
 *
 * Supports 9 providers via AI SDK's unified provider architecture.
 * Uses streamText with stopWhen: stepCountIs(1) for single-step streaming,
 * enabling the manual AgentLoop to control multi-step execution.
 */

import {
	streamText,
	convertToModelMessages,
	stepCountIs,
	tool,
	type UIMessage,
	type DynamicToolUIPart,
	type ProviderMetadata,
	type TextStreamPart,
	type ToolSet,
} from "ai";
import { z } from "zod";
import type {
	LLMAdapter,
	ChatModelMessage,
	LLMRequestOptions,
	ToolDefinition,
	StreamEvent,
	ProviderInfo,
	ModelInfo,
	ProviderType,
	ProviderProfile,
	ToolCall,
} from "../core/types";

// ============================================================================
// Provider Factory Map — lazy-loaded to avoid bundling all providers
// ============================================================================

type ProviderFactory = (apiKey?: string, baseUrl?: string) => {
	chat: (modelId: string) => unknown;
};

const providerModules: Record<string, () => Promise<ProviderFactory>> = {
	openai: async () => {
		const { createOpenAI } = await import("@ai-sdk/openai");
		return (apiKey, baseUrl) => createOpenAI({ apiKey, baseURL: baseUrl });
	},
	anthropic: async () => {
		const { createAnthropic } = await import("@ai-sdk/anthropic");
		return (apiKey, baseUrl) => createAnthropic({ apiKey, baseURL: baseUrl });
	},
	google: async () => {
		const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
		return (apiKey, baseUrl) => createGoogleGenerativeAI({ apiKey, baseURL: baseUrl });
	},
	azure: async () => {
		const { createAzure } = await import("@ai-sdk/azure");
		return (apiKey, baseUrl) =>
			createAzure({
				apiKey,
				resourceName: baseUrl?.split(".")[0] ?? "",
			});
	},
	ollama: async () => {
		const { createOllama } = await import("ollama-ai-provider");
		return (_apiKey, baseUrl) =>
			createOllama({ baseURL: baseUrl ?? "http://localhost:11434/api" });
	},
	openrouter: async () => {
		const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
		return (apiKey, baseUrl) => createOpenRouter({ apiKey, baseURL: baseUrl });
	},
	deepseek: async () => {
		const { createDeepSeek } = await import("@ai-sdk/deepseek");
		return (apiKey, baseUrl) => createDeepSeek({ apiKey, baseURL: baseUrl });
	},
	kimi: async () => {
		const { createOpenAI } = await import("@ai-sdk/openai");
		return (apiKey, baseUrl) =>
			createOpenAI({
				apiKey,
				baseURL: baseUrl ?? "https://api.moonshot.ai/v1",
			});
	},
	custom: async () => {
		const { createOpenAI } = await import("@ai-sdk/openai");
		return (apiKey, baseUrl) => createOpenAI({ apiKey, baseURL: baseUrl });
	},
};

// ============================================================================
// VercelLLMAdapter
// ============================================================================

export interface VercelLLMAdapterOptions {
 extractPdf?: PdfAttachmentExtractor;
	profile: ProviderProfile;
	systemPrompt?: string;
}

export class VercelLLMAdapter implements LLMAdapter {
	private profile: ProviderProfile;
 private extractPdf?: PdfAttachmentExtractor;
	private systemPrompt?: string;
	private providerInstance?: ReturnType<ProviderFactory>;

	constructor(opts: VercelLLMAdapterOptions) {
		this.profile = opts.profile;
 this.extractPdf = opts.extractPdf;
		this.systemPrompt = opts.systemPrompt;
	}

	private async getProvider() {
		if (this.providerInstance) return this.providerInstance;

		const loader = providerModules[this.profile.provider];
		if (!loader) {
			throw new Error(
				`Unsupported provider: ${this.profile.provider}. ` +
					`Supported: ${Object.keys(providerModules).join(", ")}`,
			);
		}

		const factory = await loader();
		this.providerInstance = factory(
			this.profile.apiKey,
			this.profile.baseUrl,
		) as ReturnType<ProviderFactory>;
		return this.providerInstance;
	}

	// --------------------------------------------------------------------------
	// Simple text streaming (no tools)
	// --------------------------------------------------------------------------

	async *streamChatEvents(messages: ChatModelMessage[], signal?: AbortSignal, request?: LLMRequestOptions): AsyncIterable<StreamEvent> {
		yield* this.streamChatWithTools(messages, [], signal, request);
	}

	async *streamChat(
		messages: ChatModelMessage[],
		signal?: AbortSignal,
		request?: LLMRequestOptions,
	): AsyncIterable<string> {
		const provider = await this.getProvider();
		const model = provider.chat(this.profile.model);

		const prepared = await this.prepareRequest(messages, undefined, request);

		const result = streamText({
			model: model as any,
			system: prepared.system,
			messages: prepared.messages,
			abortSignal: signal,
			providerOptions: getThinkingProviderOptions(this.profile, request?.thinkingMode),
		});

		for await (const chunk of result.textStream) {
			if (signal?.aborted) break;
			yield chunk;
		}
	}

	// --------------------------------------------------------------------------
	// Tool-capable streaming (single step via stopWhen)
	// --------------------------------------------------------------------------

	async *streamChatWithTools(
		messages: ChatModelMessage[],
		tools: ToolDefinition[],
		signal?: AbortSignal,
		request?: LLMRequestOptions,
	): AsyncIterable<StreamEvent> {
		const provider = await this.getProvider();
		const model = provider.chat(this.profile.model);

		const sdkTools = this.buildSdkTools(tools);
		const prepared = await this.prepareRequest(messages, sdkTools, request);
        for(const resolved of prepared.resolved)yield {type:'message-parts-resolved',...resolved};

		const result = streamText({
			model: model as any,
			system: prepared.system,
			messages: prepared.messages,
			tools: sdkTools,
			stopWhen: stepCountIs(1),
			abortSignal: signal,
			providerOptions: getThinkingProviderOptions(this.profile, request?.thinkingMode),
		});

		let accumulatedText = "";
		const pendingCalls: ToolCall[] = [];

		for await (const chunk of result.fullStream) {
			if (signal?.aborted) break;

			const event = this.convertChunk(chunk);
			if (!event) continue;

			if (event.type === "text-delta") {
				accumulatedText += event.text;
			}
			if (event.type === "tool-call") {
				pendingCalls.push(event.call);
			}

			yield event;
		}

		if (!signal?.aborted) {
			const reason =
				pendingCalls.length > 0
					? "tool-calls-detected"
					: accumulatedText.length > 0
						? "text-complete"
						: "empty";
			yield { type: "finish", reason };
		}
	}

	// --------------------------------------------------------------------------
	// Provider info
	// --------------------------------------------------------------------------

	getProviders(): ProviderInfo[] {
		return Object.keys(providerModules).map((id) => ({
			id,
			name: this.providerDisplayName(id),
		}));
	}

	getModels(_provider: string): ModelInfo[] {
		return this.profile.models;
	}

	async testConnection(): Promise<{ ok: boolean; message: string }> {
		try {
			const provider = await this.getProvider();
			const model = provider.chat(this.profile.model);

			const result = streamText({
				model: model as any,
				prompt: "Reply with OK.",
				maxOutputTokens: 64,
				maxRetries: 0,
				abortSignal: AbortSignal.timeout(30_000),
			});

			let gotData = false;
			let completed = false;
			for await (const event of result.fullStream) {
				if (event.type === "error") throw event.error;
				if (event.type === "abort") throw new Error("Connection test timed out or was cancelled.");
				if ((event.type === "text-delta" || event.type === "reasoning-delta") && event.text.length > 0) {
					gotData = true;
				}
				if (event.type === "finish") {
					if (event.finishReason === "error" || event.finishReason === "content-filter") {
						throw new Error(`Provider ended the connection test: ${event.finishReason}.`);
					}
					completed = true;
					gotData ||= (event.totalUsage.outputTokens ?? 0) > 0;
				}
			}

			return {
				ok: completed && gotData,
				message: completed && gotData
					? `Connected to ${this.profile.provider}/${this.profile.model}`
					: "The provider returned no output. Check the selected provider and model ID, then try again.",
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : String(err),
			};
		}
	}

	// --------------------------------------------------------------------------
	// Helpers
	// --------------------------------------------------------------------------

	/**
	 * Convert simple {role, content} messages to UIMessage format for v6 SDK.
	 */
	private async prepareRequest(messages: ChatModelMessage[], tools?: ToolSet, request?: LLMRequestOptions) {
		const system = [this.systemPrompt, ...messages.filter(message => message.role === "system").map(message => message.content)]
			.filter(Boolean).join("\n\n") || undefined;
		const resolved: {messageId:string;parts:NonNullable<ChatModelMessage['resolvedParts']>}[]=[];
        const uiMessages = await this.toUIMessages(messages.filter(message => message.role !== "system"), (message,parts)=>{ if(message.messageId)resolved.push({messageId:message.messageId,parts}); });
		const modelMessages = await convertToModelMessages(uiMessages, { tools, ignoreIncompleteToolCalls: true });
		const modelContextWindow = this.profile.models.find(model => model.id === this.profile.model)?.contextWindow ?? 128000;
		const contextWindow = Math.min(modelContextWindow, request?.maxRequestTokens ?? modelContextWindow);
		const budget = buildBudgetedHistory({
			systemPrompt: system,
			currentMessage: null,
			history: modelMessages,
			options: {
				maxRequestTokens: contextWindow,
				// The source setting limits previous messages; the current user
				// message is separate in Obsidian-AI's request budget.
				maxMessages: request?.maxContextMessages !== undefined
					? request.maxContextMessages + 1
					: modelMessages.length,
				preserveRecentMessages: 2,
				responseReserveTokens: Math.min(4096, Math.floor(contextWindow / 4)),
				additionalTokens: estimateStructuredTokens(tools),
			},
		});
		if (budget.overBudget) throw new Error("The latest message and its attachments exceed this model's context budget. Remove an attachment or shorten the message.");
		return { system, messages: budget.history, resolved };
	}

	private async toUIMessages(
		messages: ChatModelMessage[],
        onResolved?: (message:ChatModelMessage,parts:NonNullable<ChatModelMessage['resolvedParts']>)=>void,
	): Promise<UIMessage[]> {
		const uiMessages: UIMessage[] = [];
		const toolPartsById = new Map<string, {
			message: UIMessage;
			partIndex: number;
		}>();

		for (let index = 0; index < messages.length; index++) {
			const message = messages[index];
			const structuredParts = message.role === "assistant"
				? this.parseStructuredParts(message.content)
				: null;
			const uiMessage: UIMessage = {
				id: `msg-${index}`,
				role: message.role as "user" | "assistant" | "system",
				parts: [],
			};

			if (!structuredParts) {
				if (message.resolvedParts?.length) {
     for(const part of message.resolvedParts){
      if(part.type==='text')uiMessage.parts.push(part);
      else if(part.type==='image')uiMessage.parts.push({type:'file',mediaType:part.image.startsWith('data:')?part.image.slice(5,part.image.indexOf(';')):'image/png',url:part.image});
      else uiMessage.parts.push({type:'file',mediaType:part.mediaType,url:'data:'+part.mediaType+';base64,'+part.data});
     }
    } else uiMessage.parts.push({ type: "text", text: message.content });
				if (!message.resolvedParts?.length && message.attachments?.length) {
					const attachmentParts = await resolveAttachments(message.attachments, undefined, this.profile.provider, this.extractPdf);
					onResolved?.(message,[{type:"text",text:message.content},...attachmentParts]);
					for (const part of attachmentParts) {
						if (part.type === "text") uiMessage.parts.push(part);
						else if (part.type === "image") uiMessage.parts.push({ type: "file", mediaType: part.image.slice(5, part.image.indexOf(";")), url: part.image });
						else uiMessage.parts.push({ type: "file", mediaType: part.mediaType, url: "data:" + part.mediaType + ";base64," + part.data });
					}
				}
				uiMessages.push(uiMessage);
				continue;
			}

			for (const part of structuredParts) {
				if (part.type === "text" && typeof part.text === "string") {
					uiMessage.parts.push({ type: "text", text: part.text });
					continue;
				}

				if (
					part.type === "tool-call" &&
					typeof part.toolCallId === "string" &&
					typeof part.toolName === "string" &&
					part.toolName.length > 0
				) {
					const toolPart: DynamicToolUIPart = {
						type: "dynamic-tool",
						toolName: part.toolName,
						toolCallId: part.toolCallId,
						state: "input-available",
						input: this.asRecord(part.input),
						...(part.providerMetadata && typeof part.providerMetadata === "object"
							? { callProviderMetadata: part.providerMetadata as ProviderMetadata }
							: {}),
					};
					const partIndex = uiMessage.parts.push(toolPart) - 1;
					toolPartsById.set(part.toolCallId, { message: uiMessage, partIndex });
					continue;
				}

				if (
					part.type === "tool-result" &&
					typeof part.toolCallId === "string" &&
					typeof part.toolName === "string"
				) {
					const storedCall = toolPartsById.get(part.toolCallId);
					const storedPart = storedCall?.message.parts[storedCall.partIndex];
					if (storedCall && storedPart?.type === "dynamic-tool") {
						const completedPart: DynamicToolUIPart = {
							type: "dynamic-tool",
							toolName: storedPart.toolName,
							toolCallId: storedPart.toolCallId,
							state: "output-available",
							input: storedPart.input,
							output: this.getToolOutputText(part.output),
							...(storedPart.callProviderMetadata
								? { callProviderMetadata: storedPart.callProviderMetadata }
								: {}),
						};
						storedCall.message.parts[storedCall.partIndex] = completedPart;
					} else {
						uiMessage.parts.push({
							type: "text",
							text: `Tool ${part.toolName} result: ${this.getToolOutputText(part.output)}`,
						});
					}
				}
			}

			if (uiMessage.parts.length > 0) uiMessages.push(uiMessage);
		}

		return uiMessages;
	}

	private parseStructuredParts(content: string): Array<Record<string, unknown>> | null {
		try {
			const value: unknown = JSON.parse(content);
			if (!Array.isArray(value) || value.length === 0) return null;
			if (!value.every((part) =>
				part !== null && typeof part === "object" && !Array.isArray(part) &&
				["text", "tool-call", "tool-result"].includes((part as Record<string, unknown>).type as string),
			)) return null;
			return value as Array<Record<string, unknown>>;
		} catch {
			return null;
		}
	}

	private asRecord(value: unknown): Record<string, unknown> {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return value as Record<string, unknown>;
		}
		if (typeof value === "string") {
			try {
				const parsed: unknown = JSON.parse(value);
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
					return parsed as Record<string, unknown>;
				}
			} catch {
				// Treat malformed or non-object tool input as empty input.
			}
		}
		return {};
	}

	private getToolOutputText(value: unknown): string {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const output = value as Record<string, unknown>;
			if (output.type === "text" && typeof output.value === "string") return output.value;
		}
		if (typeof value === "string") return value;
		try {
			return JSON.stringify(value) ?? "";
		} catch {
			return String(value);
		}
	}

	private providerDisplayName(id: string): string {
		const names: Record<string, string> = {
			openai: "OpenAI",
			anthropic: "Anthropic",
			google: "Google Gemini",
			azure: "Azure OpenAI",
			ollama: "Ollama",
			openrouter: "OpenRouter",
			deepseek: "DeepSeek",
			kimi: "Kimi (Moonshot)",
			custom: "Custom OpenAI-compatible endpoint",
		};
		return names[id] ?? id;
	}

	/**
	 * Converts super-chat ToolDefinition[] to AI SDK tool objects.
	 */
	private buildSdkTools(tools: ToolDefinition[]): ToolSet {
		const sdkTools: ToolSet = {};

		for (const t of tools) {
			const schema = this.buildZodSchema(t.parameters);
			(sdkTools as any)[t.name] = tool({
				description: t.description,
				inputSchema: schema,
			});
		}

		return sdkTools;
	}

	private buildZodSchema(params: Record<string, unknown>): z.ZodTypeAny {
		if (params.type === "object" && typeof params.properties === "object") {
			const props = params.properties as Record<string, unknown>;
			const required = Array.isArray(params.required)
				? (params.required as string[])
				: [];

			const shape: Record<string, z.ZodTypeAny> = {};
			for (const [key, prop] of Object.entries(props)) {
				shape[key] = this.jsonSchemaToZod(prop as Record<string, unknown>);
				if (!required.includes(key)) {
					shape[key] = shape[key].optional();
				}
			}
			return z.object(shape);
		}
		return z.record(z.any());
	}

	private jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
		const type = schema.type as string;
		switch (type) {
			case "string":
				return z.string();
			case "number":
			case "integer":
				return z.number();
			case "boolean":
				return z.boolean();
			case "array":
				if (schema.items) {
					return z.array(
						this.jsonSchemaToZod(schema.items as Record<string, unknown>),
					);
				}
				return z.array(z.any());
			case "object":
				if (schema.properties) {
					const props = schema.properties as Record<string, unknown>;
					const shape: Record<string, z.ZodTypeAny> = {};
					for (const [key, prop] of Object.entries(props)) {
						shape[key] = this.jsonSchemaToZod(prop as Record<string, unknown>);
					}
					return z.object(shape);
				}
				return z.record(z.any());
			default:
				return z.any();
		}
	}

	/**
	 * Convert AI SDK stream chunk to super-chat StreamEvent.
	 */
	private convertChunk(chunk: TextStreamPart<ToolSet>): StreamEvent | null {
		switch (chunk.type) {
			case "text-delta":
				return { type: "text-delta", text: chunk.text };
			case "reasoning-delta":
				return { type: "reasoning-delta", text: chunk.text };

			case "tool-call": {
				const call: ToolCall = {
					id: (chunk as any).toolCallId ?? (chunk as any).id ?? `call-${Date.now()}`,
					name: (chunk as any).toolName ?? (chunk as any).name ?? "unknown",
					args: (chunk as any).input ?? (chunk as any).args ?? {},
					...((chunk as any).providerMetadata
						? { providerMetadata: (chunk as any).providerMetadata }
						: {}),
				};
				return { type: "tool-call", call };
			}

			case "tool-result":
				return null;

			case "tool-error":
				return {
					type: "error",
					message: chunk.error instanceof Error
						? chunk.error.message
						: String(chunk.error),
				};

			case "error":
				return {
					type: "error",
					message: chunk.error instanceof Error
						? chunk.error.message
						: String(chunk.error),
				};

			case "finish-step":
				return { type: "step-finish", step: 0 };

			case "finish":
                return {type:'usage',promptTokens:chunk.totalUsage.inputTokens??0,completionTokens:chunk.totalUsage.outputTokens??0,totalTokens:chunk.totalUsage.totalTokens??0,providerUsage:{inputTokens:chunk.totalUsage.inputTokens,outputTokens:chunk.totalUsage.outputTokens,totalTokens:chunk.totalUsage.totalTokens,cachedInputTokens:chunk.totalUsage.inputTokenDetails?.cacheReadTokens,reasoningTokens:chunk.totalUsage.outputTokenDetails?.reasoningTokens}};

			default:
				return null;
		}
	}
}

// ============================================================================
// Provider Profile Builder
// ============================================================================

export function createProviderProfile(
	provider: ProviderType,
	model: string,
	apiKey: string,
	options?: {
		baseUrl?: string;
		name?: string;
		models?: ModelInfo[];
	},
): ProviderProfile {
	const id = `${provider}-${model}`.replace(/[^a-zA-Z0-9-]/g, "-");

	const defaultModels: Record<string, ModelInfo[]> = {
		openai: [
			{ id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
			{ id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
		],
		anthropic: [
			{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextWindow: 200000 },
			{ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", contextWindow: 200000 },
		],
		google: [
			{ id: "gemini-2-flash", name: "Gemini 2 Flash", contextWindow: 1000000 },
		],
		ollama: [
			{ id: "llama3.1", name: "Llama 3.1", contextWindow: 128000 },
		],
		custom: [
			{ id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
		],
		openrouter: [
			{ id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OpenRouter)", contextWindow: 200000 },
		],
		deepseek: [
			{ id: "deepseek-chat", name: "DeepSeek Chat", contextWindow: 64000 },
		],
		kimi: [
			{ id: "kimi-k2-5", name: "Kimi K2.5", contextWindow: 256000 },
		],
	};

	return {
		id,
		name: options?.name ?? `${provider} / ${model}`,
		provider,
		model,
		apiKey,
		baseUrl: options?.baseUrl,
		models: options?.models ?? defaultModels[provider] ?? [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}
