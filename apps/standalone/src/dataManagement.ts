import { loadSettingsPresentation, saveSettingsPresentation, normalizeSettingsPresentation } from "./settingsPresentation";
import { standalonePersistence, standaloneSettingsStore as store } from './persistence';
import { loadStandaloneChatPreferences, saveStandaloneChatPreferences, validateStandaloneChatPreferences } from './appSettings';
import { loadStandaloneProviderSettings, saveStandaloneProviderSettings, validateStandaloneProviderProfile } from './providerSettings';
import { standaloneHost } from '@standalone-host';
import { parseSessionArchive, makeImportedSessionsUnique } from '../../../src/utils/importChat';
import { WebDAVStorageAdapter } from '../../../src/sync/WebDAVStorageAdapter';
import { EncryptionLayer } from '../../../src/sync/EncryptionLayer';
import { LocalCache } from '../../../src/sync/LocalCache';
import { SyncEngine } from '../../../src/sync/SyncEngine';
import { SyncIndexManager } from '../../../src/sync/SyncIndexManager';
import { DurableSyncRetryStore } from '../../../src/sync/SyncRetryStore';
import { PluginFileSyncManager, type PluginFileSyncTarget } from '../../../src/sync/PluginFileSyncManager';
import { makeSyncIdentity } from '../../../src/sync/SyncIdentity';

export const componentLabels = {chatSessions:'Chat sessions',pluginSettings:'App settings',apiKeys:'API keys & credentials',memory:'AI memory',memoryAudit:'Memory audit log',persona:'AI persona',usageStats:'Usage statistics'};
export type SyncComponents = Record<keyof typeof componentLabels, boolean>;
export const defaultSyncComponents: SyncComponents = {chatSessions:true,pluginSettings:true,apiKeys:false,memory:true,memoryAudit:false,persona:true,usageStats:false};
export interface RemotePreferences {enabled:boolean;backend:'webdav'|'s3'|'custom';url:string;username:string;prefix:string;encrypted:boolean;direction:'both'|'upload'|'download';conflictStrategy:'last-write-wins'|'keep-both'|'manual';allowDeletions:boolean}
export const defaultRemotePreferences:RemotePreferences={enabled:false,backend:'webdav',url:'',username:'',prefix:'super-chat-sync/',encrypted:true,direction:'both',conflictStrategy:'keep-both',allowDeletions:false};
export async function loadSyncComponents():Promise<SyncComponents>{return {...defaultSyncComponents,...await store.load<Partial<SyncComponents>>('sync-components')}}
export async function saveSyncComponents(value:SyncComponents){await store.save('sync-components',value)}
export async function loadRemotePreferences():Promise<RemotePreferences>{return {...defaultRemotePreferences,...await store.load<Partial<RemotePreferences>>('remote-storage')}}
export async function saveRemotePreferences(value:RemotePreferences){await store.save('remote-storage',value)}
export async function saveDataFile(filename:string,content:string){const documents=standaloneHost.capabilities.documents;if(!documents?.createDocument)throw new Error('Document export is not available on this host.');await documents.createDocument({id:globalThis.crypto.randomUUID(),title:filename,content},{requestId:globalThis.crypto.randomUUID()})}
function redact(value:unknown):unknown {if(Array.isArray(value))return value.map(redact); if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/(api.?key|password|token|secret|passphrase|credentialId)/i.test(key)).map(([key,v])=>[key,redact(v)])); return value}
export async function exportSettings(){return JSON.stringify({format:'super-chat-settings',version:1,exportedAt:new Date().toISOString(),presentation:await loadSettingsPresentation(),chat:await loadStandaloneChatPreferences(),providers:redact(await loadStandaloneProviderSettings()),components:await loadSyncComponents(),remote:await loadRemotePreferences()},null,2)}
export async function importSettings(text: string) {
 const value = JSON.parse(text);
 if (value.format !== 'super-chat-settings' || value.version !== 1) throw new Error('Choose a Super Chat settings export. Obsidian settings need a separate migration.');
 const chat = validateStandaloneChatPreferences(value.chat);
 const raw = redact(value.providers) as { profiles: unknown[]; defaultProfileId: string | null };
 if (!Array.isArray(raw?.profiles)) throw new Error('Invalid provider profiles.');
 const providers = { profiles: raw.profiles.map(validateStandaloneProviderProfile), defaultProfileId: raw.defaultProfileId };

 const components: SyncComponents = { ...defaultSyncComponents };
 if (value.components && typeof value.components === 'object' && !Array.isArray(value.components)) {
  for (const key of Object.keys(defaultSyncComponents) as (keyof SyncComponents)[]) {
   if (typeof value.components[key] === 'boolean') components[key] = value.components[key];
  }
 }
 // Credentials cannot be imported or synced until the host has a secure adapter.
 components.apiKeys = false;

 const remote = { ...defaultRemotePreferences };
 if (value.remote && typeof value.remote === 'object' && !Array.isArray(value.remote)) {
  const incoming = value.remote as Partial<RemotePreferences>;
  if (incoming.backend !== undefined && incoming.backend !== 'webdav') throw new Error('The imported storage backend is not available in this app.');
  if (incoming.direction !== undefined && !['both', 'upload', 'download'].includes(incoming.direction)) throw new Error('Invalid remote sync direction.');
  if (incoming.conflictStrategy !== undefined && !['last-write-wins', 'keep-both', 'manual'].includes(incoming.conflictStrategy)) throw new Error('Invalid remote conflict strategy.');
  for (const key of ['url', 'username', 'prefix'] as const) {
   if (incoming[key] !== undefined && typeof incoming[key] !== 'string') throw new Error(`Invalid remote ${key}.`);
  }
  if (incoming.enabled !== undefined && typeof incoming.enabled !== 'boolean') throw new Error('Invalid remote storage setting.');
  if (incoming.encrypted !== undefined && typeof incoming.encrypted !== 'boolean') throw new Error('Invalid remote encryption setting.');
  if (incoming.allowDeletions !== undefined && typeof incoming.allowDeletions !== 'boolean') throw new Error('Invalid remote deletion setting.');
  remote.backend = 'webdav';
  remote.enabled = incoming.enabled ?? remote.enabled;
  remote.url = incoming.url ?? remote.url;
  remote.username = incoming.username ?? remote.username;
  remote.prefix = incoming.prefix ?? remote.prefix;
  remote.encrypted = incoming.encrypted ?? remote.encrypted;
  remote.direction = incoming.direction ?? remote.direction;
  remote.conflictStrategy = incoming.conflictStrategy ?? remote.conflictStrategy;
  remote.allowDeletions = incoming.allowDeletions ?? remote.allowDeletions;
 }

 if (value.presentation !== undefined) await saveSettingsPresentation(normalizeSettingsPresentation(value.presentation));
 await saveStandaloneChatPreferences(chat);
 await saveStandaloneProviderSettings(providers);
 await saveSyncComponents(components);
 await saveRemotePreferences(remote);
}
export async function importChats(text:string,filename:string){const sessions=parseSessionArchive(text,filename); const unique=makeImportedSessionsUnique(sessions,new Set((await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()})).map(s=>s.id))).sessions; for(const session of unique)await standalonePersistence.saveSession(session,{requestId:globalThis.crypto.randomUUID()});return unique.length}
export async function clearChatHistory(){await store.save('chat-history-recovery',{savedAt:Date.now(),sessions:await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()})});for(const session of await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()}))await standalonePersistence.deleteSession(session.id,{requestId:globalThis.crypto.randomUUID()});await store.remove('chat-workspace')}
export async function exportChats(format:'json'|'jsonl'){const sessions=await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()});return format==='json'?JSON.stringify({sessions},null,2):sessions.map(session=>JSON.stringify(session)).join('\n')}
export function createRemoteAdapter(){return new WebDAVStorageAdapter(standaloneHost.standalone.webDavTransport)}
export async function runRemoteSync(preferences:RemotePreferences,password:string,passphrase:string,testOnly=false){
 if(preferences.backend!=='webdav')throw new Error('S3 and custom REST are coming soon.');
 if(!/^https?:\/\//i.test(preferences.url))throw new Error('Enter a WebDAV HTTP or HTTPS URL.');
 if(!testOnly&&!preferences.enabled)throw new Error('Enable remote storage before syncing.');
 const components=await loadSyncComponents();
 if(!testOnly&&components.apiKeys)throw new Error('Credential sync requires a secure credential transfer adapter, which is not connected yet. Disable credentials to sync other selected data.');
 if(!testOnly&&preferences.encrypted&&!passphrase)throw new Error('Enter an encryption passphrase. It stays in memory for this operation.');
 const adapter=createRemoteAdapter();const config={url:preferences.url,username:preferences.username,password,prefix:preferences.prefix};
 if(testOnly){try{await adapter.initialize(config);return 'WebDAV connection successful.'}finally{await adapter.disconnect()}}
 const identity=makeSyncIdentity({vaultId:'standalone',backend:'webdav',server:preferences.url,account:preferences.username,remotePath:preferences.prefix,encryptionIdentity:preferences.encrypted?passphrase:''});
 const cache=new LocalCache(identity);const crypto=new EncryptionLayer();const state={load:()=>store.load<Record<string,unknown>>('remote-index-'+identity),save:(data:Record<string,unknown>)=>store.save('remote-index-'+identity,data)};
 const engine=new SyncEngine({adapter,cache,crypto,passphrase:preferences.encrypted?passphrase:'',identity,conflictStrategy:preferences.conflictStrategy,allowDeletions:preferences.allowDeletions,indexManager:new SyncIndexManager(state),retryStore:new DurableSyncRetryStore({load:()=>store.load('remote-retry-'+identity),save:data=>store.save('remote-retry-'+identity,data)},identity),onSessionDownloaded:session=>standalonePersistence.saveSession(session,{requestId:globalThis.crypto.randomUUID()}),onSessionDeleted:id=>standalonePersistence.deleteSession(id,{requestId:globalThis.crypto.randomUUID()})});
 try{await engine.initialize(config);await engine.populateCache(await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()}));const result=components.chatSessions?await engine.sync(preferences.direction):{uploaded:0,downloaded:0,conflicts:0,errors:[]};const files=await syncAppData(adapter,crypto,identity,components,preferences.direction);return `${result.uploaded+files.uploaded} uploaded, ${result.downloaded+files.downloaded} downloaded, ${result.conflicts+files.conflicts} conflicts. ${[...result.errors,...files.errors].join(' ')}`}finally{await engine.disconnect();await cache.close();crypto.clear()}
}

async function syncAppData(adapter:WebDAVStorageAdapter,crypto:EncryptionLayer,identity:string,components:SyncComponents,direction:RemotePreferences['direction']){
 const targets:PluginFileSyncTarget[]=[];
 const backup=async(id:string,content:string)=>{await store.save('sync-recovery-'+id,{savedAt:Date.now(),content})};
 if(components.pluginSettings)targets.push({id:'settings',remotePath:'app-data/settings.json',readLocal:exportSettings,writeLocal:importSettings,backupLocal:content=>backup('settings',content)});
 for(const [id,enabled,test] of [
 ['memory',components.memory,(key:string)=>!key.includes('audit')&&!key.includes('persona')],
 ['memory-audit',components.memoryAudit,(key:string)=>key.includes('audit')],
 ['persona',components.persona,(key:string)=>key.includes('persona')]
 ] as const){if(!enabled)continue;targets.push({id,remotePath:'app-data/'+id+'.json',async readLocal(){const state=await store.load<{current:Record<string,string>}>('long-term-memory');return JSON.stringify(Object.fromEntries(Object.entries(state?.current??{}).filter(([key])=>test(key))))},async writeLocal(content){const incoming=JSON.parse(content);if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||Object.entries(incoming).some(([key,value])=>!test(key)||typeof value!=='string'))throw new Error('Invalid memory sync payload.');const state=await store.load<{current:Record<string,string>;backups:unknown[]}>('long-term-memory')??{current:{},backups:[]};await store.save('long-term-memory',{...state,current:{...Object.fromEntries(Object.entries(state.current).filter(([key])=>!test(key))),...incoming}})},backupLocal:content=>backup(id,content)});}
 if(components.usageStats)targets.push({id:'usage-statistics',remotePath:'app-data/usage-statistics.json',allowDownload:false,async readLocal(){const sessions=await standalonePersistence.loadSessions({requestId:globalThis.crypto.randomUUID()});return JSON.stringify({sessions:sessions.length,messages:sessions.reduce((sum,s)=>sum+s.messages.length,0),note:'Session and message counts; provider token aggregation is not available.'})},async writeLocal(){throw new Error('Usage statistics are upload-only.')}});
 return new PluginFileSyncManager({remote:adapter,crypto,identity,stateStore:{load:()=>store.load('remote-files-'+identity),save:data=>store.save('remote-files-'+identity,data)}}).sync(targets,direction);
}
