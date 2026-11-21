// @vitest-environment node
import { expect, it, vi } from 'vitest';
const data = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../src/persistence', () => ({ loadLocalAccountRecord: async () => data.get('account') ?? null, createLocalAccountRecord: async (value: unknown) => { if(data.has('account')) throw new Error('exists'); data.set('account',value); }, prepareLocalOwner: async () => {} }));
import { hasLocalAccount, openLocalAccount } from '../src/localAccount';
it('persists a stable identity, rejects wrong passwords and replacement accounts, and stores no plaintext password', async () => {
 data.clear();
 expect(await hasLocalAccount()).toBe(false);
 const user = await openLocalAccount('Tester', 'local-test-password', true);
 expect(await hasLocalAccount()).toBe(true);
 expect(JSON.stringify([...data.values()])).not.toContain('local-test-password');
 await expect(openLocalAccount('Tester', 'wrong', false)).rejects.toThrow('incorrect');
 await expect(openLocalAccount('Other', 'other-password', true)).rejects.toThrow('already exists');
 expect(await openLocalAccount('Tester', 'local-test-password', false)).toEqual(user);
});
