import { useEffect, useState } from "react";
import { standaloneSettingsStore } from "../persistence";
import { UnavailableMark } from "./SettingsSectionSupport";
import { standaloneHost } from "@standalone-host";

const RELAY_KEY = "standalone.chat-relay";
type RelaySettings = { url: string; history: string[]; room: string; user: string };
const defaults: RelaySettings = { url: "ws://localhost:8080", history: [], room: "default", user: "User" };

/** Source: obsidian-ai/settings-sections/syncSettings.ts; requestUrl is host HTTP. */
export function ChatRelaySettingsSection() {
 const [value, setValue] = useState<RelaySettings>(defaults);
 const [ready, setReady] = useState(false);
 const [busy, setBusy] = useState(false);
 const [notice, setNotice] = useState("");
 const [rooms, setRooms] = useState<Record<string, string[]>>({});
 useEffect(() => { let active = true; void standaloneSettingsStore.load<RelaySettings>(RELAY_KEY).then(saved => { if (active) { setValue({ ...defaults, ...saved }); setReady(true); } }).catch(error => { if (active) setNotice(String(error)); }); return () => { active = false; }; }, []);
 const save = async () => {
  setBusy(true);
  try {
   const url = new URL(value.url);
   if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Relay URL must start with ws:// or wss://.");
   const next = { ...value, history: [...new Set([value.url, ...value.history])].slice(0, 10) };
   await standaloneSettingsStore.save(RELAY_KEY, next); setValue(next); setNotice("Relay defaults saved on this device.");
  } catch (error) { setNotice(String(error)); } finally { setBusy(false); }
 };
 const test = async () => {
  setBusy(true); setNotice("");
  try {
   const url = new URL(value.url); if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Enter a ws:// or wss:// URL.");
   url.protocol = url.protocol === "wss:" ? "https:" : "http:";
   const response = await standaloneHost.standalone.httpTransport({ url: `${url.toString().replace(/\/$/, "")}/rooms`, method: "GET", timeoutMs: 10_000 });
   if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
   const data = JSON.parse(response.text);
   setRooms(data.rooms ?? {}); setNotice("Relay connection succeeded.");
  } catch (error) { setRooms({}); setNotice(String(error)); } finally { setBusy(false); }
 };
 return <section className="settings-card settings-section-form"><h2>Chat Relay</h2><p>Save the relay defaults and check rooms using Chat Lab’s relay protocol.</p>
  <div className="settings-field"><label htmlFor="relay-url">Relay URL</label><input id="relay-url" list="relay-history" value={value.url} disabled={!ready || busy} onChange={event => setValue({ ...value, url: event.target.value })} /><datalist id="relay-history">{value.history.map(url => <option key={url} value={url} />)}</datalist></div>
  <div className="settings-field"><label htmlFor="relay-room">Default room ID</label><input id="relay-room" value={value.room} disabled={!ready || busy} onChange={event => setValue({ ...value, room: event.target.value })} /></div>
  <div className="settings-field"><label htmlFor="relay-user">Display name</label><input id="relay-user" value={value.user} disabled={!ready || busy} onChange={event => setValue({ ...value, user: event.target.value })} /></div>
  <div className="settings-actions"><button className="settings-primary-button" disabled={!ready || busy} onClick={() => void save()}>Save relay defaults</button><button className="settings-secondary-button" disabled={!ready || busy} onClick={() => void test()}>Test connection and list rooms</button></div>
  {notice && <p role="status">{notice}</p>}{Object.entries(rooms).map(([room, users]) => <p key={room}>{room}: {Array.isArray(users) ? users.join(", ") : "Room available"}</p>)}
  <p className="field-help">Joining a room and broadcasting chat messages still require the shared chat transport integration.</p><button className="settings-secondary-button is-unavailable" type="button" disabled>Join room <UnavailableMark label="Room joining is deferred until chat transport is integrated" /></button>
 </section>;
}

export function UpdatesSettingsSection() {
 return <section className="settings-card settings-section-form"><h2>Updates</h2><p>Android and desktop packages require their own updater integration. The Obsidian plugin updater cannot install standalone application packages.</p><label className="settings-field"><span>Release channel <UnavailableMark label="Release channels require a host updater" /></span><select id="update-channel" disabled><option>Stable</option></select></label><div className="settings-option-list"><div className="settings-option-row is-unavailable" aria-disabled="true"><span className="settings-option-copy"><strong>Check on startup <UnavailableMark label="Update checks require a host updater" /></strong></span><input type="checkbox" disabled aria-label="Check on startup unavailable" /></div><div className="settings-option-row is-unavailable" aria-disabled="true"><span className="settings-option-copy"><strong>Auto-install stable updates <UnavailableMark label="Automatic updates require a host updater" /></strong></span><input type="checkbox" disabled aria-label="Auto-install unavailable" /></div></div><button className="settings-secondary-button is-unavailable" type="button" disabled>Check for updates <UnavailableMark label="No host updater is connected" /></button></section>;
}
