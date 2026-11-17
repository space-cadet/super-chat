import { net, systemPreferences } from "electron";
import { cpus, freemem, networkInterfaces, platform, release, totalmem } from "node:os";

const platformNames = {
	darwin: "macOS",
	win32: "Windows",
	linux: "Linux",
};

function getPermissionStatus(mediaType) {
	if (platform() !== "darwin" && platform() !== "win32") return "unknown";
	try {
		return systemPreferences.getMediaAccessStatus(mediaType);
	} catch {
		return "unknown";
	}
}

function getPermissions() {
	return ["camera", "microphone", "screen"].map((mediaType) => {
		const status = getPermissionStatus(mediaType);
		return {
			name: `Host ${mediaType} access`,
			category: "host media",
			status,
			granted: status === "granted",
		};
	});
}

function hasActiveNetworkInterface() {
	return Object.values(networkInterfaces()).some((interfaces) =>
		interfaces?.some((networkInterface) => !networkInterface.internal),
	);
}

class SystemDiagnosticsPlugin {
	async getSnapshot() {
		const cpuList = cpus();
		const connected = net.isOnline();
		return {
			internetValidated: connected,
			transports: connected && hasActiveNetworkInterface() ? ["active interface"] : [],
			permissions: getPermissions(),
			totalMemoryBytes: totalmem(),
			availableMemoryBytes: freemem(),
			hostPlatform: platformNames[platform()] ?? platform(),
			osVersion: release(),
			architecture: process.arch,
			processor: cpuList[0]?.model ?? null,
			processorCount: cpuList.length,
		};
	}
}

SystemDiagnosticsPlugin.__capacitorElectronPlugin = {
	name: "SystemDiagnostics",
	methods: ["getSnapshot"],
};

export { SystemDiagnosticsPlugin };
