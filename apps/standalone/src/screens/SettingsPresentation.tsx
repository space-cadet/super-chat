import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ADVANCED_SETTING_NAMES, loadSettingsPresentation, saveSettingsPresentation } from "../settingsPresentation";

interface PresentationState {
	showAdvancedSettings: boolean;
	ready: boolean;
	busy: boolean;
	error: string | null;
	reload: () => void;
	update: (value: boolean) => Promise<void>;
}
const SettingsPresentationContext = createContext<PresentationState | null>(null);

export function SettingsPresentationProvider({ children }: { children: ReactNode }) {
	const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
	const [ready, setReady] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loadAttempt, setLoadAttempt] = useState(0);
	useEffect(() => {
		let active = true;
		setReady(false);
		void loadSettingsPresentation().then(settings => {
			if (!active) return;
			setShowAdvancedSettings(settings.showAdvancedSettings);
			setError(null);
			setReady(true);
		}).catch(cause => {
			if (active) setError(cause instanceof Error ? cause.message : String(cause));
		});
		return () => { active = false; };
	}, [loadAttempt]);
	const update = async (value: boolean) => {
		if (!ready || busy) return;
		setBusy(true);
		setError(null);
		try {
			await saveSettingsPresentation({ showAdvancedSettings: value });
			setShowAdvancedSettings(value);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally { setBusy(false); }
	};
	return <SettingsPresentationContext.Provider value={{ showAdvancedSettings, ready, busy, error, reload: () => setLoadAttempt(value => value + 1), update }}>{children}</SettingsPresentationContext.Provider>;
}

function useSettingsPresentation() {
	const value = useContext(SettingsPresentationContext);
	if (!value) throw new Error("Settings presentation requires its provider.");
	return value;
}

export function useShowAdvancedSettings(): boolean {
	return useSettingsPresentation().showAdvancedSettings;
}

export function SettingsPresentationControls() {
	const { showAdvancedSettings, ready, busy, error, reload, update } = useSettingsPresentation();
	return <div className="settings-presentation-controls">
		<label className="preference-toggle">
			<span><strong>Show advanced settings</strong><small>Reveal diagnostics, developer controls, and other low-level configuration. Advanced controls are marked with *.</small></span>
			<input type="checkbox" checked={showAdvancedSettings} disabled={!ready || busy} onChange={event => void update(event.target.checked)} />
		</label>
		{error && <p className="settings-notice error" role="alert">Settings display preference could not be {ready ? "saved" : "loaded"}: {error}</p>}
		{error && !ready && <button className="settings-secondary-button" type="button" onClick={reload}>Retry loading display preference</button>}
	</div>;
}

export function AdvancedSetting({ section, name, children }: { section: string; name: string; children: ReactNode }) {
	const showAdvancedSettings = useShowAdvancedSettings();
	const isAdvanced = ADVANCED_SETTING_NAMES[section]?.has(name) ?? false;
	if (!isAdvanced) return <>{children}</>;
	return <div className="settings-advanced-control" data-settings-tier="advanced" hidden={!showAdvancedSettings}>
		<span className="settings-advanced-label" aria-hidden="true">* Advanced</span>
		{children}
	</div>;
}
