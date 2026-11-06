/**
 * Development-only backend. Keeps members, codes, purchases and
 * progress in memory (mirrored to .dev-data.json so a restart keeps
 * them). Lets the whole site run with no Supabase or Stripe account.
 *
 * Purchases for testing, by email address:
 *   anything             → has the 10-day challenge
 *   contains "addon"     → also has Five More
 *   contains "nopurchase"→ has nothing (tests the no-purchase page)
 * Plus anything bought through the development checkout.
 *
 * Never used in production: getBackend() refuses to fall back to it.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AstroCookies } from 'astro';
import type { Backend, Member, Product, Progress, PurchaseRecord, Result } from './types';

const FILE = path.join(process.cwd(), '.dev-data.json');
const SESSION_COOKIE = 'sw_dev_session';

interface Store {
  codes: Record<string, { code: string; expires: number }>;
  members: Record<string, Member>; // by email
  sessions: Record<string, string>; // token → email
  purchases: Array<PurchaseRecord>;
  progress: Record<string, Progress>; // memberId → progress
}

let store: Store | null = null;

function load(): Store {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Store;
  } catch {
    store = { codes: {}, members: {}, sessions: {}, purchases: [], progress: {} };
  }
  return store;
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  } catch {
    /* read-only filesystem: memory still works */
  }
}

export function createDevBackend(cookies: AstroCookies, otpLength: number): Backend {
  const s = load();

  return {
    kind: 'dev',

    async sendCode(email): Promise<Result> {
      const code = Array.from({ length: otpLength }, () => crypto.randomInt(10)).join('');
      s.codes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };
      save();
      console.info(`[dev backend] login code for ${email}: ${code}`);
      return { ok: true, devCode: code };
    },

    async verifyCode(email, code): Promise<Result> {
      const entry = s.codes[email];
      if (!entry || entry.code !== code || entry.expires < Date.now()) {
        return { ok: false, error: 'That code is wrong or has expired.' };
      }
      delete s.codes[email];
      const member = (s.members[email] ??= { id: crypto.randomUUID(), email });
      const token = crypto.randomBytes(24).toString('hex');
      s.sessions[token] = member.email;
      save();
      cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      return { ok: true };
    },

    async getMember() {
      const token = cookies.get(SESSION_COOKIE)?.value;
      const email = token ? s.sessions[token] : undefined;
      return email ? (s.members[email] ?? null) : null;
    },

    async signOut() {
      const token = cookies.get(SESSION_COOKIE)?.value;
      if (token) delete s.sessions[token];
      save();
      cookies.delete(SESSION_COOKIE, { path: '/' });
    },

    async getProducts(email): Promise<Product[]> {
      const e = email.toLowerCase();
      const products = new Set<Product>();
      if (!e.includes('nopurchase')) products.add('challenge');
      if (e.includes('addon')) products.add('addon');
      for (const p of s.purchases) if (p.email === e) products.add(p.product);
      return [...products];
    },

    async getProgress(memberId) {
      return { ...(s.progress[memberId] ?? {}) };
    },

    async setProgress(memberId, day, done) {
      const p = (s.progress[memberId] ??= {});
      if (done) p[day] ??= new Date().toISOString();
      else delete p[day];
      save();
    },

    async recordPurchase(p) {
      const dup = s.purchases.some(
        (x) => x.stripeSessionId === p.stripeSessionId && x.product === p.product,
      );
      if (dup) return 'duplicate';
      s.purchases.push({ ...p, email: p.email.toLowerCase() });
      save();
      return 'created';
    },
  };
}
