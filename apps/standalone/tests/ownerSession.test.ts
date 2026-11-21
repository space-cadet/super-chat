import { afterEach, expect, it, vi } from 'vitest';
import { closeOwnerSession, openOwnerSession, requireOwnerSession, assertOwnerSession, ownerRequestSignal } from '../src/ownerSession';
import { ownedService } from '../src/ownedServices';
afterEach(closeOwnerSession);
it('revokes old sessions and request signals even after the same user signs in again', () => {
 const old = openOwnerSession('person-a'); const signal = ownerRequestSignal();
 closeOwnerSession();
 expect(signal.aborted).toBe(true);
 expect(() => requireOwnerSession()).toThrow('Sign in');
 openOwnerSession('person-a');
 expect(() => assertOwnerSession(old)).toThrow('ended');
});
it('rejects native results that finish after sign-out without invoking new calls while locked', async () => {
 let complete!: (value: string) => void;
 const method = vi.fn(() => new Promise<string>(resolve => { complete = resolve; }));
 const service = ownedService({ readSecret: method });
 openOwnerSession('person-a');
 const result = service.readSecret();
 closeOwnerSession(); openOwnerSession('person-b'); complete('private');
 await expect(result).rejects.toThrow('ended');
 closeOwnerSession();
 await expect(service.readSecret()).rejects.toThrow('Sign in');
 expect(method).toHaveBeenCalledTimes(1);
});
