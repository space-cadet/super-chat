import { useEffect, useState, type FormEvent } from 'react';
import { hasLocalAccount, openLocalAccount, type LocalUser } from '../localAccount';
export function LocalLogin({ onLogin }: { onLogin: (user: LocalUser) => void }) {
 const [create, setCreate] = useState<boolean | null>(null);
 const [name, setName] = useState(''); const [password, setPassword] = useState('');
 const [confirm, setConfirm] = useState(''); const [show, setShow] = useState(false);
 const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 const load = () => { setError(''); void hasLocalAccount().then(value => setCreate(!value)).catch(() => setError('Could not read the local account. Retry to continue.')); };
 useEffect(load, []);
 async function submit(event: FormEvent) {
  event.preventDefault(); if (busy || create === null) return;
  setError(''); if (create && password !== confirm) { setError('The passwords do not match.'); return; }
  setBusy(true);
  try { const user = await openLocalAccount(name, password, create); setPassword(''); setConfirm(''); onLogin(user); }
  catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); }
  finally { setBusy(false); }
 }
 return <main className="local-login"><form onSubmit={submit} className="local-login-card">
 <h1>{create ? 'Create your local account' : 'Sign in to Super Chat'}</h1>
 <p>This account stays on this installation. Existing chats and settings stay available. Sign-in is required after reloading.</p>
 {create === null ? <button type="button" className="settings-secondary-button" onClick={load}>Retry loading account</button> : <>
 <div className="settings-field"><label htmlFor="local-name">Name</label><input id="local-name" autoComplete="username" required maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={busy} /></div>
 <div className="settings-field"><label htmlFor="local-password">Password</label><input id="local-password" type={show ? 'text' : 'password'} autoComplete={create ? 'new-password' : 'current-password'} required minLength={create ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div>
 {create && <div className="settings-field"><label htmlFor="local-confirm">Confirm password</label><input id="local-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></div>}
 <label><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show password</label>
 <p>Local app lock only; saved chats are not encrypted. There is no password recovery yet. Keep this test password somewhere safe.</p>
 <button className="settings-primary-button" disabled={busy}>{busy ? 'Please wait…' : create ? 'Create account' : 'Sign in'}</button></>}
 {error && <p role="alert" className="settings-notice error">{error}</p>}
 </form></main>;
}
