import { afterEach, expect, it, vi } from 'vitest';
import { openOwnerSession, closeOwnerSession } from '../src/ownerSession';
vi.mock('../src/persistence', () => ({ standalonePersistence: {}, standaloneSettingsStore: {}, loadLocalAccountRecord: async () => ({ id: 'original' }) }));
vi.mock('../src/memory', () => ({ standaloneMemoryTools: {} }));
vi.mock('../src/providerSettings', () => ({ getProviderProfileSnapshot: vi.fn(), subscribeStandaloneProviderSettings: vi.fn() }));
vi.mock('../src/searchDocuments', () => ({ createStandaloneSearchDocumentTools: () => ({}) }));
vi.mock('../src/tools', () => ({ standaloneTools: {} }));
import { createStandaloneHost } from '../src/hosts/createStandaloneHost';
afterEach(closeOwnerSession);
it('adopts legacy secrets only for the original owner and isolates identical credential references', async () => {
 const secrets = new Map([['profile-key','legacy-secret']]);
 const credentials = {
  id:'test', kind:'credentials' as const,
  listCredentials:async()=>[...secrets.keys()].map(id=>({id,label:id})),
  getCredential:async(id:string)=>secrets.get(id)??null,
  setCredential:async(record:{id:string},value:string)=>{secrets.set(record.id,value)},
  deleteCredential:async(id:string)=>{secrets.delete(id)},
 };
 const host = createStandaloneHost('web',{credentials, documents:{} as never,diagnostics:{} as never,lifecycle:{} as never,httpTransport:vi.fn()});
 const service=host.capabilities.credentials!;const context={requestId:'test'};
 openOwnerSession('other');expect(await service.getCredential('profile-key',context)).toBeNull();
 await service.setCredential!({id:'profile-key',label:'Other'},'other-secret',context);
 openOwnerSession('original');expect(await service.getCredential('profile-key',context)).toBe('legacy-secret');
 expect((await service.listCredentials(context)).map(record=>record.id)).toEqual(['profile-key']);
 await service.deleteCredential!('profile-key',context);
 expect(await service.getCredential('profile-key',context)).toBeNull();
 openOwnerSession('other');expect(await service.getCredential('profile-key',context)).toBe('other-secret');
 closeOwnerSession();await expect(service.getCredential('profile-key',context)).rejects.toThrow('Sign in');
});
