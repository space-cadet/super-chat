import { loadLocalAccountRecord, createLocalAccountRecord, prepareLocalOwner } from './persistence';
import { openOwnerSession } from './ownerSession';
export interface LocalUser { id: string; name: string }
interface Account extends LocalUser { salt: string; verifier: string }
async function derive(password: string, salt: string) {
 if (!crypto.subtle) throw new Error('Local login requires HTTPS or localhost.');
 const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
 const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 600000 }, material, 256);
 return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}
export async function hasLocalAccount() { return (await loadLocalAccountRecord()) !== null; }
export async function openLocalAccount(name: string, password: string, create: boolean): Promise<LocalUser> {
 const operation = async () => {
  const saved = await loadLocalAccountRecord<Account>();
  if (create) {
   if (saved) throw new Error('A local account already exists. Sign in instead.');
   if (!name.trim() || name.trim().length > 80 || password.length < 8) throw new Error('Enter a name and a password of at least 8 characters.');
   const salt = crypto.randomUUID();
   const account = { id: crypto.randomUUID(), name: name.trim(), salt, verifier: await derive(password, salt) };
   await createLocalAccountRecord(account);
   await prepareLocalOwner(account.id);
   openOwnerSession(account.id);
   return { id: account.id, name: account.name };
  }
  if (!saved || typeof saved.id !== 'string' || typeof saved.name !== 'string' || typeof saved.salt !== 'string' || typeof saved.verifier !== 'string') throw new Error('The local account could not be read. Your data has been left untouched.');
  const verifier = await derive(password, saved.salt);
  if (saved.name !== name.trim() || verifier !== saved.verifier) throw new Error('The name or password is incorrect.');
  await prepareLocalOwner(saved.id);
  openOwnerSession(saved.id);
  return { id: saved.id, name: saved.name };
 };
 return navigator.locks ? navigator.locks.request('super-chat-local-account', operation) : operation();
}
