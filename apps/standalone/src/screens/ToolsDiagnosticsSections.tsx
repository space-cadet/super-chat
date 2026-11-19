import { useEffect, useState } from "react";
import { BUILTIN_BANG_COMMANDS } from "../../../../src/lib/builtinCommands";
import {
	loadDiagnosticLogSettings,
	saveDiagnosticLogSettings,
	exportDiagnosticLog,
	type DiagnosticLogSettings,
	collectApplicationDiagnostics,
	exportRecordedTelemetry,
	defaultDebugTelemetry,
	discoverIntegrations,
	downloadDiagnostics,
	hasIntegrationBridge,
	loadDebugTelemetry,
	saveDebugTelemetry,
	setIntegrationEnabled,
	type DebugTelemetrySettings,
	type IntegrationStatus,
} from "../settingsPortTools";
import { UnavailableMark } from "./SettingsSectionSupport";

export function IntegrationsSection() {
	const [providers, setProviders] = useState<IntegrationStatus[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const bridgeAvailable = hasIntegrationBridge();
	const refresh = async () => {
		setBusy(true);
		setError("");
		try { setProviders(await discoverIntegrations()); }
		catch (cause) { setError(String(cause)); }
		finally { setBusy(false); }
	};
	useEffect(() => { void refresh(); }, []);

	return (
		<section className="settings-card settings-section-form">
			<h2>Integrations</h2>
			<p>Enable compatible providers to offer their tools. Provider credentials and configuration remain with each provider.</p>
			<button type="button" className={`settings-secondary-button${!bridgeAvailable ? " is-unavailable" : ""}`} disabled={busy || !bridgeAvailable} onClick={() => void refresh()}>
				Refresh integrations {!bridgeAvailable && <UnavailableMark label="This host does not support installed integration discovery" />}
			</button>
			{!bridgeAvailable && <p className="field-help">This host does not provide installed-plugin discovery. Obsidian peer plugins cannot be loaded by the standalone app.</p>}
			{bridgeAvailable && !providers.length && <p className="field-help">No compatible integration providers were discovered.</p>}
			{providers.map(provider => (
				<label className={`settings-option-row${provider.status === "unavailable" ? " is-unavailable" : ""}`} key={provider.id}>
					<span className="settings-option-copy">
						<strong>{provider.displayName}{provider.status === "unavailable" && <UnavailableMark label="This integration is unavailable" />}</strong>
						<small>{provider.message} {provider.capabilityCount} tools available.</small>
					</span>
					<input type="checkbox" checked={provider.enabled} disabled={busy || provider.status === "unavailable"} onChange={event => {
						const enabled = event.target.checked;
						setBusy(true);
						void setIntegrationEnabled(provider.id, enabled).then(refresh).catch(cause => { setError(String(cause)); setBusy(false); });
					}} />
				</label>
			))}
			{error && <p role="alert">{error}</p>}
		</section>
	);
}

export function ChatCommandsSection() {
	const unavailable = new Set(["!debug compact"]);
	return (
		<section className="settings-card settings-section-form">
			<h2>Chat Commands</h2>
			<p>These commands run in the composer and are handled locally.</p>
			<div className="settings-command-list">
				{BUILTIN_BANG_COMMANDS.map(({ command, description }) => {
					const isUnavailable = unavailable.has(command);
					return (
						<div className={`settings-command-row${isUnavailable ? " is-unavailable" : ""}`} key={command}>
							<code>{command}{isUnavailable && <UnavailableMark label="Manual compaction is not available in this runtime" />}</code>
							<p>{isUnavailable ? "Manual compaction is unavailable in this runtime; the full transcript is preserved." : description}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}

const telemetryControls: Array<[keyof Omit<DebugTelemetrySettings, "enabled">, string, string]> = [
	["includeProviderUsage", "Provider usage", "Include provider-reported token usage when available."],
	["includeRequestEstimates", "Request estimates", "Include estimated request and message token counts."],
	["includeRequestBreakdown", "Per-step request breakdown", "Include recorded per-model-step request estimates."],
	["includeToolDetails", "Tool details", "Include tool names, call IDs and result sizes. Arguments and result bodies are omitted."],
	["includeContextMetadata", "Context metadata", "Include attachment references without resolved contents."],
	["includeModelTiming", "Model and timing", "Include recorded model names and response duration."],
];

export function DebugModeSection() {
	const [settings, setSettings] = useState(defaultDebugTelemetry);
	const [error, setError] = useState("");
	const [ready, setReady] = useState(false);
	const [busy, setBusy] = useState(false);
	useEffect(() => { void loadDebugTelemetry().then(setSettings).catch(cause => setError(String(cause))).finally(() => setReady(true)); }, []);
	const update = async (key: keyof DebugTelemetrySettings, checked: boolean) => {
		setBusy(true);
		setError("");
		const next = { ...settings, [key]: checked };
		try { await saveDebugTelemetry(next); setSettings(next); }
		catch (cause) { setError(String(cause)); }
		finally { setBusy(false); }
	};

	return (
		<section className="settings-card settings-section-form">
			<h2>Debug Mode</h2>
			<p>Choose diagnostic details for the telemetry export. Debug mode is local to this device and off by default.</p>
			<label className="settings-option-row"><span className="settings-option-copy"><strong>Enable debug mode</strong><small>Allow selected recorded telemetry in debug exports.</small></span><input type="checkbox" checked={settings.enabled} disabled={!ready || busy} onChange={event => void update("enabled", event.target.checked)} /></label>
			{telemetryControls.map(([key, label, description]) => (
				<label className="settings-option-row" key={key}>
					<span className="settings-option-copy"><strong>{label}</strong><small>{description}</small></span>
					<input type="checkbox" checked={settings[key]} disabled={!ready || busy || !settings.enabled} onChange={event => void update(key, event.target.checked)} />
				</label>
			))}
			<button type="button" className="settings-secondary-button" disabled={!settings.enabled || busy} onClick={() => {
				setBusy(true);
				void exportRecordedTelemetry().then(value => downloadDiagnostics(value, "super-chat-telemetry.json")).catch(cause => setError(String(cause))).finally(() => setBusy(false));
			}}>Export recorded telemetry</button>
			<p className="field-help">Only telemetry already recorded by the runtime is available. These controls do not enable network logging.</p>
			{error && <p role="alert">{error}</p>}
		</section>
	);
}

export function DiagnosticsSettingsSection() {
	const [logSettings, setLogSettings] = useState<DiagnosticLogSettings>();
	const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof collectApplicationDiagnostics>>>();
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	useEffect(() => { void loadDiagnosticLogSettings().then(setLogSettings).catch(cause => setError(String(cause))); }, []);
	const updateLog = (next: DiagnosticLogSettings) => { void saveDiagnosticLogSettings(next).then(setLogSettings).catch(cause => setError(String(cause))); };
	const refresh = async () => {
		setBusy(true);
		setError("");
		try { setSnapshot(await collectApplicationDiagnostics()); }
		catch (cause) { setError(String(cause)); }
		finally { setBusy(false); }
	};
	useEffect(() => { void refresh(); }, []);

	return (
		<section className="settings-card settings-section-form">
			<h2>Diagnostics</h2>
			{logSettings && <>
				<label className="settings-field">Debug log level<select value={logSettings.level} onChange={event => updateLog({ ...logSettings, level: event.target.value as DiagnosticLogSettings["level"] })}>{["off", "error", "info", "debug"].map(level => <option key={level}>{level}</option>)}</select></label>
				{([ ["maxSizeMB", "Maximum log size (MB)", 0.1, 100], ["retention", "Log entries retained", 1, 10000], ["memoryIntervalSeconds", "Memory snapshot interval (seconds)", 60, 3600] ] as const).map(([key, label, min, max]) => (
					<label className="settings-field" key={key}>{label}<input type="number" min={min} max={max} value={logSettings[key]} onChange={event => setLogSettings({ ...logSettings, [key]: Number(event.target.value) })} onBlur={() => updateLog(logSettings)} /></label>
				))}
				<button className="settings-secondary-button" type="button" onClick={() => void exportDiagnosticLog().then(value => downloadDiagnostics(value, "super-chat-diagnostic-log.json")).catch(cause => setError(String(cause)))}>Export diagnostic log</button>
			</>}
			<p>Inspect saved chat health and application metrics. Exports contain session IDs and counts, without conversation contents or credentials.</p>
			{snapshot && <>
				<dl className="settings-metric-list">
					<dt>Chat sessions</dt><dd>{snapshot.sessions.length}</dd>
					<dt>Total messages</dt><dd>{snapshot.messageCount}</dd>
					<dt>DOM nodes</dt><dd>{snapshot.runtime.domNodes}</dd>
					<dt>JS heap used{!snapshot.runtime.heap && <UnavailableMark label="Heap metrics are unavailable in this runtime" />}</dt><dd>{snapshot.runtime.heap ? `${(snapshot.runtime.heap.used / 1048576).toFixed(1)} MB` : "Unavailable in this runtime"}</dd>
					<dt>Browser storage usage{snapshot.runtime.storageUsage === null && <UnavailableMark label="Storage usage is unavailable in this runtime" />}</dt><dd>{snapshot.runtime.storageUsage === null ? "Unavailable" : `${(snapshot.runtime.storageUsage / 1048576).toFixed(1)} MB`}</dd>
				</dl>
				<h3>Data health</h3>
				{snapshot.health.length ? <ul>{snapshot.health.map((issue, index) => <li key={index}>{issue.sessionId}: {issue.issue}</li>)}</ul> : <p className="field-help">No structural issues found in saved sessions.</p>}
			</>}
			<div className="settings-action-grid">
				<button className="settings-secondary-button" type="button" disabled={busy} onClick={() => void refresh()}>Refresh metrics and check data health</button>
				<button className="settings-secondary-button" type="button" disabled={busy || !snapshot} onClick={() => snapshot && downloadDiagnostics(snapshot)}>Export diagnostics</button>
				<button className="settings-secondary-button is-unavailable" type="button" disabled>Repair chat data <UnavailableMark label="Automatic repair needs a host recovery service" /></button>
			</div>
			<p className="field-help">Automatic repair and Obsidian log-file rotation require host support. The standalone app does not have an Obsidian plugin directory.</p>
			{error && <p role="alert">{error}</p>}
		</section>
	);
}
