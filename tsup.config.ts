import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"react/index": "src/react/index.ts",
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
