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

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  state = read();
  loaded = true;
}

function emit() {
  listeners.forEach((l) => l());
}

/** Merge the server's copy in (server wins for days it knows about). */
export function seedProgress(server: Progress) {
  ensureLoaded();
  state = { ...state, ...server };
  write(state);
  emit();
}

async function sync(day: number, done: boolean) {
  try {
    await fetch('/api/progress', {
      method: done ? 'POST' : 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day }),
    });
  } catch {
    /* offline: localStorage keeps it; next seed reconciles */
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
