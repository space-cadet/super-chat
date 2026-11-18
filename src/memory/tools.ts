// Copied from obsidian-ai memory tool descriptions and schemas.
import { z } from "zod";
const t = <T>(definition: T): T => definition;

export const createMemoryTool = t({
	description:
		"Create a persistent memory about the user, their preferences, " +
		"projects, or insights from the conversation. " +
		"Use when the user shares something worth remembering for future sessions. " +
		"Examples: 'I prefer Julia over Python', 'My QHE paper is due next month', " +
		"'I have two children', 'I work on loop quantum gravity'. " +
		"Be specific and concise. Include dates when relevant.",
	inputSchema: z.object({
		category: z
			.enum([
				"user_fact",
				"project",
				"preference",
				"insight",
				"reference",
			])
			.describe(
				"user_fact = personal info about user; " +
					"project = ongoing work/project; " +
					"preference = likes/dislikes/work style; " +
					"insight = interesting realization; " +
					"reference = paper/book/link worth remembering",
			),
		content: z
			.string()
			.describe(
				"The memory content — specific, concise, future-readable",
			),
		tags: z
			.array(z.string())
			.optional()
			.describe("Tags for filtering, e.g. ['physics', 'qhe', 'family']"),
	}),
});

export const updateMemoryTool = t({
	description:
		"Update an existing memory entry by its ID. " +
		"Use when the user wants to correct, expand, or reclassify a memory. " +
		"Only the fields you provide will be changed.",
	inputSchema: z.object({
		id: z.string().describe("The memory entry ID, e.g. 'a1b2c3d4'"),
		category: z
			.enum([
				"user_fact",
				"project",
				"preference",
				"insight",
				"reference",
			])
			.optional()
			.describe("New category, if changing"),
		content: z.string().optional().describe("New content, if changing"),
		tags: z
			.array(z.string())
			.optional()
			.describe("New tags, if changing (replaces existing tags)"),
	}),
});

export const deleteMemoryTool = t({
	description:
		"Delete a memory entry by its ID. " +
		"Use when the user wants to forget something or remove an incorrect memory.",
	inputSchema: z.object({
		id: z.string().describe("The memory entry ID to delete"),
	}),
});

export const listMemoriesTool = t({
	description:
		"List stored memories, optionally filtered by category or tag. " +
		"Use when the user asks 'what do you remember about me' or wants to review memories.",
	inputSchema: z.object({
		category: z
			.enum([
				"user_fact",
				"project",
				"preference",
				"insight",
				"reference",
			])
			.optional()
			.describe("Filter by category"),
		tag: z.string().optional().describe("Filter by tag (e.g. 'physics')"),
		limit: z
			.number()
			.optional()
			.default(20)
			.describe("Maximum entries to return (default 20, max 50)"),
		cursor: z
			.string()
			.optional()
			.describe(
				"Opaque cursor returned when another result page is available.",
			),
	}),
});

export const searchMemoriesTool = t({
	description:
		"Search memories by keyword across content and tags. " +
		"Use when the user asks about something specific they may have told you before.",
	inputSchema: z.object({
		query: z
			.string()
			.describe("Search query — keywords to find in memories"),
		limit: z
			.number()
			.optional()
			.default(10)
			.describe("Maximum results (default 10, max 50)"),
		cursor: z
			.string()
			.optional()
			.describe(
				"Opaque cursor returned when another result page is available.",
			),
	}),
});

export const readMemoryAuditTool = t({
	description:
		"Read the memory audit log — a record of create, update, and delete operations. " +
		"Use when the user asks about memory history, what was changed, or to debug memory issues. " +
		"Requires the memory audit tool to be enabled in Settings.",
	inputSchema: z.object({
		limit: z
			.number()
			.optional()
			.default(20)
			.describe("Maximum audit entries to return (default 20, max 50)"),
		cursor: z
			.string()
			.optional()
			.describe(
				"Opaque cursor returned when another result page is available.",
			),
	}),
});

export const evaluateStagedMemoryTool = t({
	description:
		"Evaluate staged memories and promote high-value entries into core memory. " +
		"Use after creating memories or when maintaining the memory store.",
	inputSchema: z.object({}),
});

export const cullCoreMemoryTool = t({
	description:
		"Cull low-value entries from core memory and move them to the archive. " +
		"Use when core memory needs maintenance.",
	inputSchema: z.object({}),
});
