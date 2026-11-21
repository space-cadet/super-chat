import { assertOwnerSession, requireOwnerSession } from './ownerSession';

/** Bind promise-based native/tool operations to the login that started them. */
export function ownedService<T extends object>(service: T): T {
 return new Proxy(service, {
  get(target, name, receiver) {
   const method = Reflect.get(target, name, receiver);
   if (typeof method !== 'function') return method;
   return async (...args: unknown[]) => {
    const owner = requireOwnerSession();
    const result = await method.apply(target, args);
    assertOwnerSession(owner);
    return result;
   };
  },
 });
}
