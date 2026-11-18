import { useCallback, useEffect, useState } from "react";
import { SuperChatApp } from "super-chat/react";
import { DiagnosticsScreen } from "./screens/DiagnosticsScreen";
import { ProviderSettingsScreen } from "./screens/ProviderSettingsScreen";
import { standaloneHost } from "./host";
import { StandaloneLLMAdapter } from "./llm";
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
	const [screen, setScreen] = useState<Screen>("chat");
	const [, setProviderConfigured] = useState<boolean | null>(null);
	const handleConfigurationChange = useCallback((configured: boolean) => setProviderConfigured(configured), []);

	useEffect(() => {
		let active = true;
		void loadStandaloneProviderSettings()
			.then((settings) => {
				if (active) setProviderConfigured(settings.profiles.length > 0);
			})
			.catch(() => {
				if (active) setProviderConfigured(false);
			});
		return () => { active = false; };
	}, []);

	return (
		<div className="app-shell">
			<main className="screen-stack">
				<section className="screen-panel chat-panel" hidden={screen !== "chat"} aria-label="Chat">
					<div className="chat-screen-content">

						<div className="chat-engine"><SuperChatApp host={standaloneHost} llmAdapter={llmAdapter} onOpenSettings={() => setScreen("settings")} /></div>
					</div>
				</section>
				<section className="screen-panel" hidden={screen !== "diagnostics"} aria-label="Diagnostics">
					<DiagnosticsScreen />
				</section>
				<section className="screen-panel" hidden={screen !== "settings"} aria-label="Settings">
					<ProviderSettingsScreen onConfigurationChange={handleConfigurationChange} />
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
