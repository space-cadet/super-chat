import { SettingsPresentationProvider } from "./screens/SettingsPresentation";
import { RemoteStorageSection, SyncComponentsSection } from "./screens/DataManagementSections";
import { closeOwnerSession } from './ownerSession';
import { LocalLogin } from './screens/LocalLogin';
import type { LocalUser } from './localAccount';
import { startDiagnosticSnapshots } from "./settingsPortTools";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SuperChatApp } from "super-chat/react";
import { DiagnosticsScreen } from "./screens/DiagnosticsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { standaloneHost } from "@standalone-host";
import { StandaloneLLMAdapter } from "./llm";
import { defaultStandaloneChatPreferences, loadStandaloneChatPreferences, saveStandaloneChatPreferences, toChatEngineSettings, type StandaloneChatPreferences } from "./appSettings";
import { loadStandaloneProviderSettings } from "./providerSettings";

const llmAdapter = new StandaloneLLMAdapter();

type Screen = "chat" | "diagnostics" | "settings";

function ChatIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
			<path strokeLinecap="round" strokeLinejoin="round" d="M7.5 19.5 3.75 21l1.5-3.75A8.25 8.25 0 1 1 7.5 19.5Z" />
			<path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" />
		</svg>
	);
}

function DiagnosticsIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 20 7.5v4.75c0 4.25-3.25 7.5-8 8.75-4.75-1.25-8-4.5-8-8.75V7.5l8-3.75Z" />
			<path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
		</svg>
	);
}

function SettingsIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
			<path strokeLinecap="round" strokeLinejoin="round" d="m19.4 15 .1.1a1.75 1.75 0 0 1-2.47 2.47l-.1-.1a1.75 1.75 0 0 0-2.98 1.24v.29a1.75 1.75 0 0 1-3.5 0v-.15a1.75 1.75 0 0 0-2.98-1.24l-.1.1A1.75 1.75 0 1 1 4.9 15.24l.1-.1a1.75 1.75 0 0 0-1.24-2.98h-.29a1.75 1.75 0 0 1 0-3.5h.15a1.75 1.75 0 0 0 1.24-2.98l-.1-.1a1.75 1.75 0 1 1 2.47-2.47l.1.1a1.75 1.75 0 0 0 2.98-1.24v-.29a1.75 1.75 0 0 1 3.5 0v.15a1.75 1.75 0 0 0 2.98 1.24l.1-.1a1.75 1.75 0 1 1 2.47 2.47l-.1.1a1.75 1.75 0 0 0 1.24 2.98h.29a1.75 1.75 0 0 1 0 3.5h-.15A1.75 1.75 0 0 0 19.4 15Z" />
		</svg>
	);
}

export default function App() {
 const [user, setUser] = useState<LocalUser | null>(null);
 return user ? <SignedInApp user={user} onLogout={() => { closeOwnerSession(); setUser(null); window.location.reload(); }} /> : <LocalLogin onLogin={setUser} />;
}
function SignedInApp({ user, onLogout }: { user: LocalUser; onLogout: () => void }) {
 const syncDialog=useRef<HTMLDialogElement>(null);
 const accountHost = useMemo(() => ({ ...standaloneHost, capabilities: { ...standaloneHost.capabilities, identity: { id: 'standalone-local-identity', kind: 'identity' as const, getIdentity: async () => ({ id: user.id, displayName: user.name }) } } }), [user]);
	useEffect(() => startDiagnosticSnapshots(), []);
	const [screen, setScreen] = useState<Screen>("chat");
	const [, setProviderConfigured] = useState<boolean | null>(null);
	const [chatPreferences, setChatPreferences] = useState<StandaloneChatPreferences>(defaultStandaloneChatPreferences);
	const [chatPreferencesLoaded, setChatPreferencesLoaded] = useState(false);
	const handleConfigurationChange = useCallback((configured: boolean) => setProviderConfigured(configured), []);

	useEffect(() => {
		let active = true;
		void loadStandaloneChatPreferences().then(settings => {
			if (active) setChatPreferences(settings);
		}).catch(error => {
			console.error("[super-chat] chat settings load failed:", error instanceof Error ? error.message : error);
		}).finally(() => {
			if (active) setChatPreferencesLoaded(true);
		});
		void loadStandaloneProviderSettings()
			.then((settings) => {
				if (active) setProviderConfigured(settings.profiles.length > 0);
			})
			.catch(() => {
				if (active) setProviderConfigured(false);
			});
		return () => { active = false; };
	}, []);

	const chatSettings = useMemo(() => toChatEngineSettings(chatPreferences), [chatPreferences]);

	return (
		<div className="app-shell">
			<header className="local-account-bar"><span>{user.name}</span><button type="button" onClick={onLogout}>Sign out</button></header>
			<dialog ref={syncDialog} className="toolbar-sync-dialog" aria-label="Sync"><header><h2>Sync</h2><button type="button" aria-label="Close sync" onClick={()=>syncDialog.current?.close()}>×</button></header><SettingsPresentationProvider><RemoteStorageSection/><details><summary>Data included in sync</summary><SyncComponentsSection/></details></SettingsPresentationProvider></dialog>
            <main className="screen-stack">
				<section className="screen-panel chat-panel" hidden={screen !== "chat"} aria-label="Chat">
					<div className="chat-screen-content">

						<div className="chat-engine">{chatPreferencesLoaded ? <SuperChatApp host={accountHost} llmAdapter={llmAdapter} chatSettings={chatSettings} onChatPreferencesChange={async patch => { const next={...chatPreferences,...patch}; await saveStandaloneChatPreferences(next);setChatPreferences(next); }} onToolbarAction={async action => {
 if(action==='sync'){syncDialog.current?.showModal();return;}
 const response=await standaloneHost.standalone.httpTransport({url:'https://api.github.com/repos/space-cadet/super-chat/releases/latest',method:'GET',timeoutMs:15000});
 if(response.status===404)return 'No public release was found for this app. Installed version: 0.1.0.';
 if(response.status!==200)throw new Error(`Update check failed (HTTP ${response.status}).`);
 const release=JSON.parse(response.text);return `Installed: 0.1.0. Latest release: ${release.tag_name}. ${release.html_url}`;
 }} onOpenSettings={() => setScreen("settings")} /> : <div className="settings-notice" role="status">Loading chat settings…</div>}</div>
					</div>
				</section>
				<section className="screen-panel" hidden={screen !== "diagnostics"} aria-label="Diagnostics">
					<DiagnosticsScreen />
				</section>
				<section className="screen-panel" hidden={screen !== "settings"} aria-label="Settings">
					<SettingsScreen chatPreferences={chatPreferences} onChatPreferencesChange={setChatPreferences} onProviderConfigurationChange={handleConfigurationChange} />
				</section>
			</main>

			<nav className="bottom-nav" aria-label="Main navigation">
				<button
					type="button"
					className={`nav-item ${screen === "chat" ? "is-active" : ""}`}
					aria-current={screen === "chat" ? "page" : undefined}
					onClick={() => setScreen("chat")}
				>
					<ChatIcon />
					<span>Chat</span>
				</button>
				<button
					type="button"
					className={`nav-item ${screen === "settings" ? "is-active" : ""}`}
					aria-current={screen === "settings" ? "page" : undefined}
					onClick={() => setScreen("settings")}
				>
					<SettingsIcon />
					<span>Settings</span>
				</button>
				<button
					type="button"
					className={`nav-item ${screen === "diagnostics" ? "is-active" : ""}`}
					aria-current={screen === "diagnostics" ? "page" : undefined}
					onClick={() => setScreen("diagnostics")}
				>
					<DiagnosticsIcon />
					<span>Diagnostics</span>
				</button>
			</nav>
		</div>
	);
}
