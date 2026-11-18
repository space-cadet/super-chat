import { useEffect, useMemo, useState, type FormEvent } from "react";
import { standaloneHost } from "../host";
import {
	createStandaloneProfileId,
	getStandaloneModels,
	getStandaloneProviders,
	loadStandaloneProviderSettings,
	saveStandaloneProviderSettings,
	type StandaloneProviderProfile,
	type StandaloneProviderSettings,
} from "../providerSettings";
import {
	removeStandaloneProviderProfile,
	saveStandaloneProviderProfile,
	testStandaloneProviderProfile,
} from "../llm";

type SettingsNotice = { kind: "success" | "error"; message: string } | null;
type Operation = "save" | "test" | "remove" | "default" | null;
type ProfileDraft = Pick<StandaloneProviderProfile, "id" | "name" | "provider" | "model"> & { baseUrl: string };

const providers = getStandaloneProviders();

function firstModel(provider: ProfileDraft["provider"]): string {
	const models = getStandaloneModels(provider);
	return models.find((model) => model.id === "gpt-4o-mini")?.id ?? models[0]?.id ?? "";
}

function createDraft(provider: ProfileDraft["provider"] = "openai"): ProfileDraft {
	return {
		id: createStandaloneProfileId(),
		name: `${providers.find((entry) => entry.id === provider)?.name ?? provider} profile`,
		provider,
		model: firstModel(provider),
		baseUrl: "",
	};
}

function draftFromProfile(profile: StandaloneProviderProfile): ProfileDraft {
	return {
		id: profile.id,
		name: profile.name,
		provider: profile.provider,
		model: profile.model,
		baseUrl: profile.baseUrl ?? "",
	};
}

export function ProviderSettingsScreen({
	onConfigurationChange,
}: {
	onConfigurationChange: (configured: boolean) => void;
}) {
	const [settings, setSettings] = useState<StandaloneProviderSettings>({ profiles: [], defaultProfileId: null });
	const [draft, setDraft] = useState<ProfileDraft>(() => createDraft());
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [apiKey, setApiKey] = useState("");
	const [loading, setLoading] = useState(true);
	const [operation, setOperation] = useState<Operation>(null);
	const [notice, setNotice] = useState<SettingsNotice>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	const models = useMemo(() => getStandaloneModels(draft.provider), [draft.provider]);
	const providerName = providers.find((entry) => entry.id === draft.provider)?.name ?? draft.provider;
	const selectedProfile = settings.profiles.find((profile) => profile.id === selectedId);
	const credentialAvailable = Boolean(standaloneHost.capabilities.credentials?.setCredential);
	const needsApiKey = draft.provider !== "ollama";
	const canReuseSavedKey = selectedProfile?.provider === draft.provider;
	const busy = operation !== null;
	const canSave = !loading && !busy && (!needsApiKey || credentialAvailable)
		&& draft.name.trim().length > 0 && draft.model.trim().length > 0
		&& (draft.provider !== "custom" || draft.baseUrl.trim().length > 0)
		&& (!needsApiKey || apiKey.trim().length > 0 || canReuseSavedKey);

	useEffect(() => {
		let active = true;
		void loadStandaloneProviderSettings().then((loaded) => {
			if (!active) return;
			setSettings(loaded);
			const initial = loaded.profiles.find((profile) => profile.id === loaded.defaultProfileId) ?? loaded.profiles[0];
			if (initial) {
				setSelectedId(initial.id);
				setDraft(draftFromProfile(initial));
			}
			onConfigurationChange(loaded.profiles.length > 0);
		}).catch((error: unknown) => {
			if (!active) return;
			setLoadError(error instanceof Error ? error.message : String(error));
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => { active = false; };
	}, [onConfigurationChange]);

	function chooseProfile(profile: StandaloneProviderProfile) {
		setSelectedId(profile.id);
		setDraft(draftFromProfile(profile));
		setApiKey("");
		setNotice(null);
	}

	function addProfile(provider: ProfileDraft["provider"] = "openai") {
		setSelectedId(null);
		setDraft(createDraft(provider));
		setApiKey("");
		setNotice(null);
	}

	function changeProvider(provider: ProfileDraft["provider"]) {
		setDraft((current) => ({
			...current,
			name: `${providers.find((entry) => entry.id === provider)?.name ?? provider} profile`,
			provider,
			model: firstModel(provider),
			baseUrl: "",
		}));
		setApiKey("");
		setNotice(null);
	}

	async function reloadSettings() {
		const loaded = await loadStandaloneProviderSettings();
		setSettings(loaded);
		onConfigurationChange(loaded.profiles.length > 0);
		return loaded;
	}

	async function save(testAfterSave: boolean) {
		setOperation(testAfterSave ? "test" : "save");
		setNotice(null);
		try {
			const profile = await saveStandaloneProviderProfile({
				...draft,
				...(draft.baseUrl.trim() ? { baseUrl: draft.baseUrl.trim() } : {}),
			}, apiKey.trim() || undefined);
			setSelectedId(profile.id);
			setDraft(draftFromProfile(profile));
			setApiKey("");
			const loaded = await reloadSettings();
			if (!testAfterSave) {
				setNotice({ kind: "success", message: "Provider profile saved on this device." });
				return;
			}
			setNotice({ kind: "success", message: "Profile saved. Checking the provider…" });
			const result = await testStandaloneProviderProfile(profile.id);
			setNotice({
				kind: result.ok ? "success" : "error",
				message: result.ok ? `Connected to ${providerName}. ${result.message}` : result.message,
			});
			if (loaded.profiles.length === 0) onConfigurationChange(false);
		} catch (error) {
			setNotice({ kind: "error", message: error instanceof Error ? error.message : String(error) });
		} finally {
			setOperation(null);
		}
	}

	async function makeDefault() {
		if (!selectedProfile) return;
		setOperation("default");
		setNotice(null);
		try {
			const next = { ...settings, defaultProfileId: selectedProfile.id };
			await saveStandaloneProviderSettings(next);
			setSettings(next);
			setNotice({ kind: "success", message: `${selectedProfile.name} is now the default for new chats.` });
		} catch (error) {
			setNotice({ kind: "error", message: error instanceof Error ? error.message : String(error) });
		} finally {
			setOperation(null);
		}
	}

	async function removeProfile() {
		if (!selectedProfile || !window.confirm(`Remove “${selectedProfile.name}” and its stored API key?`)) return;
		setOperation("remove");
		setNotice(null);
		try {
			await removeStandaloneProviderProfile(selectedProfile.id);
			const loaded = await reloadSettings();
			const next = loaded.profiles.find((profile) => profile.id === loaded.defaultProfileId) ?? loaded.profiles[0];
			if (next) chooseProfile(next);
			else addProfile();
			setNotice({ kind: "success", message: "Provider profile and its stored API key were removed." });
		} catch (error) {
			setNotice({ kind: "error", message: error instanceof Error ? error.message : String(error) });
		} finally {
			setOperation(null);
		}
	}

	function duplicateProfile() {
		if (!selectedProfile) return;
		const duplicate = { ...draftFromProfile(selectedProfile), id: createStandaloneProfileId(), name: `${selectedProfile.name} copy` };
		setSelectedId(null);
		setDraft(duplicate);
		setApiKey("");
		setNotice({ kind: "success", message: "Add an API key for this profile, then save it." });
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void save(false);
	}

	return (
		<div className="settings-page">
			<header className="settings-header">
				<p className="eyebrow">SUPER CHAT</p>
				<h1>Settings</h1>
				<p className="page-subtitle">Save provider profiles, then choose one for each chat.</p>
			</header>

			<div className="settings-scroll">
				<section className={`provider-status-card ${settings.profiles.length ? "provider-is-configured" : "provider-needs-setup"}`} aria-live="polite">
					<span className="provider-status-mark" aria-hidden="true">{settings.profiles.length ? "✓" : "•"}</span>
					<div>
						<strong>{settings.profiles.length ? `${settings.profiles.length} provider profile${settings.profiles.length === 1 ? "" : "s"} saved` : "No model provider connected"}</strong>
						<p>{settings.profiles.length ? "Each chat remembers its own provider and model." : "Add a provider and model to start a conversation."}</p>
					</div>
				</section>

				{loadError && <div className="settings-notice error" role="alert">Saved settings could not be read. You can add a profile below and save again.</div>}

				<section className="settings-card profile-list-card" aria-labelledby="profiles-heading">
					<div className="settings-card-heading">
						<div className="settings-section-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5h16v13H4zM8 9h8M8 12h5"/></svg>
						</div>
						<div><h2 id="profiles-heading">Provider profiles</h2><p>Credentials stay protected on this device.</p></div>
					</div>
					<div className="provider-profile-list">
						{settings.profiles.map((profile) => (
							<button
								className={`provider-profile-option ${selectedId === profile.id ? "is-selected" : ""}`}
								key={profile.id}
								type="button"
								disabled={busy || loading}
								onClick={() => chooseProfile(profile)}
								aria-pressed={selectedId === profile.id}
							>
								<span className="provider-profile-copy"><strong>{profile.name}</strong><small>{profile.provider} · {profile.model}</small></span>
								{settings.defaultProfileId === profile.id && <span className="provider-default-badge">Default</span>}
							</button>
						))}
					</div>
					<div className="profile-list-actions">
						<button className="settings-secondary-button" type="button" disabled={loading || busy} onClick={() => addProfile()}>+ Add profile</button>
						{selectedProfile && <button className="settings-secondary-button" type="button" disabled={busy} onClick={duplicateProfile}>Duplicate</button>}
					</div>
				</section>

				<section className="settings-card" aria-labelledby="provider-heading">
					<div className="settings-card-heading">
						<div className="settings-section-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 20 7.5v4.75c0 4.25-3.25 7.5-8 8.75-4.75-1.25-8-4.5-8-8.75V7.5l8-3.75Z"/><path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4"/></svg>
						</div>
						<div><h2 id="provider-heading">{selectedProfile ? "Edit profile" : "New profile"}</h2><p>Pick the provider and its default model.</p></div>
					</div>

					<form className="provider-form" onSubmit={submit}>
						<div className="settings-field">
							<label htmlFor="profile-name">Profile name</label>
							<input id="profile-name" value={draft.name} maxLength={80} required disabled={loading || busy} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
						</div>
						<div className="settings-field">
							<label htmlFor="provider-select">Provider</label>
							<select id="provider-select" value={draft.provider} disabled={loading || busy} onChange={(event) => changeProvider(event.target.value as ProfileDraft["provider"])}>
								{providers.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
							</select>
						</div>
						<div className="settings-field">
							<label htmlFor="model-input">Default model</label>
							<input id="model-input" list="provider-model-suggestions" value={draft.model} maxLength={160} required autoComplete="off" placeholder="Enter a model ID" disabled={loading || busy} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
							<datalist id="provider-model-suggestions">{models.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</datalist>
							<p className="field-help">Choose a suggestion or enter a model ID. Chats can use another model from this provider.</p>
						</div>

						{(draft.provider === "custom" || draft.provider === "ollama") && (
							<div className="settings-field">
								<label htmlFor="provider-base-url">{draft.provider === "custom" ? "Base URL" : "Ollama server URL"}</label>
								<input id="provider-base-url" type="url" value={draft.baseUrl} maxLength={2048} required={draft.provider === "custom"} placeholder={draft.provider === "custom" ? "https://api.example.com/v1" : "http://localhost:11434"} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={loading || busy} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
								<p className="field-help">{draft.provider === "custom" ? "Use an OpenAI-compatible endpoint. Remote URLs must use HTTPS." : "Use localhost for Ollama on this device, or an HTTPS server URL."}</p>
							</div>
						)}

						{needsApiKey && (
							<div className="settings-field">
								<label htmlFor="provider-api-key">API key</label>
								<input id="provider-api-key" type="password" value={apiKey} maxLength={4096} required={!canReuseSavedKey} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={canReuseSavedKey ? "Leave blank to keep the saved key" : "Paste your API key"} disabled={loading || busy || !credentialAvailable} onChange={(event) => { setApiKey(event.target.value); setNotice(null); }} />
								<p className="field-help">{credentialAvailable ? canReuseSavedKey ? "The existing key stays protected in Android Keystore. Enter a new key to replace it." : "Required for this provider. Stored in Android Keystore and never shown after saving." : "Protected API-key storage is available in the Android app. This build cannot save provider keys."}</p>
							</div>
						)}

						{needsApiKey && !credentialAvailable && <p className="credential-warning" role="status">Choose Ollama to connect without an API key, or set up provider keys in the Android app.</p>}
						{notice && <div className={`settings-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.message}</div>}

						<div className="settings-actions">
							<button className="settings-primary-button" type="submit" disabled={!canSave}>{operation === "save" ? "Saving…" : "Save profile"}</button>
							<button className="settings-secondary-button" type="button" disabled={!canSave} onClick={() => void save(true)}>{operation === "test" ? "Checking…" : "Save & test"}</button>
							{selectedProfile && settings.defaultProfileId !== selectedProfile.id && <button className="settings-secondary-button" type="button" disabled={busy} onClick={() => void makeDefault()}>{operation === "default" ? "Saving…" : "Make default"}</button>}
						</div>
					</form>
				</section>

				{selectedProfile && (
					<div className="remove-provider-row">
						<div><strong>Remove profile</strong><span>Delete this profile and its stored API key.</span></div>
						<button type="button" className="remove-provider-button" disabled={busy} onClick={() => void removeProfile()}>{operation === "remove" ? "Removing…" : "Remove"}</button>
					</div>
				)}
				{loading && <p className="settings-loading" role="status">Loading saved profiles…</p>}
			</div>
		</div>
	);
}
