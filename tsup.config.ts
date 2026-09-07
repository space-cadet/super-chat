import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"react/index": "src/react/index.ts",
		"contracts/index": "src/contracts/index.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	splitting: true,
	sourcemap: true,
	clean: true,
	minify: false,
	external: [
		"react",
		"react-dom",
		// Resolve these in the consuming browser app so vfile uses its browser
		// condition instead of bundling Node's path/url helpers.
		"react-markdown",
		"remark-math",
		"remark-gfm",
		"rehype-katex",
		"ai",
		"zod",
		"@ai-sdk/openai",
		"@ai-sdk/anthropic",
		"@ai-sdk/google",
		"@ai-sdk/azure",
		"@ai-sdk/deepseek",
		"@openrouter/ai-sdk-provider",
		"ollama-ai-provider",
	],
});
