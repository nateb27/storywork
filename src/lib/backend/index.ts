import type { AstroCookies } from 'astro';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from 'astro:env/server';
import { PUBLIC_OTP_LENGTH } from 'astro:env/client';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

export type { Backend, Member, Product, Progress, Result } from './types';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

/**
 * The backend for this request. Supabase when configured; the in-memory
 * development backend only under `astro dev`. A production build with no
 * Supabase keys fails loudly rather than letting anyone in.
 */
export async function getBackend(request: Request, cookies: AstroCookies): Promise<Backend> {
  if (supabaseConfigured) {
    return createSupabaseBackend(
      { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY!, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY! },
      request,
      cookies,
    );
  }
  if (import.meta.env.DEV) {
    const { createDevBackend } = await import('./dev');
    return createDevBackend(cookies, PUBLIC_OTP_LENGTH);
  }
  throw new Error('Supabase is not configured: set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
}
