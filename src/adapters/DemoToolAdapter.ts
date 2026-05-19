/**
 * DemoToolAdapter — Mock tools for testing the tool-calling pipeline.
 *
 * Provides 4 mock tools that work offline (no API keys needed):
 * - calculate: Simple arithmetic
 * - search_web: Simulated web search
 * - get_weather: Mock weather data
 * - fetch_arxiv: Mock arXiv paper retrieval
 *
 * Useful for testing AgentLoop, ToolExecutor, and UI components
 * without real API calls.
 */

import type { ToolAdapter, ToolCall, ToolDefinition, ToolResult } from "../core/types";

export class DemoToolAdapter implements ToolAdapter {
	private tools: ToolDefinition[] = [
		{
			name: "calculate",
			description:
				"Evaluate a mathematical expression. Use this when the user asks for calculations, conversions, or numerical analysis.",
			parameters: {
				type: "object",
				properties: {
					expression: {
						type: "string",
						description: "The mathematical expression to evaluate, e.g. '2 + 2' or 'sin(pi/4)'",
					},
				},
				required: ["expression"],
			},
		},
		{
			name: "search_web",
			description:
				"Search the web for current information. Use this when the question requires up-to-date facts, news, or information not in training data.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "The search query string",
					},
					num_results: {
						type: "number",
						description: "Number of results to return (default: 5)",
						default: 5,
					},
				},
				required: ["query"],
			},
		},
		{
			name: "get_weather",
			description:
				"Get current weather for a location. Use this when the user asks about weather, temperature, or forecasts.",
			parameters: {
				type: "object",
				properties: {
					location: {
						type: "string",
						description: "City name or coordinates, e.g. 'San Francisco, CA'",
					},
					units: {
						type: "string",
						description: "Temperature units: 'celsius' or 'fahrenheit' (default: celsius)",
						default: "celsius",
					},
				},
				required: ["location"],
			},
		},
		{
			name: "fetch_arxiv",
			description:
				"Search arXiv for physics papers. Use this when the user asks about research, papers, or specific physics topics.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Search query for arXiv, e.g. 'loop quantum gravity'",
					},
					max_results: {
						type: "number",
						description: "Maximum number of papers to return (default: 3)",
						default: 3,
					},
				},
				required: ["query"],
			},
		},
	];

	getAvailableTools(): ToolDefinition[] {
		return this.tools;
	}

	async executeTool(call: ToolCall): Promise<ToolResult> {
		const { name, args } = call;

		switch (name) {
			case "calculate":
				return this.handleCalculate(args as { expression: string });
			case "search_web":
				return this.handleSearchWeb(
					args as { query: string; num_results?: number },
				);
			case "get_weather":
				return this.handleGetWeather(
					args as { location: string; units?: string },
				);
			case "fetch_arxiv":
				return this.handleFetchArxiv(
					args as { query: string; max_results?: number },
				);
			default:
				return {
					success: false,
					error: `Unknown tool: ${name}`,
				};
		}
	}

	private handleCalculate(args: { expression: string }): ToolResult {
		try {
			// Safe evaluation — only allow basic math
			const sanitized = args.expression.replace(/[^0-9+\-*/().\s^sqrtlogsinconstan]/gi, "");
			// Use Function constructor for math evaluation (safer than eval)
			const result = new Function("return " + sanitized)();
			return {
				success: true,
				content: String(result),
			};
		} catch (err) {
			return {
				success: false,
				error: `Could not evaluate expression: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	}

	private handleSearchWeb(args: {
		query: string;
		num_results?: number;
	}): ToolResult {
		const numResults = args.num_results ?? 5;
		const mockResults = [
			{
				title: `Results for "${args.query}" — Wikipedia`,
				url: `https://en.wikipedia.org/wiki/${encodeURIComponent(args.query.replace(/\s+/g, "_"))}`,
				snippet: `Wikipedia article about ${args.query}. Comprehensive overview with references and related topics.`,
			},
			{
				title: `${args.query} — Latest News`,
				url: `https://news.example.com/search?q=${encodeURIComponent(args.query)}`,
				snippet: `Recent developments and news articles about ${args.query}. Updated hourly.`,
			},
			{
				title: `${args.query} — Research Papers`,
				url: `https://scholar.example.com/?q=${encodeURIComponent(args.query)}`,
				snippet: `Academic papers and citations for ${args.query}. Peer-reviewed sources.`,
			},
		];

		return {
			success: true,
			content: JSON.stringify(
				mockResults.slice(0, numResults),
				null,
				2,
			),
		};
	}

	private handleGetWeather(args: {
		location: string;
		units?: string;
	}): ToolResult {
		const units = args.units ?? "celsius";
		const isCelsius = units === "celsius";

		// Deterministic "random" weather based on location string hash
		const hash = this.simpleHash(args.location);
		const tempC = 15 + (hash % 20); // 15-35°C
		const temp = isCelsius ? tempC : Math.round(tempC * 9 / 5 + 32);
		const conditions = ["Sunny", "Partly cloudy", "Cloudy", "Light rain", "Clear skies"];
		const condition = conditions[hash % conditions.length];
		const humidity = 40 + (hash % 50); // 40-90%

		return {
			success: true,
			content: JSON.stringify(
				{
					location: args.location,
					temperature: temp,
					units: isCelsius ? "°C" : "°F",
					condition,
					humidity: `${humidity}%`,
					forecast: `Expect ${condition.toLowerCase()} throughout the day.`,
				},
				null,
				2,
			),
		};
	}

	private handleFetchArxiv(args: {
		query: string;
		max_results?: number;
	}): ToolResult {
		const maxResults = args.max_results ?? 3;
		const mockPapers = [
			{
				id: `arxiv:2401.${1000 + (this.simpleHash(args.query) % 9000)}`,
				title: `On the ${args.query} in Quantum Field Theory`,
				authors: ["A. Einstein", "M. Planck"],
				year: 2024,
				url: `https://arxiv.org/abs/2401.${1000 + (this.simpleHash(args.query) % 9000)}`,
				snippet: `We investigate the implications of ${args.query} for modern quantum field theory...`,
			},
			{
				id: `arxiv:2312.${1000 + ((this.simpleHash(args.query) + 1) % 9000)}`,
				title: `${args.query}: A New Perspective`,
				authors: ["R. Feynman", "J. Schwinger"],
				year: 2023,
				url: `https://arxiv.org/abs/2312.${1000 + ((this.simpleHash(args.query) + 1) % 9000)}`,
				snippet: `This paper presents a novel approach to ${args.query} using path integrals...`,
			},
			{
				id: `arxiv:2311.${1000 + ((this.simpleHash(args.query) + 2) % 9000)}`,
				title: `Advances in ${args.query}`,
				authors: ["N. Bohr", "W. Heisenberg"],
				year: 2023,
				url: `https://arxiv.org/abs/2311.${1000 + ((this.simpleHash(args.query) + 2) % 9000)}`,
				snippet: `Recent experimental results have shed new light on ${args.query}...`,
			},
		];

		return {
			success: true,
			content: JSON.stringify(mockPapers.slice(0, maxResults), null, 2),
		};
	}

	private simpleHash(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}
}
