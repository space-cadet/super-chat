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
	type TextStreamPart,
	type ToolSet,
} from "ai";
import { z } from "zod";
import type {
	LLMAdapter,
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
		return (apiKey) => createAnthropic({ apiKey });
	},
	google: async () => {
		const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
		return (apiKey) => createGoogleGenerativeAI({ apiKey });
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
		return (apiKey) => createOpenRouter({ apiKey });
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
				baseURL: baseUrl ?? "https://api.moonshot.cn/v1",
			});
	},
};

// ============================================================================
// VercelLLMAdapter
// ============================================================================

export interface VercelLLMAdapterOptions {
	profile: ProviderProfile;
	systemPrompt?: string;
}

export class VercelLLMAdapter implements LLMAdapter {
	private profile: ProviderProfile;
	private systemPrompt?: string;
	private providerInstance?: ReturnType<ProviderFactory>;

	constructor(opts: VercelLLMAdapterOptions) {
		this.profile = opts.profile;
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

	async *streamChat(
		messages: Array<{ role: string; content: string }>,
		signal?: AbortSignal,
	): AsyncIterable<string> {
		const provider = await this.getProvider();
		const model = provider.chat(this.profile.model);

		// Convert simple {role, content} messages to UIMessage format
		// Filter out system messages — the system prompt is passed via the `system` option
		const nonSystemMessages = messages.filter((m) => m.role !== "system");
		const uiMessages = this.toUIMessages(nonSystemMessages);

		const result = streamText({
			model: model as any,
			system: this.systemPrompt,
			messages: await convertToModelMessages(uiMessages),
			abortSignal: signal,
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
		messages: Array<{ role: string; content: string }>,
		tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncIterable<StreamEvent> {
		const provider = await this.getProvider();
		const model = provider.chat(this.profile.model);

		const sdkTools = this.buildSdkTools(tools);
		// Filter out system messages — the system prompt is passed via the `system` option
		const nonSystemMessages = messages.filter((m) => m.role !== "system");
		const uiMessages = this.toUIMessages(nonSystemMessages);

		const result = streamText({
			model: model as any,
			system: this.systemPrompt,
			messages: await convertToModelMessages(uiMessages),
			tools: sdkTools,
			stopWhen: stepCountIs(1),
			abortSignal: signal,
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
				prompt: "Hi",
				maxOutputTokens: 5,
			});

			const { textStream } = result;
			let gotData = false;
			for await (const _chunk of textStream) {
				gotData = true;
				break;
			}

			return {
				ok: gotData,
				message: gotData
					? `Connected to ${this.profile.provider}/${this.profile.model}`
					: "Stream started but no data received",
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
	private toUIMessages(
		messages: Array<{ role: string; content: string }>,
	): UIMessage[] {
		return messages.map((m, i) => ({
			id: `msg-${i}`,
			role: m.role as "user" | "assistant" | "system",
			parts: [{ type: "text" as const, text: m.content }],
			createdAt: new Date(),
		}));
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

			case "tool-call": {
				const call: ToolCall = {
					id: (chunk as any).toolCallId ?? (chunk as any).id ?? `call-${Date.now()}`,
					name: (chunk as any).toolName ?? (chunk as any).name ?? "unknown",
					args: (chunk as any).input ?? (chunk as any).args ?? {},
				};
				return { type: "tool-call", call };
			}

			case "tool-result":
				return null;

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
				return null;

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
