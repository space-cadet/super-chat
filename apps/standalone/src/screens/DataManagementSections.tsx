import { useEffect, useState } from "react";
import {
	componentLabels,
	defaultSyncComponents,
	loadSyncComponents,
	saveSyncComponents,
	defaultRemotePreferences,
	loadRemotePreferences,
	saveRemotePreferences,
	runRemoteSync,
	exportSettings,
	importSettings,
	importChats,
	clearChatHistory,
	exportChats,
	saveDataFile,
	type SyncComponents,
	type RemotePreferences,
} from "../dataManagement";
import { UnavailableMark } from "./SettingsSectionSupport";

function useAction() {
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	return {
		message,
		busy,
		run: async (action: () => Promise<string | void>, successMessage = "Saved.") => {
			setBusy(true);
			try {
				setMessage((await action()) || successMessage);
			} catch (error) {
				setMessage(error instanceof Error ? error.message : String(error));
			} finally {
				setBusy(false);
			}
		},
	};
}

export function SyncComponentsSection() {
	const [value, setValue] = useState<SyncComponents>(defaultSyncComponents);
	const action = useAction();
	useEffect(() => {
		void action.run(async () => {
			setValue(await loadSyncComponents());
			return "";
		}, "");
	}, []);

	const update = (key: keyof SyncComponents, checked: boolean) => {
		const next = { ...value, [key]: checked };
		setValue(next);
		void action.run(() => saveSyncComponents(next));
	};

	return (
		<div className="settings-section-form">
			<p>Choose which data categories remote sync includes. Usage statistics contain session and message counts only.</p>
			<div className="settings-option-list">
				{(Object.keys(componentLabels) as (keyof SyncComponents)[]).map(key => (
					<label className={`settings-option-row${key === "apiKeys" ? " is-unavailable" : ""}`} key={key}>
						<span className="settings-option-copy">
							<strong>{componentLabels[key]}{key === "apiKeys" && <UnavailableMark label="Secure credential transfer is not connected" />}</strong>
							{key === "apiKeys" && <small>Unavailable until secure credential transfer is connected.</small>}
							{key === "usageStats" && <small>Session and message counts; provider token totals are not available.</small>}
						</span>
						<input type="checkbox" checked={value[key]} disabled={key === "apiKeys" || action.busy} onChange={event => update(key, event.target.checked)} />
					</label>
				))}
			</div>
			<p className="settings-inline-status" role="status">{action.message}</p>
		</div>
	);
}

export function BackupRestoreSection() {
	const action = useAction();
	const [format, setFormat] = useState<"json" | "jsonl">("json");
	const importFile = (kind: "settings" | "chats", file: File) => {
		void action.run(async () => {
			if (kind === "settings") {
				await importSettings(await file.text());
				window.location.reload();
				return "Settings imported.";
			}
			const count = await importChats(await file.text(), file.name);
			window.location.reload();
			return `${count} chats imported.`;
		});
	};

	return (
		<div className="settings-section-form">
			<p>Settings exports omit credentials. Chat archives support legacy JSON and JSONL. This app stores data in IndexedDB, so Obsidian file migration and rolling data.json backups do not apply.</p>
			<div className="settings-action-grid">
				<button className="settings-secondary-button" type="button" disabled={action.busy} onClick={() => void action.run(async () => { await saveDataFile("super-chat-settings.json", await exportSettings()); return "Settings exported without secrets."; })}>Export settings</button>
				<button className="settings-secondary-button is-unavailable" type="button" disabled>Export with secrets <UnavailableMark label="Secure credential export is not connected" /></button>
				<button className="settings-secondary-button" type="button" disabled={action.busy} onClick={() => void action.run(async () => { await saveDataFile(`super-chat-history.${format}`, await exportChats(format)); return "Chat archive exported."; })}>Export chats</button>
			</div>
			<label className="settings-field">Chat archive format<select value={format} onChange={event => setFormat(event.target.value as typeof format)}><option value="json">Legacy JSON archive</option><option value="jsonl">JSONL archive</option></select></label>
			<label className="settings-field">Import settings<input type="file" accept=".json,application/json" disabled={action.busy} onChange={event => { const file = event.target.files?.[0]; if (file) importFile("settings", file); event.target.value = ""; }} /></label>
			<label className="settings-field">Import saved chats<input type="file" accept=".json,.jsonl" disabled={action.busy} onChange={event => { const file = event.target.files?.[0]; if (file) importFile("chats", file); event.target.value = ""; }} /></label>
			<div className="settings-action-grid">
				<button className="settings-danger-button" type="button" disabled={action.busy} onClick={() => { if (window.confirm("Clear all saved chats? A local recovery copy will be kept. The app will reload.")) void action.run(async () => { await clearChatHistory(); window.location.reload(); }); }}>Clear all chat history</button>
				<button className="settings-secondary-button" type="button" onClick={() => window.location.reload()}>Reload app</button>
			</div>
			<p className="settings-inline-status" role="status">{action.message}</p>
		</div>
	);
}

export function RemoteStorageSection() {
	const [value, setValue] = useState<RemotePreferences>(defaultRemotePreferences);
	const [password, setPassword] = useState("");
	const [passphrase, setPassphrase] = useState("");
	const action = useAction();
	useEffect(() => {
		void action.run(async () => { setValue(await loadRemotePreferences()); return ""; }, "");
	}, []);

	const update = <K extends keyof RemotePreferences>(key: K, next: RemotePreferences[K]) => {
		const changed = { ...value, [key]: next };
		setValue(changed);
		void action.run(() => saveRemotePreferences(changed));
	};

	return (
		<div className="settings-section-form">
			<label className="settings-option-row"><span className="settings-option-copy"><strong>Enable remote storage</strong><small>Turn on WebDAV sync for selected data.</small></span><input type="checkbox" checked={value.enabled} onChange={event => update("enabled", event.target.checked)} /></label>
			<fieldset className="settings-choice-fieldset">
				<legend>Backend</legend>
				<div className="settings-choice-list">
					<label className="settings-choice"><input type="radio" name="remote-backend" checked={value.backend === "webdav"} onChange={() => update("backend", "webdav")} /><span className="settings-option-copy"><strong>WebDAV</strong><small>Available on this app. Enter the server details below.</small></span></label>
					<div className="settings-choice is-unavailable" aria-disabled="true"><span className="settings-option-copy"><strong>S3 <UnavailableMark label="S3 storage is not implemented" /></strong><small>This backend is not implemented.</small></span></div>
					<div className="settings-choice is-unavailable" aria-disabled="true"><span className="settings-option-copy"><strong>Custom REST <UnavailableMark label="Custom REST storage is not implemented" /></strong><small>This backend is not implemented.</small></span></div>
				</div>
			</fieldset>
			<label className="settings-field">WebDAV URL<input type="url" value={value.url} placeholder="https://storage.example.com" onChange={event => update("url", event.target.value)} /></label>
			<label className="settings-field">Username<input autoComplete="username" value={value.username} onChange={event => update("username", event.target.value)} /></label>
			<label className="settings-field">Remote path prefix<input value={value.prefix} onChange={event => update("prefix", event.target.value)} /></label>
			<label className="settings-field">Password or token<input type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} /></label>
			<label className="settings-option-row"><span className="settings-option-copy"><strong>Encrypt remote chats</strong><small>Protect synced data with your passphrase.</small></span><input type="checkbox" checked={value.encrypted} onChange={event => update("encrypted", event.target.checked)} /></label>
			<label className="settings-field">Encryption passphrase<input type="password" autoComplete="new-password" value={passphrase} onChange={event => setPassphrase(event.target.value)} /><span className="field-help">Passwords and passphrases stay in memory and must be entered again after leaving Settings.</span></label>
			<p className="field-help">Browser WebDAV requires server CORS support. Android uses the native HTTP adapter.</p>
			<div className="settings-option-row is-unavailable" aria-disabled="true"><span className="settings-option-copy"><strong>Automatic sync <UnavailableMark label="Automatic sync is disabled pending verification" /></strong><small>Disabled pending verification, matching the source app.</small></span><input type="checkbox" disabled aria-label="Automatic sync unavailable" /></div>
			<label className="settings-field">Sync direction<select value={value.direction} onChange={event => update("direction", event.target.value as RemotePreferences["direction"])}><option value="both">Both directions</option><option value="upload">Upload only</option><option value="download">Download only</option></select></label>
			<label className="settings-field">Conflict strategy<select value={value.conflictStrategy} onChange={event => update("conflictStrategy", event.target.value as RemotePreferences["conflictStrategy"])}><option value="keep-both">Keep both</option><option value="last-write-wins">Last write wins</option><option value="manual">Manual (leave conflicts unresolved)</option></select></label>
			<label className="settings-option-row"><span className="settings-option-copy"><strong>Allow remote deletion records to remove local chats</strong></span><input type="checkbox" checked={value.allowDeletions} onChange={event => update("allowDeletions", event.target.checked)} /></label>
			<div className="settings-action-grid">
				<button className="settings-secondary-button" type="button" disabled={action.busy} onClick={() => void action.run(() => runRemoteSync(value, password, passphrase, true))}>Test connection</button>
				<button className="settings-primary-button" type="button" disabled={action.busy || !value.enabled} onClick={() => void action.run(async () => { const result = await runRemoteSync(value, password, passphrase); window.alert(result); window.location.reload(); return result; })}>Sync now</button>
				<button className="settings-secondary-button" type="button" onClick={() => window.location.reload()}>Reload app</button>
			</div>
			<p className="settings-inline-status" role="status">{action.message}</p>
		</div>
	);
}
