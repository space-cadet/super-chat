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
