/** Provider implementations copied from obsidian-ai webHandlers; network supplied by host. */
export type WebSearchProvider = "duckduckgo" | "brave" | "tavily" | "exa" | "searxng";
export interface WebSearchSettings {
 webSearchProvider: WebSearchProvider; braveApiKey: string; tavilyApiKey: string; exaApiKey: string; searxngUrl: string;
}
export const DEFAULT_WEB_SEARCH_SETTINGS: WebSearchSettings = { webSearchProvider: "duckduckgo", braveApiKey: "", tavilyApiKey: "", exaApiKey: "", searxngUrl: "" };
export interface WebRequest { url: string; method: string; headers?: Record<string, string>; body?: string }
export type WebRequester = (request: WebRequest) => Promise<{ status: number; text: string }>;
export interface WebSearchResult { title: string; url: string; snippet: string }
export class WebSearchService {
 constructor(private settings: WebSearchSettings, private request: WebRequester) {}
 async search(query: string, limit = 5): Promise<WebSearchResult[]> {
  if (!query.trim()) throw new Error("Enter a search query.");
  const bounded = Math.min(20, Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 5)));
  switch (this.settings.webSearchProvider) {
   case "brave": return this.searchBrave(query, bounded);
   case "tavily": return this.searchTavily(query, bounded);
   case "exa": return this.searchExa(query, bounded);
   case "searxng": return this.searchSearXNG(query, bounded);
   case "duckduckgo": return this.searchDuckDuckGo(query, bounded);
   default: throw new Error("Unknown web search provider.");
  }
 }
	private async searchBrave(
		query: string,
		limit: number,
	): Promise<Array<{ title: string; url: string; snippet: string }>> {
		const apiKey = this.settings.braveApiKey;
		if (!apiKey) {
			throw new Error(
				"Brave Search API key not configured. Add it in Settings → Web Search.",
			);
		}

		const url = new URL("https://api.search.brave.com/res/v1/web/search");
		url.searchParams.set("q", query);
		url.searchParams.set("count", String(limit));
		url.searchParams.set("offset", "0");

		const res = await this.request({
			url: url.toString(),
			method: "GET",
			headers: {
				"X-Subscription-Token": apiKey,
				Accept: "application/json",
			},
		});

		if (res.status < 200 || res.status >= 300) {
			const text = res.text || "";
			throw new Error(`Brave API ${res.status}: ${text}`);
		}

		const data = JSON.parse(res.text);
		const results = data.web?.results ?? [];

		return results.slice(0, limit).map((r: any) => ({
			title: r.title ?? "Untitled",
			url: r.url ?? "",
			snippet: r.description ?? "",
		}));
	}

	private async searchDuckDuckGo(
		query: string,
		limit: number,
	): Promise<Array<{ title: string; url: string; snippet: string }>> {
		// DuckDuckGo HTML scraping — no API key needed
		const url = new URL("https://html.duckduckgo.com/html/");
		url.searchParams.set("q", query);
		url.searchParams.set("kl", "us-en"); // region

		const res = await this.request({
			url: url.toString(),
			method: "GET",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0",
			},
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`DuckDuckGo ${res.status}`);
		}

		const html = res.text;
		const results: Array<{ title: string; url: string; snippet: string }> =
			[];

		// Parse using DOMParser instead of regex to avoid ReDoS
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");

		// Find all result containers

		// Collect links and snippets
		const linkElements = doc.querySelectorAll("a.result__a");
		const snippetElements = doc.querySelectorAll("a.result__snippet");

		for (
			let i = 0;
			i < linkElements.length && results.length < limit;
			i++
		) {
			const linkEl = linkElements[i];
			const rawUrl = linkEl.getAttribute("href") ?? "";
			const title = this.stripHtml(linkEl.textContent ?? "");

			// Try to find matching snippet
			let snippet = "";
			if (snippetElements[i]) {
				snippet = this.stripHtml(snippetElements[i].textContent ?? "");
			}

			// DuckDuckGo redirects through their own URL — try to extract real URL
			let url = rawUrl;
			if (rawUrl.startsWith("//duckduckgo.com/l/")) {
				try {
					const u = new URL("https:" + rawUrl);
					url = u.searchParams.get("uddg") ?? rawUrl;
				} catch {
					// keep rawUrl
				}
			}

			if (title && url) {
				results.push({ title, url, snippet });
			}
		}

		return results;
	}

	private async searchSearXNG(
		query: string,
		limit: number,
	): Promise<Array<{ title: string; url: string; snippet: string }>> {
		const baseUrl = this.settings.searxngUrl?.replace(/\/$/, "");
		if (!baseUrl) {
			throw new Error(
				"SearXNG URL not configured. Add it in Settings → Web Search.",
			);
		}

		const url = new URL(`${baseUrl}/search`);
		url.searchParams.set("q", query);
		url.searchParams.set("format", "json");
		url.searchParams.set("language", "en");

		const res = await this.request({ url: url.toString(), method: "GET" });
		if (res.status < 200 || res.status >= 300) {
			throw new Error(`SearXNG ${res.status}`);
		}

		const data = JSON.parse(res.text);
		const results = data.results ?? [];

		return results.slice(0, limit).map((r: any) => ({
			title: r.title ?? "Untitled",
			url: r.url ?? "",
			snippet: r.content ?? r.abstract ?? "",
		}));
	}

	private async searchTavily(
		query: string,
		limit: number,
	): Promise<Array<{ title: string; url: string; snippet: string }>> {
		const apiKey = this.settings.tavilyApiKey;
		if (!apiKey) {
			throw new Error(
				"Tavily API key not configured. Add it in Settings → Web Search.",
			);
		}

		const res = await this.request({
			url: "https://api.tavily.com/search",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				api_key: apiKey,
				query,
				search_depth: "basic",
				max_results: limit,
				include_answer: false,
				include_images: false,
				include_raw_content: false,
			}),
		});

		if (res.status < 200 || res.status >= 300) {
			const text = res.text || "";
			throw new Error(`Tavily API ${res.status}: ${text}`);
		}

		const data = JSON.parse(res.text);
		const results = data.results ?? [];

		return results.slice(0, limit).map((r: any) => ({
			title: r.title ?? "Untitled",
			url: r.url ?? "",
			snippet: r.content ?? r.snippet ?? "",
		}));
	}

	private async searchExa(
		query: string,
		limit: number,
	): Promise<Array<{ title: string; url: string; snippet: string }>> {
		const apiKey = this.settings.exaApiKey;
		if (!apiKey) {
			throw new Error(
				"Exa API key not configured. Add it in Settings → Web Search.",
			);
		}

		const res = await this.request({
			url: "https://api.exa.ai/search",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				query,
				num_results: limit,
				use_autoprompt: false,
				contents: {
					text: { max_characters: 500 },
				},
			}),
		});

		if (res.status < 200 || res.status >= 300) {
			const text = res.text || "";
			throw new Error(`Exa API ${res.status}: ${text}`);
		}

		const data = JSON.parse(res.text);
		const results = data.results ?? [];

		return results.slice(0, limit).map((r: any) => ({
			title: r.title ?? r.author ?? "Untitled",
			url: r.url ?? "",
			snippet: r.text ?? r.highlight ?? "",
		}));
	}

	private stripHtml(html: string): string {
		return html
			.replace(/<[^>]+>/g, "")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ")
			.trim();
	}

}
