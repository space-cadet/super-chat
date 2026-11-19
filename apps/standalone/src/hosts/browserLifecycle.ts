import type { LifecycleCapability } from "super-chat/contracts";

const listeners = new Set<(visible: boolean) => void>();
let visible = typeof document === "undefined" || document.visibilityState !== "hidden";
let started = false;

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

function onVisibilityChange(): void {
	if (typeof document !== "undefined") {
		publishVisibility(document.visibilityState !== "hidden");
	}
}

/** Browser visibility events work in web pages and Electron renderer windows. */
export const browserLifecycle: LifecycleCapability = {
	id: "browser-visibility-lifecycle",
	kind: "lifecycle",
	start() {
		if (started || typeof document === "undefined") return;
		started = true;
		document.addEventListener("visibilitychange", onVisibilityChange);
		onVisibilityChange();
	},
	stop() {
		if (!started || typeof document === "undefined") return;
		started = false;
		document.removeEventListener("visibilitychange", onVisibilityChange);
	},
	subscribeVisibility(listener) {
		listeners.add(listener);
		listener(visible);
		return () => {
			listeners.delete(listener);
		};
	},
};
