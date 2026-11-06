/**
 * Client-side progress store shared by every island on a page.
 *
 * Source of truth is the server (milestone 3); this store mirrors it in
 * localStorage so the UI updates instantly and survives a flaky
 * connection. Islands subscribe with useProgress().
 */

import { useSyncExternalStore } from 'react';

/** day number → ISO timestamp when it was marked done */
export type Progress = Record<number, string>;

const KEY = 'storywork:progress';
const listeners = new Set<() => void>();
let state: Progress = {};
let loaded = false;

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function write(next: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage full: the server copy still counts */
  }
}

/** Progress the server embedded in the page, if any (see ProgressSeed.astro) */
function readSeed(): Progress | null {
  const el = document.getElementById('sw-progress');
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as Progress;
  } catch {
    return null;
  }
}

/** Changes sent to the server but not yet confirmed: day → done? */
const pending = new Map<number, { done: boolean; at: string }>();

function withPending(base: Progress): Progress {
  const next = { ...base };
  for (const [day, change] of pending) {
    if (change.done) next[day] ??= change.at;
    else delete next[day];
  }
  return next;
}

function applySeed(): boolean {
  const seed = readSeed();
  if (!seed) return false;
  // The server is the source of truth, except for changes still in flight
  state = withPending(seed);
  write(state);
  return true;
}

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  if (!applySeed()) state = read();
  loaded = true;
  // View transitions swap the page without a reload; pick up its fresh copy
  document.addEventListener('astro:after-swap', () => {
    if (applySeed()) emit();
  });
}

function emit() {
  listeners.forEach((l) => l());
}

async function sync(day: number, done: boolean) {
  const change = { done, at: new Date().toISOString() };
  pending.set(day, change);
  try {
    const res = await fetch('/api/progress', {
      method: done ? 'POST' : 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day }),
    });
    if (res.ok) {
      const body = (await res.json()) as { progress?: Progress };
      if (pending.get(day) === change) pending.delete(day);
      if (body.progress) {
        state = withPending(body.progress);
        write(state);
        emit();
      }
    }
  } catch {
    /* offline: the change stays pending and shown locally until a later save succeeds */
  }
}

export function markDone(day: number) {
  ensureLoaded();
  state = { ...state, [day]: new Date().toISOString() };
  write(state);
  emit();
  void sync(day, true);
}

export function markNotDone(day: number) {
  ensureLoaded();
  const next = { ...state };
  delete next[day];
  state = next;
  write(state);
  emit();
  void sync(day, false);
}

const EMPTY: Progress = {};

export function useProgress(): Progress {
  return useSyncExternalStore(
    (onChange) => {
      ensureLoaded();
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => {
      ensureLoaded();
      return state;
    },
    () => EMPTY,
  );
}

/** Same calendar day in the member's own time zone */
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
