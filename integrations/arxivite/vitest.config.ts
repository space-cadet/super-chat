import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const arxiviteRoot = resolve(
	process.env.ARXIVITE_ROOT ?? "/Users/deepak/code/arxivite",
);

export default defineConfig({
	test: {
		environment: "node",
		include: ["*.test.ts", "*.integration.test.ts"],
	},
	resolve: {
		alias: {
			"@": resolve(arxiviteRoot, "src"),
		},
	},
});
