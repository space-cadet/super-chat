import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Network } from "@capacitor/network";

export interface AppPermissionDiagnostic {
	name: string;
	granted?: boolean;
	status?: string;
	category: string;
}

interface NativeDiagnosticsSnapshot {
	internetValidated: boolean | null;
	transports: string[];
	permissions: AppPermissionDiagnostic[];
	totalMemoryBytes: number | null;
	availableMemoryBytes: number | null;
	hostPlatform?: string;
	osVersion?: string;
	architecture?: string;
	processor?: string | null;
	processorCount?: number;
}

interface NativeDiagnosticsPlugin {
	getSnapshot(): Promise<NativeDiagnosticsSnapshot>;
}

const NativeDiagnostics = registerPlugin<NativeDiagnosticsPlugin>("SystemDiagnostics");

export interface DiagnosticsSnapshot {
	checkedAt: number;
	device: Awaited<ReturnType<typeof Device.getInfo>>;
	battery: Awaited<ReturnType<typeof Device.getBatteryInfo>> | null;
	app: { name: string; id: string; version: string; build: string } | null;
	network: Awaited<ReturnType<typeof Network.getStatus>>;
	native: NativeDiagnosticsSnapshot | null;
}

export async function loadDiagnostics(): Promise<DiagnosticsSnapshot> {
	const [deviceResult, batteryResult, appResult, networkResult, nativeResult] = await Promise.allSettled([
		Device.getInfo(),
		Device.getBatteryInfo(),
		CapacitorApp.getInfo(),
		Network.getStatus(),
		Capacitor.isNativePlatform() ? NativeDiagnostics.getSnapshot() : Promise.reject(new Error("Native diagnostics are unavailable on web.")),
	]);

	const device = deviceResult.status === "fulfilled"
		? deviceResult.value
		: { platform: "web", model: "Unavailable", operatingSystem: "unknown", osVersion: "Unavailable", isVirtual: false, webViewVersion: "Unavailable" } as Awaited<ReturnType<typeof Device.getInfo>>;

	return {
		checkedAt: Date.now(),
		device,
		battery: batteryResult.status === "fulfilled" ? batteryResult.value : null,
		app: appResult.status === "fulfilled" ? appResult.value : null,
		network: networkResult.status === "fulfilled"
			? networkResult.value
			: { connected: navigator.onLine, connectionType: navigator.onLine ? "unknown" : "none" },
		native: nativeResult.status === "fulfilled" ? nativeResult.value : null,
	};
}
