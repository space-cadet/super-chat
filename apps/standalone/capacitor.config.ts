import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.spacecadet.superchat",
	appName: "Super Chat",
	webDir: "dist",
	android: {
		adjustMarginsForEdgeToEdge: "auto",
	},
};

export default config;
