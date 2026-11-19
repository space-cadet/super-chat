import type { ChatMessage, LLMAdapter, LLMRequestOptions } from "./types";

// Adapted from obsidian-ai. Platform operations are supplied by the shared host.
export function normalizeSessionTags(values: unknown): string[] {
	if (!Array.isArray(values)) return [];
	const tags: string[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		if (typeof value !== "string") continue;
		const tag = value
			.trim()
			.replace(/^#+/, "")
			.replace(/\s+/g, " ")
			.slice(0, 32);
		const key = tag.toLocaleLowerCase();
		if (!tag || seen.has(key)) continue;
		seen.add(key);
		tags.push(tag);
		if (tags.length === 8) break;
	}
	return tags;
}

function parseSuggestedTags(raw: string): string[] {
	let text = raw.trim();
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced) text = fenced[1].trim();
	try {
		const parsed: unknown = JSON.parse(text);
		if (Array.isArray(parsed)) return normalizeSessionTags(parsed);
		if (parsed && typeof parsed === "object" && "tags" in parsed) {
			return normalizeSessionTags((parsed as { tags?: unknown }).tags);
		}
	} catch {
		// Accept a simple comma or newline separated list from less strict models.
	}
	return normalizeSessionTags(text.split(/[\n,]+/));
}

/** Suggest session labels using a bounded excerpt and the selected host profile. */
export async function generateSessionTags(
	messages: ChatMessage[],
	llmAdapter: LLMAdapter,
	request?: LLMRequestOptions,
	signal?: AbortSignal,
): Promise<string[]> {
	const context = messages
		.filter((message) => message.role === "user" || message.role === "assistant")
		.slice(-8)
		.map((message) => {
			const content = message.content
				.replace(/```[\s\S]*?```/g, "[code block]")
				.replace(/<context>[\s\S]*?<\/context>/g, "")
				.slice(0, 600);
			return `${message.role}: ${content}`;
		})
		.join("\n");
	if (!context.trim()) return [];

	const messagesForSuggestion = [
		{
			role: "system",
			content:
				"Suggest up to 5 short, useful tags for this chat session. Use specific topics, projects, or task types. Return only a JSON array of strings, with no markdown or explanation.",
		},
		{ role: "user", content: `Chat excerpt:\n${context}\n\nTags:` },
	];
	const stream = llmAdapter.streamAuxiliaryChat
		? llmAdapter.streamAuxiliaryChat(messagesForSuggestion, signal, request)
		: llmAdapter.streamChat(messagesForSuggestion, signal, request);
	let response = "";
	for await (const chunk of stream) response += chunk;
	return parseSuggestedTags(response);
}
