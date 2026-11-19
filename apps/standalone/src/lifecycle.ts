import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import type { LifecycleCapability } from "super-chat/contracts";

const listeners = new Set<(visible: boolean) => void>();
let visible = typeof document === "undefined" || document.visibilityState !== "hidden";
let listenerHandle: PluginListenerHandle | undefined;
let startPromise: Promise<void> | undefined;
let startCount = 0;

function publishVisibility(nextVisible: boolean): void {
	if (visible === nextVisible) return;
	visible = nextVisible;
	for (const listener of listeners) {
		try {
			listener(visible);
		} catch (error) {
			console.error("[standalone] lifecycle listener failed:", error);
		}
	}
}

async function startListening(): Promise<void> {
	const handle = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
		publishVisibility(isActive);
	});

	if (startCount === 0) {
		await handle.remove();
		return;
	}
	listenerHandle = handle;
	try {
		const state = await CapacitorApp.getState();
		publishVisibility(state.isActive);
	} catch (error) {
		if (listenerHandle === handle) listenerHandle = undefined;
		await handle.remove();
		throw error;
	}
}

/** Bridges Android app foreground/background events into the neutral host API. */
export const androidLifecycle: LifecycleCapability = {
	id: "android-app-lifecycle",
	kind: "lifecycle",
	async start() {
		startCount += 1;
		if (listenerHandle) return;
		if (!startPromise) {
			startPromise = startListening().finally(() => {
				startPromise = undefined;
			});
		}
		try {
			await startPromise;
		} catch (error) {
			startCount = Math.max(0, startCount - 1);
			throw error;
		}
	},
	async stop() {
		startCount = Math.max(0, startCount - 1);
		if (startCount > 0) return;
		if (startPromise) await startPromise.catch(() => undefined);
		if (startCount > 0) return;
		const handle = listenerHandle;
		listenerHandle = undefined;
		await handle?.remove();
	},
	subscribeVisibility(listener) {
		listeners.add(listener);
		listener(visible);
		return () => listeners.delete(listener);
	},
};
