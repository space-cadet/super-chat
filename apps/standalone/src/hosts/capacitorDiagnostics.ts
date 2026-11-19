import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Network } from "@capacitor/network";
import type { DiagnosticsCapability, NativeDiagnosticsSnapshot } from "../diagnostics";

interface NativeDiagnosticsPlugin {
	getSnapshot(): Promise<NativeDiagnosticsSnapshot>;
}

const NativeDiagnostics = registerPlugin<NativeDiagnosticsPlugin>("SystemDiagnostics");

/** Capacitor adapter shared by Android and Electron's native plugin bridge. */
export const capacitorDiagnostics: DiagnosticsCapability = {
	async loadSnapshot() {
		const [deviceResult, batteryResult, appResult, networkResult, nativeResult] = await Promise.allSettled([
			Device.getInfo(),
			Device.getBatteryInfo(),
			CapacitorApp.getInfo(),
			Network.getStatus(),
			Capacitor.isNativePlatform()
				? NativeDiagnostics.getSnapshot()
				: Promise.reject(new Error("Native diagnostics are unavailable on web.")),
		]);

		const device = deviceResult.status === "fulfilled"
			? deviceResult.value
			: {
				platform: "unknown",
				model: "Unavailable",
				operatingSystem: "unknown",
				osVersion: "Unavailable",
				isVirtual: false,
			};
		const network = networkResult.status === "fulfilled"
			? networkResult.value
			: { connected: navigator.onLine, connectionType: navigator.onLine ? "unknown" : "none" };

		return {
			checkedAt: Date.now(),
			device,
			battery: batteryResult.status === "fulfilled" ? batteryResult.value : null,
			app: appResult.status === "fulfilled" ? appResult.value : null,
			network,
			native: nativeResult.status === "fulfilled" ? nativeResult.value : null,
		};
	},
	async subscribeNetwork(listener) {
		const handle = await Network.addListener("networkStatusChange", () => listener());
		return () => void handle.remove();
	},
};
