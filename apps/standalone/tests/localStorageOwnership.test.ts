// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { LocalStoragePersistenceAdapter } from '../../../src/adapters/LocalStoragePersistence';
import type { ChatSession } from '../../../src/core/types';
afterEach(() => vi.unstubAllGlobals());
it('isolates the same session ID and leaves legacy data outside owner namespaces', async () => {
 const values = new Map<string,string>();
 vi.stubGlobal('localStorage', {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
 const legacy = new LocalStoragePersistenceAdapter();
 const first = new LocalStoragePersistenceAdapter({ownerId:'first'});
 const second = new LocalStoragePersistenceAdapter({ownerId:'second'});
 const session = {id:'same',title:'Legacy',createdAt:1,updatedAt:1,messages:[]} as ChatSession;
 await legacy.saveSession(session);
 expect(await first.loadSessions()).toEqual([]);
 await first.saveSession({...session,title:'First'});
 await second.saveSession({...session,title:'Second'});
 await first.deleteSession('same');
 expect((await second.loadSessions())[0].title).toBe('Second');
 expect((await legacy.loadSessions())[0].title).toBe('Legacy');
 expect(() => new LocalStoragePersistenceAdapter({ownerId:' '})).toThrow();
});
