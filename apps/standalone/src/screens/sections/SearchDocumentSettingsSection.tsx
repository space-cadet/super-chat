import { AdvancedSetting } from "../SettingsPresentation";
import type { WebSearchSettings } from "../../../../../src/web/WebSearchService";
import { UnavailableMark } from "../SettingsSectionSupport";

export interface PdfSettings {
	pdfExtractionMethod: "auto" | "server" | "client";
	pdfExtractionServerUrl: string;
	pdfMaxPages: number;
}

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
	pdfExtractionMethod: "auto",
	pdfExtractionServerUrl: "https://quantumofgravity.com/relay/pdf-extract/",
	pdfMaxPages: 50,
};

export function WebSearchSettingsSection({ value, onChange }: { value: WebSearchSettings; onChange: (value: WebSearchSettings) => void }) {
	const update = (patch: Partial<WebSearchSettings>) => onChange({ ...value, ...patch });
	return (
		<section className="settings-card settings-section-form">
			<h2>Web Search</h2>
			<p>Choose how the AI searches the web for current information.</p>
			<p className="field-help">Android stores search API keys in protected device storage. Browser and desktop keys last for this app session only.</p>
			<label className="settings-field">
				Search provider
				<select value={value.webSearchProvider} onChange={event => update({ webSearchProvider: event.target.value as WebSearchSettings["webSearchProvider"] })}>
					<option value="duckduckgo">DuckDuckGo (no API key)</option>
					<option value="brave">Brave</option>
					<option value="tavily">Tavily</option>
					<option value="exa">Exa</option>
					<option value="searxng">SearXNG</option>
				</select>
			</label>
			{(["brave", "tavily", "exa"] as const).map(provider => {
				const key = `${provider}ApiKey` as "braveApiKey" | "tavilyApiKey" | "exaApiKey";
				return (
					<label className="settings-field" key={key}>
						{provider} API key
						<input type="password" autoComplete="off" value={value[key]} disabled={value.webSearchProvider !== provider} onChange={event => update({ [key]: event.target.value.trim() })} />
					</label>
				);
			})}
			<label className="settings-field">
				SearXNG instance URL
				<input type="url" value={value.searxngUrl} disabled={value.webSearchProvider !== "searxng"} placeholder="https://search.example.com" onChange={event => update({ searxngUrl: event.target.value.trim().replace(/\/$/, "") })} />
			</label>
		</section>
	);
}

export function PdfExtractionSettingsSection({ value, onChange, clientAvailable = false }: { value: PdfSettings; onChange: (value: PdfSettings) => void; clientAvailable?: boolean }) {
	const update = (patch: Partial<PdfSettings>) => onChange({ ...value, ...patch });
	return (
		<section className="settings-card settings-section-form">
			<h2>PDF Extraction</h2>
			<p>Auto tries the server first and falls back to local extraction. Server extraction sends the PDF URL to the configured service.</p>
			<label className="settings-field">
				<span>Extraction method {!clientAvailable && <UnavailableMark label="Local PDF extraction is not available on this host" />}</span>
				<select value={value.pdfExtractionMethod} onChange={event => update({ pdfExtractionMethod: event.target.value as PdfSettings["pdfExtractionMethod"] })}>
					<option value="auto">Auto (server, then client)</option>
					<option value="server">Server only</option>
					<option value="client" disabled={!clientAvailable}>Client only (offline)</option>
				</select>
			</label>
			{!clientAvailable && <p className="field-help">Local extraction requires a PDF reader supplied by this host.</p>}
			<AdvancedSetting section="PDF Extraction" name="Server endpoint URL"><label className="settings-field">
				Server endpoint URL
				<input type="url" value={value.pdfExtractionServerUrl} disabled={value.pdfExtractionMethod === "client"} onChange={event => update({ pdfExtractionServerUrl: event.target.value.trim() })} />
			</label></AdvancedSetting>
			<AdvancedSetting section="PDF Extraction" name="Maximum pages"><label className="settings-field">
				Maximum pages (0 extracts all pages)
				<input type="number" min={0} max={200} step={10} value={value.pdfMaxPages} onChange={event => update({ pdfMaxPages: Math.max(0, Math.min(200, Math.floor(Number(event.target.value) || 0))) })} />
			</label></AdvancedSetting>
		</section>
	);
}
