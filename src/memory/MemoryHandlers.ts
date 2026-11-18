// Copied from obsidian-ai memoryHandlers, with host services injected directly.
import type { ToolResult as SharedToolResult } from "../core/types";
import { ThreeTierMemoryStore } from "./ThreeTierMemoryStore";
import { ContinuationStore, requestFingerprint } from "./pagination";
export interface MemoryToolResult extends SharedToolResult { [key: string]: unknown; }
type ToolResult = MemoryToolResult;
export interface MemoryAuditRecord { timestamp: string; operation: string; entryId: string; content?: string; }

/** Create, update, remove, list, and inspect saved memories. */
export class MemoryHandlers {
 constructor(
  private readonly store: ThreeTierMemoryStore,
  private readonly continuations: ContinuationStore,
  private readonly readAudit: () => Promise<MemoryAuditRecord[]>,
  private readonly auditEnabled: boolean,
 ) {}

	async evaluateStaged(): Promise<ToolResult> {
		if (!this.store) return { error: "Memory curation is disabled. Enable the intelligence layer in Settings." };
		try {
			const result = await this.store.evaluateStaged();
			return { success: true, content: `Promoted ${result.promoted} staged memories; demoted ${result.demoted} core memories.` };
		} catch (e: any) { return { error: `Failed to evaluate staged memories: ${e.message}` }; }
	}

	async cullCore(): Promise<ToolResult> {
		if (!this.store) return { error: "Memory curation is disabled. Enable the intelligence layer in Settings." };
		try {
			const demoted = await this.store.cullCore();
			return { success: true, content: `Demoted ${demoted} low-value core memories to the archive.` };
		} catch (e: any) { return { error: `Failed to cull core memories: ${e.message}` }; }
	}

	async createMemory(args: {
		category: string;
		content: string;
		tags?: string[];
	}): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory creation is disabled. Enable the intelligence layer in Settings → AI Intelligence Layer.",
			};
		}

		try {
			const entry = await this.store.create(
				args.category as any,
				args.content,
				args.tags,
			);
			return {
				success: true,
				entry: `[${entry.timestamp}] **${entry.category}**: ${entry.content}${entry.tags.length ? " " + entry.tags.map((t) => `#${t}`).join(" ") : ""}`,
				id: entry.id,
			};
		} catch (e: any) {
			return { error: `Failed to create memory: ${e.message}` };
		}
	}

	async updateMemory(args: {
		id: string;
		category?: string;
		content?: string;
		tags?: string[];
	}): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory update is disabled. Enable the intelligence layer in Settings.",
			};
		}

		try {
			const entry = await this.store.update(args.id, {
				category: args.category as any,
				content: args.content,
				tags: args.tags,
			});
			if (!entry) {
				return { error: `Memory not found: ${args.id}` };
			}
			return {
				success: true,
				entry: `[${entry.timestamp}] **${entry.category}**: ${entry.content}${entry.tags.length ? " " + entry.tags.map((t) => `#${t}`).join(" ") : ""}`,
				id: entry.id,
			};
		} catch (e: any) {
			return { error: `Failed to update memory: ${e.message}` };
		}
	}

	async deleteMemory(args: { id: string }): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory deletion is disabled. Enable the intelligence layer in Settings.",
			};
		}

		try {
			const deleted = await this.store.delete(
				args.id,
			);
			if (!deleted) {
				return { error: `Memory not found: ${args.id}` };
			}
			return { success: true, id: args.id };
		} catch (e: any) {
			return { error: `Failed to delete memory: ${e.message}` };
		}
	}

	async listMemories(args: {
		category?: string;
		tag?: string;
		limit?: number;
		cursor?: string;
	}): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory listing is disabled. Enable the intelligence layer in Settings.",
			};
		}

		try {
			const entries = await this.store.listAll({
				category: args.category as any,
				tag: args.tag,
			});
			const page = this.continuations.page({
				toolName: "list_memories",
				fingerprint: requestFingerprint("list_memories", {
					category: args.category ?? null,
					tag: args.tag ?? null,
				}),
				items: [...entries].reverse(),
				limit: Math.min(args.limit ?? 20, 50),
				cursor: args.cursor,
			});
			if ("error" in page) return page;
			if (page.items.length === 0) {
				return { success: true, content: "No memories found." };
			}
			const lines = page.items.map(
				(e) =>
					`- [${e.timestamp}] **${e.category}**: ${e.content}${e.tags.length ? " " + e.tags.map((t) => `#${t}`).join(" ") : ""} [id:${e.id}]`,
			);
			return {
				success: true,
				content: lines.join("\n"),
				count: page.items.length,
				total_count: page.total,
				has_more: page.hasMore,
				next_cursor: page.nextCursor,
			};
		} catch (e: any) {
			return { error: `Failed to list memories: ${e.message}` };
		}
	}

	async searchMemories(args: {
		query: string;
		limit?: number;
		cursor?: string;
	}): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory search is disabled. Enable the intelligence layer in Settings.",
			};
		}

		try {
			const entries = args.cursor
				? []
				: await this.store.search(args.query);
			const page = this.continuations.page({
				toolName: "search_memories",
				fingerprint: requestFingerprint("search_memories", {
					query: args.query,
				}),
				items: entries,
				limit: Math.min(args.limit ?? 10, 50),
				cursor: args.cursor,
			});
			if ("error" in page) return page;

			if (page.items.length === 0) {
				return {
					success: true,
					content: "No memories match your query.",
				};
			}

			const lines = page.items.map(
				(e) =>
					`- [${e.timestamp}] **${e.category}**: ${e.content}${e.tags.length ? " " + e.tags.map((t) => `#${t}`).join(" ") : ""} [id:${e.id}]`,
			);
			return {
				success: true,
				content: lines.join("\n"),
				count: page.items.length,
				total_count: page.total,
				has_more: page.hasMore,
				next_cursor: page.nextCursor,
			};
		} catch (e: any) {
			return { error: `Failed to search memories: ${e.message}` };
		}
	}

	async readMemoryAudit(args: {
		limit?: number;
		cursor?: string;
	}): Promise<ToolResult> {
		if (!this.store) {
			return {
				error: "Memory audit is disabled. Enable the intelligence layer in Settings.",
			};
		}

		if (!this.auditEnabled) {
			return {
				error: "Memory audit tool is disabled. Enable it in Settings → AI Intelligence Layer.",
			};
		}

		try {
			const entries = args.cursor
				? []
				: await this.readAudit();
			const page = this.continuations.page({
				toolName: "read_memory_audit",
				fingerprint: requestFingerprint("read_memory_audit", {}),
				items: entries,
				limit: Math.min(args.limit ?? 20, 50),
				cursor: args.cursor,
			});
			if ("error" in page) return page;
			if (page.items.length === 0) {
				return { success: true, content: "No audit entries found." };
			}

			const lines = page.items.map((e) => {
				const time = new Date(e.timestamp).toLocaleString();
				const icon =
					e.operation === "create"
						? "+"
						: e.operation === "update"
							? "✎"
							: "−";
				const preview = e.content
					? `"${e.content.slice(0, 60)}${e.content.length > 60 ? "…" : ""}"`
					: "";
				return `${time} ${icon} ${e.operation} [${e.entryId}] ${preview}`;
			});
			return {
				success: true,
				content: lines.join("\n"),
				count: page.items.length,
				total_count: page.total,
				has_more: page.hasMore,
				next_cursor: page.nextCursor,
			};
		} catch (e: any) {
			return { error: `Failed to read memory audit: ${e.message}` };
		}
	}
}
