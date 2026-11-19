import { ChatRelaySettingsSection, UpdatesSettingsSection } from "./HostSettingsSections";
import { IntegrationsSection, ChatCommandsSection, DebugModeSection, DiagnosticsSettingsSection } from "./ToolsDiagnosticsSections";
import { BackupRestoreSection, SyncComponentsSection, RemoteStorageSection } from "./DataManagementSections";
import { WebSearchSettingsSection, PdfExtractionSettingsSection } from "./sections/SearchDocumentSettingsSection";
import { DEFAULT_SEARCH_DOCUMENT_SETTINGS, loadSearchDocumentSettings, saveSearchDocumentSettings, type SearchDocumentSettings } from "../searchDocuments";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { MemoryAuditRecord, MemoryCategory, MemoryToolSettings, ScoredMemoryEntry } from "super-chat";
import { ProviderSettingsScreen } from "./ProviderSettingsScreen";
import { UnavailableMark } from "./SettingsSectionSupport";
import {
	loadStandaloneProviderSettings,
	subscribeStandaloneProviderSettings,
	type StandaloneProviderProfile,
} from "../providerSettings";
import {
	createStandaloneMemory,
	deleteStandaloneMemory,
	evaluateStandaloneMemories,
	getMemoryBackupCount,
	listStandaloneMemories,
	listStandaloneMemoryAudit,
	loadMemorySettings,
	restorePreviousMemory,
	saveMemorySettings,
	updateStandaloneMemory,
} from "../memory";
import {
	saveStandaloneChatPreferences,
	type StandaloneChatPreferences,
} from "../appSettings";
import { standaloneSettingsStore } from "../persistence";
import { standaloneHost } from "@standalone-host";

type Section = "providers" | "chat" | "tools" | "memory" | "integrations" | "web-search" | "relay" | "sync" | "remote" | "updates" | "pdf" | "commands" | "backup" | "debug" | "diagnostics";
type Notice = { kind: "success" | "error"; text: string } | null;
type MemoryListEntry = ScoredMemoryEntry & { tier: "core" | "staged" | "archive" };
const SECTION_STATE_KEY = "standalone.settings-open-sections";
const DEFAULT_OPEN_SECTIONS: Section[] = ["providers"];
const sections: Array<{ id: Section; label: string; subtitle: string }> = [
	{ id: "providers", label: "Providers", subtitle: "Profiles, models and credentials" },
	{ id: "chat", label: "Chat", subtitle: "Composer, message display and assistant instructions" },
	{ id: "tools", label: "Tools", subtitle: "Tool access, request budget and step limit" },
	{ id: "memory", label: "Memory", subtitle: "Long-term memory, review and recovery" },
 { id: "integrations", label: "Integrations", subtitle: "Compatible tool providers" },
 { id: "web-search", label: "Web Search", subtitle: "Search providers, credentials and endpoints" },
 { id: "relay", label: "Chat Relay", subtitle: "Relay connection, rooms and identity" },
 { id: "sync", label: "Sync Components", subtitle: "Choose the data included in sync" },
 { id: "remote", label: "Remote Storage", subtitle: "WebDAV, encryption and synchronization" },
 { id: "updates", label: "Updates", subtitle: "Application release and updater support" },
 { id: "pdf", label: "PDF Extraction", subtitle: "Local and server extraction, page limits" },
 { id: "commands", label: "Chat Commands", subtitle: "Local composer command reference" },
 { id: "backup", label: "Backup & Restore", subtitle: "Export, import and recovery" },
 { id: "debug", label: "Debug Mode", subtitle: "Optional telemetry export controls" },
 { id: "diagnostics", label: "Diagnostics", subtitle: "Application metrics and saved-data health" },
];
const categories: MemoryCategory[] = ["user_fact", "project", "preference", "insight", "reference"];
const categoryLabels: Record<MemoryCategory, string> = {
	user_fact: "User fact",
	project: "Project",
	preference: "Preference",
	insight: "Insight",
	reference: "Reference",
};

function PreferenceToggle({
	label,
	description,
	checked,
	onChange,
	disabled = false,
	unavailableReason,
}: {
	label: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	unavailableReason?: string;
}) {
	return (
		<label className={`preference-toggle${unavailableReason ? " is-unavailable" : ""}`}>
			<span><strong>{label}{unavailableReason && <UnavailableMark label={unavailableReason} />}</strong><small>{description}</small></span>
			<input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
		</label>
	);
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
	return (
		<section className="settings-card">
			<div className="settings-card-heading">
				<div className="settings-section-icon" aria-hidden="true">⚙</div>
				<div><h2>{title}</h2><p>{description}</p></div>
			</div>
			{children}
		</section>
	);
}

function SettingsAccordion({
	id,
	title,
	description,
	open,
	onToggle,
	children,
}: {
	id: Section;
	title: string;
	description: string;
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
}) {
	const panelId = `settings-panel-${id}`;
	return (
		<section id={`settings-section-${id}`} className={`settings-accordion${open ? " is-open" : ""}`}>
			<button className="settings-accordion-trigger" type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
				<span className="settings-accordion-copy">
					<strong>{title}</strong>
					<small>{description}</small>
				</span>
				<svg className="settings-accordion-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path strokeLinecap="round" strokeLinejoin="round" d={open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
				</svg>
			</button>
			<div id={panelId} className="settings-accordion-panel" hidden={!open}>
				{children}
			</div>
		</section>
	);
}

function SearchDocumentPreferences({ pdf = false }: { pdf?: boolean }) {
 const [value, setValue] = useState<SearchDocumentSettings>(DEFAULT_SEARCH_DOCUMENT_SETTINGS);
 const [ready, setReady] = useState(false);
 const [notice, setNotice] = useState("");
 useEffect(() => { let active = true; void loadSearchDocumentSettings(standaloneHost.capabilities.credentials).then(saved => { if (active) { setValue(saved); setReady(true); } }).catch(error => { if (active) setNotice(String(error)); }); return () => { active = false; }; }, []);
 return <fieldset className="settings-document-settings" disabled={!ready} style={{ border: 0, padding: 0, margin: 0 }}>
 {pdf ? <PdfExtractionSettingsSection value={value} clientAvailable onChange={next => setValue(current => ({ ...current, ...next }))} /> : <WebSearchSettingsSection value={value} onChange={next => setValue(current => ({ ...current, ...next }))} />}
 <button type="button" className="settings-primary-button" onClick={() => void saveSearchDocumentSettings(value, standaloneHost.capabilities.credentials).then(() => setNotice("Settings saved on this device.")).catch(error => setNotice(String(error)))}>Save {pdf ? "PDF" : "search"} settings</button>
 {notice && <p role="status">{notice}</p>}
 </fieldset>;
}

function ChatPreferencesSection({
	initial,
	onSaved,
}: {
	initial: StandaloneChatPreferences;
	onSaved: (value: StandaloneChatPreferences) => void;
}) {
	const [draft, setDraft] = useState(initial);
	const [tagProfiles, setTagProfiles] = useState<StandaloneProviderProfile[]>([]);
	const [tagProfilesReady, setTagProfilesReady] = useState(false);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<Notice>(null);
	const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
	const hasSelectedTagProfile = tagProfiles.some(
		profile => profile.id === draft.sessionTaggingProfileId,
	);

	useEffect(() => setDraft(initial), [initial]);

	useEffect(() => {
		let active = true;
		const refreshProfiles = () => {
			void loadStandaloneProviderSettings().then(settings => {
				if (active) {
					setTagProfiles(settings.profiles);
					setTagProfilesReady(true);
				}
			}).catch(error => {
				if (active) setTagProfilesReady(true);
				console.error("[super-chat] session-tag provider profiles could not be loaded:", error);
			});
		};
		refreshProfiles();
		const unsubscribe = subscribeStandaloneProviderSettings(refreshProfiles);
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	const save = async (value: StandaloneChatPreferences) => {
		setBusy(true);
		setNotice(null);
		try {
			await saveStandaloneChatPreferences(value);
			setDraft(value);
			onSaved(value);
			setNotice({ kind: "success", text: "Chat settings saved on this device." });
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<SettingsCard title="Composer and messages" description="Choose how messages are entered and displayed.">
				<div className="preference-list">
					<PreferenceToggle label="Press Enter to send" description="Shift+Enter inserts a new line. When off, use Ctrl+Enter, ⌘+Enter or the Send button." checked={draft.pressEnterToSend} onChange={value => setDraft(current => ({ ...current, pressEnterToSend: value }))} />
					<PreferenceToggle label="Show message times" description="Display the local time under each message." checked={draft.showTimestamps} onChange={value => setDraft(current => ({ ...current, showTimestamps: value }))} />
					<PreferenceToggle label="Show token estimates" description="Display estimated token counts for the draft and messages." checked={draft.showTokenCount} onChange={value => setDraft(current => ({ ...current, showTokenCount: value }))} />
					<PreferenceToggle label="Show full request token estimate" description="While a reply runs, include the prepared system instructions, memory and conversation history when the host provides that estimate. Provider-reported usage can differ." checked={draft.showFullRequestTokens} onChange={value => setDraft(current => ({ ...current, showFullRequestTokens: value }))} />
					<PreferenceToggle label="Automatically name chats" description="Use the selected model to title an untitled chat after a few messages. A local title is used if the model cannot suggest one." checked={draft.autoNameSessions} onChange={value => setDraft(current => ({ ...current, autoNameSessions: value }))} />
				</div>
			</SettingsCard>

			<SettingsCard title="Session tags" description="Keep related conversations easy to find. Automatic suggestions are optional and use the provider profile you choose.">
				<div className="preference-list">
					<PreferenceToggle
						label="Suggest tags for new chats"
						description={hasSelectedTagProfile
							? "After the first reply, send up to 8 recent user/assistant messages, capped at 600 characters each, to the selected provider for tag suggestions."
							: "Choose a provider profile below to enable automatic suggestions."
						}
						checked={draft.autoTagSessions}
						disabled={!hasSelectedTagProfile}
						unavailableReason={tagProfilesReady && !hasSelectedTagProfile ? "Choose an available provider profile before enabling tag suggestions." : undefined}
						onChange={value => setDraft(current => ({ ...current, autoTagSessions: value }))}
					/>
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="session-tagging-profile">Provider profile for tag suggestions{tagProfilesReady && draft.sessionTaggingProfileId && !hasSelectedTagProfile && <UnavailableMark label="The previously selected provider profile is unavailable" />}</label>
					<select
						id="session-tagging-profile"
						value={draft.sessionTaggingProfileId}
						onChange={event => setDraft(current => ({ ...current, sessionTaggingProfileId: event.target.value }))}
					>
						<option value="">Choose a provider profile</option>
						{draft.sessionTaggingProfileId && !tagProfiles.some(profile => profile.id === draft.sessionTaggingProfileId) && (
							<option value={draft.sessionTaggingProfileId}>Previously selected profile unavailable</option>
						)}
						{tagProfiles.map(profile => (
							<option value={profile.id} key={profile.id}>
								{profile.name} · {profile.provider} · {profile.model}
							</option>
						))}
					</select>
					<p className="field-help">Suggestions are created only for new chats while this setting is enabled. Existing chats are not sent automatically.</p>
				</div>
			</SettingsCard>

			<SettingsCard title="Chat tabs" description="Choose which saved chats reopen and how much of each title is visible.">
				<div className="preference-list">
					<PreferenceToggle label="Restore chat tabs after restart" description="Reopen saved tabs and the active chat when the app starts." checked={draft.restoreChatTabs} onChange={value => setDraft(current => ({ ...current, restoreChatTabs: value }))} />
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="chat-tab-title-width">Chat tab title width</label>
					<input id="chat-tab-title-width" type="number" min={120} max={360} step={10} value={draft.chatTabTitleWidth} onChange={event => setDraft(current => ({ ...current, chatTabTitleWidth: Number(event.target.value) }))} />
					<p className="field-help">Choose 120 to 360 pixels. Default: 160 pixels.</p>
				</div>
			</SettingsCard>

			<SettingsCard title="Assistant instructions" description="These instructions are sent with each request. Memory context is added after them when memory is enabled.">
				<div className="settings-field settings-field-spaced">
					<label htmlFor="assistant-system-prompt">Base instructions</label>
					<textarea id="assistant-system-prompt" rows={7} maxLength={16000} value={draft.systemPrompt} onChange={event => setDraft(current => ({ ...current, systemPrompt: event.target.value }))} />
					<p className="field-help">Up to 16,000 characters. Leave blank to use the provider’s default behavior.</p>
				</div>
			</SettingsCard>

			{notice && <div className={`settings-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>}
			<div className="settings-actions">
				<button className="settings-primary-button" type="button" disabled={busy || !dirty} onClick={() => void save(draft)}>{busy ? "Saving…" : "Save chat settings"}</button>
				<button className="settings-secondary-button" type="button" disabled={busy || !dirty} onClick={() => { setDraft(initial); setNotice(null); }}>Discard changes</button>
			</div>
		</>
	);
}

function ToolPreferencesSection({
	initial,
	onSaved,
}: {
	initial: StandaloneChatPreferences;
	onSaved: (value: StandaloneChatPreferences) => void;
}) {
	const [draft, setDraft] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<Notice>(null);
	const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

	useEffect(() => setDraft(initial), [initial]);

	const save = async () => {
		setBusy(true);
		setNotice(null);
		try {
			await saveStandaloneChatPreferences(draft);
			onSaved(draft);
			setNotice({ kind: "success", text: "Tool and context settings saved." });
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<SettingsCard title="Agent tools" description="The assistant can use the local calculation and device-time tools when enabled.">
				<div className="preference-list">
					<PreferenceToggle label="Allow agent tools" description="Let the assistant call available tools during a reply." checked={draft.enableTools} onChange={value => setDraft(current => ({ ...current, enableTools: value }))} />
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="max-agent-steps">Maximum tool rounds per reply</label>
					<select id="max-agent-steps" value={draft.maxAgentSteps} onChange={event => setDraft(current => ({ ...current, maxAgentSteps: Number(event.target.value) }))}>
						{[1, 2, 3, 5, 8, 12].map(value => <option value={value} key={value}>{value} rounds</option>)}
					</select>
					<p className="field-help">Write and delete tools still ask for your approval. This limit only caps how many tool rounds a reply can use.</p>
				</div>
			</SettingsCard>

			<SettingsCard title="Model request budget" description="Cap the full prompt sent to the selected model, including system instructions, chat history, files and tools.">
				<div className="settings-field settings-field-spaced">
					<label htmlFor="request-budget">Maximum request tokens</label>
					<select id="request-budget" value={draft.maxContextTokens} onChange={event => setDraft(current => ({ ...current, maxContextTokens: Number(event.target.value) }))}>
						{[8_000, 16_000, 32_000, 64_000, 128_000, 200_000, 1_000_000].map(value => <option value={value} key={value}>{value.toLocaleString()} tokens</option>)}
					</select>
					<p className="field-help">The selected model’s smaller native limit always takes precedence. Recent messages are kept first.</p>
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="max-context-messages">Maximum previous messages</label>
					<input id="max-context-messages" type="number" min={1} step={1} value={draft.maxContextMessages} onChange={event => setDraft(current => ({ ...current, maxContextMessages: Number(event.target.value) }))} />
					<p className="field-help">Older messages are left out of model requests. This limit does not remove anything from the saved chat.</p>
				</div>
			</SettingsCard>

			{notice && <div className={`settings-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>}
			<div className="settings-actions">
				<button className="settings-primary-button" type="button" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "Saving…" : "Save tool settings"}</button>
				<button className="settings-secondary-button" type="button" disabled={busy || !dirty} onClick={() => { setDraft(initial); setNotice(null); }}>Discard changes</button>
			</div>
		</>
	);
}

function MemorySection() {
	const [settings, setSettings] = useState<MemoryToolSettings>({ enabled: false, auditEnabled: false, contextBudgetTokens: 2_000, backupRetention: 20 });
	const [entries, setEntries] = useState<MemoryListEntry[]>([]);
	const [query, setQuery] = useState("");
	const [backupCount, setBackupCount] = useState(0);
	const [audit, setAudit] = useState<MemoryAuditRecord[]>([]);
	const [showAudit, setShowAudit] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [category, setCategory] = useState<MemoryCategory>("preference");
	const [content, setContent] = useState("");
	const [tags, setTags] = useState("");

	const refresh = useCallback(async (search = query) => {
		setLoading(true);
		setError(null);
		try {
			const [nextEntries, nextBackupCount] = await Promise.all([listStandaloneMemories(search), getMemoryBackupCount()]);
			setEntries(nextEntries);
			setBackupCount(nextBackupCount);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setLoading(false);
		}
	}, [query]);

	useEffect(() => {
		let active = true;
		void loadMemorySettings().then(value => { if (active) setSettings(value); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
		return () => { active = false; };
	}, []);

	useEffect(() => { void refresh(); }, [refresh]);

	useEffect(() => {
		if (!showAudit) return;
		let active = true;
		void listStandaloneMemoryAudit().then(value => { if (active) setAudit(value); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
		return () => { active = false; };
	}, [showAudit, entries.length]);

	const saveSettings = async (next: MemoryToolSettings) => {
		const previous = settings;
		setSettings(next);
		setNotice(null);
		try {
			await saveMemorySettings(next);
			setNotice({ kind: "success", text: "Memory settings saved on this device." });
		} catch (cause) {
			setSettings(previous);
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		}
	};

	const clearForm = () => {
		setEditingId(null);
		setCategory("preference");
		setContent("");
		setTags("");
	};

	const submitMemory = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!content.trim()) return;
		setBusy(true);
		setNotice(null);
		try {
			const tagList = tags.split(",").map(tag => tag.trim()).filter(Boolean);
			if (editingId) await updateStandaloneMemory(editingId, category, content, tagList);
			else await createStandaloneMemory(category, content, tagList);
			clearForm();
			setNotice({ kind: "success", text: editingId ? "Memory updated." : "Memory added to the staged tier." });
			await refresh();
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	const editMemory = (entry: MemoryListEntry) => {
		setEditingId(entry.id);
		setCategory(entry.category);
		setContent(entry.content);
		setTags(entry.tags.join(", "));
		setNotice(null);
		document.getElementById("memory-content")?.scrollIntoView({ block: "center", behavior: "smooth" });
	};

	const removeMemory = async (entry: MemoryListEntry) => {
		if (!window.confirm("Delete this saved memory? This change can be reversed while recovery copies are retained.")) return;
		setBusy(true);
		setNotice(null);
		try {
			await deleteStandaloneMemory(entry.id);
			setNotice({ kind: "success", text: "Memory deleted." });
			await refresh();
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	const curateMemories = async () => {
		setBusy(true);
		setNotice(null);
		try {
			const result = await evaluateStandaloneMemories();
			setNotice({ kind: "success", text: `Memory review moved ${result.promoted} item${result.promoted === 1 ? "" : "s"} into core${result.demoted ? ` and archived ${result.demoted}` : ""}.` });
			await refresh();
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	const restoreBackup = async () => {
		if (!window.confirm("Restore the previous memory copy? The current memory will become the next recovery copy.")) return;
		setBusy(true);
		setNotice(null);
		try {
			await restorePreviousMemory();
			setNotice({ kind: "success", text: "The previous memory copy was restored." });
			await refresh();
		} catch (cause) {
			setNotice({ kind: "error", text: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	};

	const tierCounts = useMemo(() => entries.reduce((counts, entry) => ({ ...counts, [entry.tier]: counts[entry.tier] + 1 }), { core: 0, staged: 0, archive: 0 }), [entries]);

	return (
		<>
			<SettingsCard title="Long-term memory" description="Memory stays on this device. Core entries can be included in future model requests while enabled.">
				<div className="preference-list">
					<PreferenceToggle label="Enable memory" description="Let the assistant read and update saved memories. The core tier is added to its prompt." checked={settings.enabled} onChange={enabled => void saveSettings({ ...settings, enabled })} />
					<PreferenceToggle label="Expose memory audit tool" description="Let the assistant inspect memory activity. Local review stays available in this screen." checked={settings.auditEnabled} onChange={auditEnabled => void saveSettings({ ...settings, auditEnabled })} />
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="memory-context-budget">Core memory prompt budget</label>
					<select id="memory-context-budget" value={settings.contextBudgetTokens ?? 2_000} onChange={event => void saveSettings({ ...settings, contextBudgetTokens: Number(event.target.value) })}>
						{[0, 500, 1_000, 2_000, 4_000, 8_000].map(value => <option key={value} value={value}>{value === 0 ? "Off" : `${value.toLocaleString()} tokens`}</option>)}
					</select>
					<p className="field-help">Only core memories are included. Staged memories stay available for review and promotion.</p>
				</div>
				<div className="settings-field settings-field-spaced">
					<label htmlFor="memory-backup-retention">Recovery copies</label>
					<select id="memory-backup-retention" value={settings.backupRetention ?? 20} onChange={event => void saveSettings({ ...settings, backupRetention: Number(event.target.value) })}>
						{[0, 10, 20, 50, 100].map(value => <option key={value} value={value}>{value === 0 ? "Off" : `Keep ${value}`}</option>)}
					</select>
					<p className="field-help">Current copies: {backupCount}. New copies are written after each memory change.</p>
				</div>
			</SettingsCard>

			<SettingsCard title="Review memories" description="Search and manage entries across the core, staged and archive tiers.">
				<div className="memory-toolbar">
					<input aria-label="Search saved memories" placeholder="Search memories" value={query} onChange={event => setQuery(event.target.value)} />
					<button className="settings-secondary-button" type="button" disabled={loading || busy} onClick={() => void refresh()} aria-label="Refresh memories">Refresh</button>
				</div>
				<p className="memory-tier-counts">Core {tierCounts.core} · Staged {tierCounts.staged} · Archive {tierCounts.archive}</p>
				{error && <div className="settings-notice error" role="alert">{error}</div>}
				{loading && <p className="settings-loading" role="status">Loading saved memories…</p>}
				{!loading && !entries.length && <p className="memory-empty">{query ? "No saved memories match this search." : "No memories saved yet."}</p>}
				<div className="memory-entry-list">
					{entries.map(entry => (
						<article className="memory-entry" key={entry.id}>
							<div className="memory-entry-heading"><span className={`memory-tier-badge tier-${entry.tier}`}>{entry.tier}</span><span>{categoryLabels[entry.category]}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time></div>
							<p>{entry.content}</p>
							{entry.tags.length > 0 && <div className="memory-tags">{entry.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
							<div className="memory-entry-actions"><button type="button" disabled={busy} onClick={() => editMemory(entry)}>Edit</button><button type="button" disabled={busy} onClick={() => void removeMemory(entry)}>Delete</button></div>
						</article>
					))}
				</div>
				{entries.some(entry => entry.tier === "staged") && <button className="settings-secondary-button memory-curate-button" type="button" disabled={busy} onClick={() => void curateMemories()}>{busy ? "Reviewing…" : "Promote strong staged memories"}</button>}
			</SettingsCard>

			<SettingsCard title={editingId ? "Edit memory" : "Add a memory"} description="New memories enter the staged tier and can be promoted after review.">
				<form className="provider-form" onSubmit={submitMemory}>
					<div className="settings-field"><label htmlFor="memory-category">Category</label><select id="memory-category" value={category} onChange={event => setCategory(event.target.value as MemoryCategory)}>{categories.map(value => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></div>
					<div className="settings-field"><label htmlFor="memory-content">Memory</label><textarea id="memory-content" rows={4} maxLength={4000} required value={content} onChange={event => setContent(event.target.value)} placeholder="A fact or preference that will help in a future conversation" /></div>
					<div className="settings-field"><label htmlFor="memory-tags">Tags</label><input id="memory-tags" value={tags} onChange={event => setTags(event.target.value)} placeholder="comma, separated, tags" /><p className="field-help">Tags help you find this memory later.</p></div>
					{notice && <div className={`settings-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>}
					<div className="settings-actions"><button className="settings-primary-button" type="submit" disabled={busy || !content.trim()}>{busy ? "Saving…" : editingId ? "Save memory" : "Add memory"}</button>{editingId && <button className="settings-secondary-button" type="button" disabled={busy} onClick={clearForm}>Cancel edit</button>}</div>
				</form>
			</SettingsCard>

			<SettingsCard title="Memory activity and recovery" description="Review recent changes and restore a previous saved copy.">
				<div className="settings-actions">
					<button className="settings-secondary-button" type="button" aria-expanded={showAudit} onClick={() => setShowAudit(value => !value)}>{showAudit ? "Hide activity" : "View activity"}</button>
					<button className="settings-secondary-button" type="button" disabled={busy || backupCount === 0} onClick={() => void restoreBackup()}>{busy ? "Working…" : "Restore previous copy"}</button>
				</div>
				{showAudit && <div className="memory-audit-list">{audit.length ? audit.slice(0, 50).map((record, index) => <div className="memory-audit-row" key={`${record.timestamp}-${record.entryId}-${index}`}><time>{new Date(record.timestamp).toLocaleString()}</time><span>{record.operation} · {record.entryId}</span></div>) : <p className="memory-empty">No recorded memory activity.</p>}</div>}
			</SettingsCard>
		</>
	);
}

export function SettingsScreen({
	chatPreferences,
	onChatPreferencesChange,
	onProviderConfigurationChange,
}: {
	chatPreferences: StandaloneChatPreferences;
	onChatPreferencesChange: (value: StandaloneChatPreferences) => void;
	onProviderConfigurationChange: (configured: boolean) => void;
}) {
	const [openSections, setOpenSections] = useState<Set<Section>>(() => new Set(DEFAULT_OPEN_SECTIONS));
	const [sectionQuery, setSectionQuery] = useState("");
	const [sectionStateLoaded, setSectionStateLoaded] = useState(false);
	const [sectionStateError, setSectionStateError] = useState<string | null>(null);
	const [chatDraft, setChatDraft] = useState(chatPreferences);
	const sectionSaveQueue = useRef(Promise.resolve());
	const userChangedSectionState = useRef(false);

	useEffect(() => { setChatDraft(chatPreferences); }, [chatPreferences]);

	useEffect(() => {
		let active = true;
		void standaloneSettingsStore.load<unknown>(SECTION_STATE_KEY).then(value => {
			if (!active) return;
			if (!userChangedSectionState.current) {
				if (Array.isArray(value)) {
					const knownSections = new Set(sections.map(item => item.id));
					setOpenSections(new Set(value.filter((item): item is Section => typeof item === "string" && knownSections.has(item as Section))));
				} else {
					setOpenSections(new Set(DEFAULT_OPEN_SECTIONS));
				}
			}
			setSectionStateError(null);
			setSectionStateLoaded(true);
		}).catch(cause => {
			if (!active) return;
			setSectionStateError(cause instanceof Error ? cause.message : String(cause));
			setSectionStateLoaded(true);
		});
		return () => { active = false; };
	}, []);

	useEffect(() => {
		if (!sectionStateLoaded) return;
		const value = [...openSections];
		sectionSaveQueue.current = sectionSaveQueue.current
			.then(() => standaloneSettingsStore.save(SECTION_STATE_KEY, value))
			.then(() => setSectionStateError(null))
			.catch(cause => setSectionStateError(cause instanceof Error ? cause.message : String(cause)));
	}, [openSections, sectionStateLoaded]);

	const toggleSection = (id: Section) => {
		userChangedSectionState.current = true;
		setOpenSections(current => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const setAllSectionsOpen = (open: boolean) => {
		userChangedSectionState.current = true;
		setOpenSections(open ? new Set(sections.map(item => item.id)) : new Set<Section>());
	};

	const navigateToSection = (id: Section) => {
		userChangedSectionState.current = true;
		setOpenSections(current => new Set([...current, id]));
		requestAnimationFrame(() => {
			const element = document.getElementById(`settings-section-${id}`);
			element?.scrollIntoView({ behavior: "smooth", block: "start" });
			element?.querySelector<HTMLButtonElement>(".settings-accordion-trigger")?.focus({ preventScroll: true });
		});
	};

	const handleChatSaved = (value: StandaloneChatPreferences) => {
		setChatDraft(value);
		onChatPreferencesChange(value);
	};

	return (
		<div className="settings-page">
			<header className="settings-header">
				<p className="eyebrow">SUPER CHAT</p>
				<h1>Settings</h1>
				<p className="page-subtitle">Provider profiles, chat behavior, tools and memory</p>
			</header>
			<div className="settings-scroll">
				<div className="settings-field settings-search">
					<label htmlFor="settings-section-search">Find a section</label>
					<input id="settings-section-search" type="search" value={sectionQuery} onChange={event => setSectionQuery(event.target.value)} placeholder="Search section names and descriptions" />
				</div>
				<nav className="settings-section-index" aria-label="Settings section index">
					{sections.filter(item => `${item.label} ${item.subtitle}`.toLowerCase().includes(sectionQuery.toLowerCase())).map(item => (
						<button key={item.id} type="button" className="settings-secondary-button" aria-controls={`settings-panel-${item.id}`} onClick={() => navigateToSection(item.id)}>{item.label}</button>
					))}
				</nav>
				<div className="settings-section-actions" role="group" aria-label="Settings sections">
					<span>Sections</span>
					<button className="settings-secondary-button" type="button" onClick={() => setAllSectionsOpen(true)}>Expand all</button>
					<button className="settings-secondary-button" type="button" onClick={() => setAllSectionsOpen(false)}>Collapse all</button>
				</div>
				{sectionStateError && <div className="settings-notice error" role="status">Section layout could not be saved: {sectionStateError}</div>}
				{sections.map(item => (
					<SettingsAccordion
						key={item.id}
						id={item.id}
						title={item.label}
						description={item.subtitle}
						open={openSections.has(item.id)}
						onToggle={() => toggleSection(item.id)}
					>
						{item.id === "providers" && <ProviderSettingsScreen embedded onConfigurationChange={onProviderConfigurationChange} />}
						{item.id === "chat" && <ChatPreferencesSection initial={chatDraft} onSaved={handleChatSaved} />}
						{item.id === "tools" && <ToolPreferencesSection initial={chatDraft} onSaved={handleChatSaved} />}
						{item.id === "memory" && <MemorySection />}
 {item.id === "integrations" && <IntegrationsSection />}
 {item.id === "web-search" && <SearchDocumentPreferences />}
 {item.id === "relay" && <ChatRelaySettingsSection />}
 {item.id === "sync" && <SyncComponentsSection />}
 {item.id === "remote" && <RemoteStorageSection />}
 {item.id === "updates" && <UpdatesSettingsSection />}
 {item.id === "pdf" && <SearchDocumentPreferences pdf />}
 {item.id === "commands" && <ChatCommandsSection />}
 {item.id === "backup" && <BackupRestoreSection />}
 {item.id === "debug" && <DebugModeSection />}
 {item.id === "diagnostics" && <DiagnosticsSettingsSection />}
					</SettingsAccordion>
				))}
			</div>
		</div>
	);
}
