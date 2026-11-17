import { useEffect, useMemo, useState } from "react";
import { ChatEngine, MemoryPersistenceAdapter } from "super-chat";
import { ChatApp } from "super-chat/react";
import { DiagnosticsScreen } from "./screens/DiagnosticsScreen";
import { MockTextLLMAdapter } from "./MockTextLLMAdapter";

type Screen = "chat" | "diagnostics";

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

export default function App() {
	const [screen, setScreen] = useState<Screen>("chat");
	const engine = useMemo(() => {
		const nextEngine = new ChatEngine({
			llmAdapter: new MockTextLLMAdapter(),
			persistenceAdapter: new MemoryPersistenceAdapter(),
			systemPrompt: "You are a friendly assistant in a local interface preview. No tools or external model service are available.",
		});
		nextEngine.createSession("New Chat");
		return nextEngine;
	}, []);

	useEffect(() => () => engine.dispose(), [engine]);

	return (
		<div className="app-shell">
			<main className="screen-stack">
				<section className="screen-panel chat-panel" hidden={screen !== "chat"} aria-label="Chat">
					<ChatApp engine={engine} />
				</section>
				<section className="screen-panel" hidden={screen !== "diagnostics"} aria-label="Diagnostics">
					<DiagnosticsScreen />
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
