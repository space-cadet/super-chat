export interface AppPermissionDiagnostic {
	name: string;
	granted?: boolean;
	status?: string;
	category: string;
}

export interface NativeDiagnosticsSnapshot {
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

export interface DiagnosticsSnapshot {
	checkedAt: number;
	device: {
		platform: string;
		model: string;
		operatingSystem: string;
		osVersion: string;
		isVirtual: boolean;
		webViewVersion?: string;
		manufacturer?: string;
		androidSDKVersion?: number;
		memUsed?: number;
	};
	battery: { batteryLevel?: number | null; isCharging?: boolean } | null;
	app: { name: string; id: string; version: string; build: string } | null;
	network: { connected: boolean; connectionType: string };
	native: NativeDiagnosticsSnapshot | null;
}

export interface DiagnosticsCapability {
	loadSnapshot(): Promise<DiagnosticsSnapshot>;
	subscribeNetwork(listener: () => void): Promise<() => void>;
}
