import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { Backend, Member, Product, Progress, PurchaseRecord, Result } from './types';

interface Config {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

/** Messages a member can act on, instead of raw auth errors */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) return 'That code is wrong or has expired.';
  if (m.includes('rate') || m.includes('too many') || m.includes('security purposes'))
    return 'Too many attempts. Wait a minute, then try again.';
  return 'Something went wrong. Please try again.';
}

export function createSupabaseBackend(
  config: Config,
  request: Request,
  cookies: AstroCookies,
): Backend {
  // Per-request client that reads and writes the session cookies
  const auth: SupabaseClient = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({
          name: c.name,
          value: c.value ?? '',
        }));
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          cookies.set(name, value, { ...options, path: options.path ?? '/' });
        }
      },
    },
  });

  // Service-role client for tables members can't read directly (purchases)
  let admin: SupabaseClient | null = null;
  const service = () =>
    (admin ??= createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }));

  return {
    kind: 'supabase',

    async sendCode(email): Promise<Result> {
      const { error } = await auth.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },

    async verifyCode(email, code): Promise<Result> {
      const { error } = await auth.auth.verifyOtp({ email, token: code, type: 'email' });
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },

    async getMember(): Promise<Member | null> {
      const { data, error } = await auth.auth.getUser();
      if (error || !data.user?.email) return null;
      return { id: data.user.id, email: data.user.email };
    },

    async signOut() {
      await auth.auth.signOut();
    },

    async getProducts(email): Promise<Product[]> {
      const { data, error } = await service()
        .from('purchases')
        .select('product')
        .eq('email', email.toLowerCase());
      if (error) throw new Error(`purchases lookup failed: ${error.message}`);
      return [...new Set((data ?? []).map((r) => r.product as Product))];
    },

    async getProgress(memberId): Promise<Progress> {
      const { data, error } = await auth
        .from('progress')
        .select('day, completed_at')
        .eq('user_id', memberId);
      if (error) throw new Error(`progress lookup failed: ${error.message}`);
      return Object.fromEntries((data ?? []).map((r) => [r.day as number, r.completed_at as string]));
    },

    async setProgress(memberId, day, done) {
      const query = done
        ? auth.from('progress').upsert({ user_id: memberId, day }, { onConflict: 'user_id,day', ignoreDuplicates: true })
        : auth.from('progress').delete().eq('user_id', memberId).eq('day', day);
      const { error } = await query;
      if (error) throw new Error(`progress update failed: ${error.message}`);
    },

    async recordPurchase(p: PurchaseRecord) {
      const { error } = await service().from('purchases').insert({
        email: p.email.toLowerCase(),
        product: p.product,
        stripe_session_id: p.stripeSessionId,
        amount_cents: p.amountCents,
      });
      if (!error) return 'created';
      if (error.code === '23505') return 'duplicate'; // unique (session, product): Stripe retried
      throw new Error(`purchase insert failed: ${error.message}`);
    },
  };
}
