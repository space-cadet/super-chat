import { useEffect, useMemo, useState, type FormEvent } from "react";
import { standaloneHost } from "../host";
import {
	getStandaloneModels,
	getStandaloneProviders,
	loadStandaloneProviderConfiguration,
	removeStandaloneProviderConfiguration,
	saveStandaloneProviderConfiguration,
	StandaloneLLMAdapter,
	type StandaloneProvider,
	type StandaloneProviderConfiguration,
} from "../llm";

type SettingsNotice = { kind: "success" | "error"; message: string } | null;
type Operation = "save" | "test" | "remove" | null;

const llmAdapter = new StandaloneLLMAdapter();
const providers = getStandaloneProviders();

function firstModel(provider: StandaloneProvider): string {
	const models = getStandaloneModels(provider);
	return models.find((model) => model.id === "gpt-4o-mini")?.id ?? models[0]?.id ?? "";
}

export function ProviderSettingsScreen({
	onConfigurationChange,
}: {
	onConfigurationChange: (configured: boolean) => void;
}) {
	const [provider, setProvider] = useState<StandaloneProvider>("openai");
	const [model, setModel] = useState(firstModel("openai"));
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [savedConfiguration, setSavedConfiguration] = useState<StandaloneProviderConfiguration | null>(null);
	const [loading, setLoading] = useState(true);
	const [operation, setOperation] = useState<Operation>(null);
	const [notice, setNotice] = useState<SettingsNotice>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	const models = useMemo(() => getStandaloneModels(provider), [provider]);
	const providerName = providers.find((entry) => entry.id === provider)?.name ?? provider;
	const savedProviderName = savedConfiguration
		? providers.find((entry) => entry.id === savedConfiguration.provider)?.name ?? savedConfiguration.provider
		: null;
	const needsApiKey = provider !== "ollama";
	const canStoreCredentials = Boolean(standaloneHost.capabilities.credentials?.setCredential);
	const busy = operation !== null;
	const canReuseSavedKey = savedConfiguration?.provider === provider;
	useEffect(() => {
		let active = true;
		void loadStandaloneProviderConfiguration().then((configuration) => {
			if (!active) return;
			setSavedConfiguration(configuration);
			if (configuration) {
				setProvider(configuration.provider);
				setModel(configuration.model);
				setBaseUrl(configuration.baseUrl ?? "");
				onConfigurationChange(true);
			} else {
				onConfigurationChange(false);
			}
		}).catch((error: unknown) => {
			if (!active) return;
			const message = error instanceof Error ? error.message : String(error);
			setLoadError(message);
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => { active = false; };
	}, [onConfigurationChange]);

	function changeProvider(nextProvider: StandaloneProvider) {
		setProvider(nextProvider);
		setModel(firstModel(nextProvider));
		setBaseUrl(nextProvider === "custom" ? "" : "");
		setNotice(null);
	}

	function currentConfiguration(): StandaloneProviderConfiguration {
		const configuration: StandaloneProviderConfiguration = {
			provider,
			model: model.trim(),
		};
		if (baseUrl.trim()) configuration.baseUrl = baseUrl.trim();
		return configuration;
	}

	async function save(testAfterSave: boolean) {
		setOperation(testAfterSave ? "test" : "save");
		setNotice(null);
		try {
			const configuration = currentConfiguration();
			await saveStandaloneProviderConfiguration(configuration, apiKey.trim() || undefined);
			setSavedConfiguration(configuration);
			setApiKey("");
			onConfigurationChange(true);
			if (!testAfterSave) {
				setNotice({ kind: "success", message: "Provider settings saved on this device." });
				return;
			}

			setNotice({ kind: "success", message: "Settings saved. Checking the provider…" });
			const result = await llmAdapter.testConnection();
			setNotice({
				kind: result.ok ? "success" : "error",
				message: result.ok ? `Connected to ${providerName}. ${result.message}` : result.message,
			});
		} catch (error) {
			setNotice({ kind: "error", message: error instanceof Error ? error.message : String(error) });
		}
		finally {
			setOperation(null);
		}
	}

	async function remove() {
		if (!savedConfiguration || !window.confirm("Remove the saved provider settings and its stored API key?")) return;
		setOperation("remove");
		setNotice(null);
		try {
			await removeStandaloneProviderConfiguration();
			setSavedConfiguration(null);
			setApiKey("");
			setProvider("openai");
			setModel(firstModel("openai"));
			setBaseUrl("");
			onConfigurationChange(false);
			setNotice({ kind: "success", message: "Provider settings and the stored API key were removed." });
		} catch (error) {
			setNotice({ kind: "error", message: error instanceof Error ? error.message : String(error) });
		} finally {
			setOperation(null);
		}
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void save(false);
	}

	const credentialUnavailable = needsApiKey && !canStoreCredentials;
	const canSubmit = !loading
		&& !busy
		&& !credentialUnavailable
		&& model.trim().length > 0
		&& (provider !== "custom" || baseUrl.trim().length > 0)
		&& (!needsApiKey || apiKey.trim().length > 0 || canReuseSavedKey);

	return (
		<div className="settings-page">
			<header className="settings-header">
				<p className="eyebrow">SUPER CHAT</p>
				<h1>Settings</h1>
				<p className="page-subtitle">Choose the model that powers your chats.</p>
			</header>

			<div className="settings-scroll">
				<section className={`provider-status-card ${savedConfiguration ? "provider-is-configured" : "provider-needs-setup"}`} aria-live="polite">
					<span className="provider-status-mark" aria-hidden="true">{savedConfiguration ? "✓" : "•"}</span>
					<div>
						<strong>{savedConfiguration ? `Saved provider: ${savedProviderName}` : "No model provider connected"}</strong>
						<p>{savedConfiguration ? "Changes below take effect after you save." : "Add a provider and model to start a conversation."}</p>
					</div>
				</section>

				{loadError && <div className="settings-notice error" role="alert">Saved settings could not be read. You can choose a provider below and save again.</div>}

				<section className="settings-card" aria-labelledby="provider-heading">
					<div className="settings-card-heading">
						<div className="settings-section-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 20 7.5v4.75c0 4.25-3.25 7.5-8 8.75-4.75-1.25-8-4.5-8-8.75V7.5l8-3.75Z"/><path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4"/></svg>
						</div>
						<div><h2 id="provider-heading">AI provider</h2><p>Provider credentials stay on this device.</p></div>
					</div>

					<form className="provider-form" onSubmit={submit}>
						<div className="settings-field">
							<label htmlFor="provider-select">Provider</label>
							<select
								id="provider-select"
								value={provider}
								disabled={loading || busy}
								onChange={(event) => changeProvider(event.target.value as StandaloneProvider)}
							>
								{providers.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
							</select>
						</div>

						<div className="settings-field">
							<label htmlFor="model-input">Model</label>
							<input
								id="model-input"
								list="provider-model-suggestions"
								value={model}
								maxLength={160}
								required
								autoComplete="off"
								placeholder="Enter a model ID"
								disabled={loading || busy}
								onChange={(event) => { setModel(event.target.value); setNotice(null); }}
							/>
							<datalist id="provider-model-suggestions">
								{models.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
							</datalist>
							<p className="field-help">Enter a model ID or choose one of the suggestions.</p>
						</div>

						{(provider === "custom" || provider === "ollama") && (
							<div className="settings-field">
								<label htmlFor="provider-base-url">{provider === "custom" ? "Base URL" : "Ollama server URL"}</label>
								<input
									id="provider-base-url"
									type="url"
									value={baseUrl}
									maxLength={2048}
									required={provider === "custom"}
									placeholder={provider === "custom" ? "https://api.example.com/v1" : "http://localhost:11434"}
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
									disabled={loading || busy}
									onChange={(event) => { setBaseUrl(event.target.value); setNotice(null); }}
								/>
								<p className="field-help">{provider === "custom" ? "Use the provider's OpenAI-compatible API endpoint. Remote URLs must use HTTPS." : "Use localhost for Ollama on this device, or an HTTPS server URL."}</p>
							</div>
						)}

						{needsApiKey && (
							<div className="settings-field">
								<label htmlFor="provider-api-key">API key</label>
								<input
									id="provider-api-key"
									type="password"
									value={apiKey}
									maxLength={4096}
									required={needsApiKey && !canReuseSavedKey}
									autoComplete="new-password"
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
									placeholder={savedConfiguration?.provider === provider ? "Leave blank to keep the saved key" : "Paste your API key"}
									disabled={loading || busy || !canStoreCredentials}
									onChange={(event) => { setApiKey(event.target.value); setNotice(null); }}
								/>
								<p className="field-help">
									{canStoreCredentials
										? savedConfiguration?.provider === provider
											? "The existing key stays protected in Android Keystore. Enter a new key only to replace it."
											: "Required for this provider. Stored in Android Keystore and never shown again after saving."
										: "Protected API-key storage is available in the Android app. This build cannot save provider keys."}
								</p>
							</div>
						)}

						{credentialUnavailable && <p className="credential-warning" role="status">Choose Ollama to connect without an API key, or set up provider keys in the Android app.</p>}

						{notice && <div className={`settings-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.message}</div>}

						<div className="settings-actions">
							<button className="settings-primary-button" type="submit" disabled={!canSubmit}>
								{operation === "save" ? "Saving…" : "Save settings"}
							</button>
							<button className="settings-secondary-button" type="button" disabled={!canSubmit} onClick={() => void save(true)}>
								{operation === "test" ? "Checking…" : "Save & test connection"}
							</button>
						</div>
					</form>
				</section>

				<section className="settings-card privacy-card" aria-labelledby="privacy-heading">
					<h2 id="privacy-heading">Your provider connection</h2>
					<p>Your API key is stored in Android Keystore. Chat requests go from this app directly to the provider you choose.</p>
				</section>

				{savedConfiguration && (
					<div className="remove-provider-row">
						<div><strong>Remove provider</strong><span>Delete its saved settings and stored API key.</span></div>
						<button type="button" className="remove-provider-button" disabled={busy} onClick={() => void remove()}>
							{operation === "remove" ? "Removing…" : "Remove"}
						</button>
					</div>
				)}
				{loading && <p className="settings-loading" role="status">Loading saved settings…</p>}
			</div>
		</div>
	);
}
