import type { DiagnosticsCapability } from "../diagnostics";

/** Browser-owned diagnostics for web pages without native plugin access. */
export const browserDiagnostics: DiagnosticsCapability = {
	async loadSnapshot() {
		const connected = navigator.onLine;
		return {
			checkedAt: Date.now(),
			device: {
				platform: "web",
				model: "Browser",
				operatingSystem: "Browser",
				osVersion: "Unavailable",
				isVirtual: false,
			},
			battery: null,
			app: null,
			network: { connected, connectionType: connected ? "unknown" : "none" },
			native: null,
		};
	},
	async subscribeNetwork(listener) {
		window.addEventListener("online", listener);
		window.addEventListener("offline", listener);
		return () => {
			window.removeEventListener("online", listener);
			window.removeEventListener("offline", listener);
		};
	},
};
