import type { Progress } from './backend/types';

const cache = new WeakMap<App.Locals, Promise<Progress>>();

/** The signed-in member's progress, fetched once per request */
export function memberProgress(locals: App.Locals): Promise<Progress> {
  if (!locals.member) return Promise.resolve({});
  let p = cache.get(locals);
  if (!p) {
    p = locals.backend.getProgress(locals.member.id);
    cache.set(locals, p);
  }
  return p;
}
