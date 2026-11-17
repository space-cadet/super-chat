import { useCallback, useEffect, useState } from "react";
import { loadDiagnostics, type DiagnosticsSnapshot } from "../diagnostics";

function formatBytes(value: number | undefined | null): string {
	if (!value || value < 0) return "Unavailable";
	const units = ["B", "KB", "MB", "GB"];
	let amount = value;
	let unit = 0;
	while (amount >= 1024 && unit < units.length - 1) {
		amount /= 1024;
		unit += 1;
	}
	return `${amount.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="detail-row">
			<span className="detail-label">{label}</span>
			<span className="detail-value">{value}</span>
		</div>
	);
}

function permissionLabel(permission: { granted?: boolean; status?: string }) {
	if (permission.status) {
		return {
			"not-determined": "Not requested",
			granted: "Granted",
			denied: "Denied",
		restricted: "Restricted",
			unknown: "Unavailable",
		}[permission.status] ?? permission.status;
	}
	return permission.granted ? "Granted" : "Not granted";
}

function RefreshIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
			<path strokeLinecap="round" strokeLinejoin="round" d="M20 7v5h-5M4 17v-5h5" />
			<path strokeLinecap="round" strokeLinejoin="round" d="M5.6 9a7 7 0 0 1 11.65-2.15L20 12M4 12l2.75 5.15A7 7 0 0 0 18.4 15" />
		</svg>
	);
}

export function DiagnosticsScreen() {
	const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setSnapshot(await loadDiagnostics());
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
		let disposed = false;
		let removeListener: (() => void) | undefined;
		void import("@capacitor/network").then(({ Network }) =>
			Network.addListener("networkStatusChange", () => void refresh()),
		).then((handle) => {
			if (disposed) void handle.remove();
			else removeListener = () => void handle.remove();
		}).catch(() => undefined);
		return () => {
			disposed = true;
			removeListener?.();
		};
	}, [refresh]);

	const networkLabel = !snapshot
		? "Checking connection"
		: !snapshot.network.connected
			? "Offline"
			: snapshot.native?.internetValidated === true
				? "Internet access confirmed"
				: snapshot.native?.internetValidated === false
					? "Network connected; internet not confirmed"
					: "Network connected; internet status unavailable";
	const networkState = !snapshot?.network.connected ? "offline" : snapshot.native?.internetValidated ? "online" : "checking";
	const device = snapshot?.device;
	const native = snapshot?.native;

	return (
		<div className="diagnostics-page">
			<header className="diagnostics-header">
				<div>
					<p className="eyebrow">SUPER CHAT</p>
					<h1>Diagnostics</h1>
					<p className="page-subtitle">Device, app, network, and permission status</p>
				</div>
				<button className="refresh-button" type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh diagnostics">
					<RefreshIcon />
				</button>
			</header>

			<div className="diagnostics-scroll" aria-live="polite">
				<div className={`network-card network-${networkState}`}>
					<div className="network-copy">
						<span className="network-kicker">NETWORK ACCESS</span>
						<strong>{networkLabel}</strong>
						<span>{snapshot ? `Connection: ${snapshot.network.connectionType}` : "Reading current connection…"}</span>
					</div>
					<span className="network-indicator" aria-hidden="true" />
				</div>

				{error && <div className="inline-error" role="alert">Could not read every diagnostic: {error}</div>}

				<section className="diagnostic-card" aria-labelledby="device-heading">
					<div className="card-heading">
						<div className="section-mark device-mark" aria-hidden="true">D</div>
						<div><h2 id="device-heading">Device and operating system</h2><p>Host environment details</p></div>
					</div>
					<div className="detail-list">
						<DetailRow label="Platform" value={native?.hostPlatform ?? device?.platform ?? "Loading…"} />
						<DetailRow label="Device" value={[device?.manufacturer, device?.model].filter(Boolean).join(" ") || native?.processor || "Unavailable"} />
						<DetailRow label="Operating system" value={[native?.hostPlatform ?? device?.operatingSystem, native?.osVersion ?? device?.osVersion].filter(Boolean).join(" ") || "Unavailable"} />
						<DetailRow label="Architecture" value={native?.architecture ?? "Unavailable"} />
						<DetailRow label="Processor" value={native?.processor ?? "Unavailable"} />
						<DetailRow label="Processor cores" value={native?.processorCount ? String(native.processorCount) : "Unavailable"} />
						<DetailRow label="Android SDK" value={device?.androidSDKVersion ? String(device.androidSDKVersion) : "Not applicable"} />
						<DetailRow label="WebView" value={device?.webViewVersion || "Unavailable"} />
						<DetailRow label="Runtime" value={device?.isVirtual ? "Emulator or simulator" : "Physical device or browser"} />
					</div>
				</section>

				<section className="diagnostic-card" aria-labelledby="app-heading">
					<div className="card-heading">
						<div className="section-mark app-mark" aria-hidden="true">A</div>
						<div><h2 id="app-heading">App, system, and network</h2><p>Current build and available system readings</p></div>
					</div>
					<div className="detail-list">
						<DetailRow label="App" value={snapshot?.app?.name ?? "Super Chat"} />
						<DetailRow label="Version / build" value={snapshot?.app ? `${snapshot.app.version} (${snapshot.app.build})` : "Unavailable in browser preview"} />
						<DetailRow label="Network transport" value={native?.transports.length ? native.transports.join(", ") : "Unavailable"} />
						<DetailRow label="Internet validation" value={native?.internetValidated === null || !native ? "Unavailable" : native.internetValidated ? "Validated by host OS" : "Not validated"} />
						<DetailRow label="App memory" value={device?.memUsed ? formatBytes(device.memUsed) : "Unavailable"} />
						<DetailRow label="Device memory available" value={formatBytes(native?.availableMemoryBytes)} />
						<DetailRow label="Device memory total" value={formatBytes(native?.totalMemoryBytes)} />
						{snapshot?.battery && <DetailRow label="Battery" value={typeof snapshot.battery.batteryLevel === "number" ? `${Math.round(snapshot.battery.batteryLevel * 100)}%${snapshot.battery.isCharging ? " · charging" : ""}` : "Unavailable"} />}
					</div>
				</section>

				<section className="diagnostic-card" aria-labelledby="permissions-heading">
					<div className="card-heading">
						<div className="section-mark permission-mark" aria-hidden="true">P</div>
						<div><h2 id="permissions-heading">App permissions</h2><p>Permissions declared by this app</p></div>
					</div>
					{native?.permissions.length ? (
						<div className="permission-list">
							{native.permissions.map((permission) => (
								<div className="permission-row" key={permission.name}>
									<div className="permission-name">
										<strong>{permission.name.split(".").at(-1)}</strong>
										<span>{permission.category} permission</span>
									</div>
									<span className={`permission-state ${permission.status ?? (permission.granted ? "granted" : "not-granted")}`}>
										{permissionLabel(permission)}
									</span>
								</div>
							))}
						</div>
					) : (
						<div className="empty-permissions">
							<strong>{native ? "No app permissions declared" : "Native permission details unavailable"}</strong>
							<span>This screen does not request runtime permissions.</span>
						</div>
					)}
					<p className="privacy-note">This screen only reads permission status exposed by the host OS. It does not request permissions or send diagnostics anywhere.</p>
				</section>

				<footer className="diagnostics-footer">
					{loading ? "Refreshing device information…" : `Last checked ${snapshot ? new Date(snapshot.checkedAt).toLocaleTimeString() : "not available"}`}
				</footer>
			</div>
		</div>
	);
}
