import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const hostPlatform = mode === "android" || mode === "desktop" ? mode : "web";
	const hostModule = fileURLToPath(new URL(`./src/hosts/${hostPlatform}.ts`, import.meta.url));
	return {
		base: "./",
		resolve: { alias: { "@standalone-host": resolve(hostModule) } },
		plugins: [react(), tailwindcss()],
		server: { host: "0.0.0.0", port: 4173 },
		build: { outDir: "dist", emptyOutDir: true },
	};
});
