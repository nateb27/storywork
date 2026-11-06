import type { APIRoute } from 'astro';
import { PUBLIC_OTP_LENGTH } from 'astro:env/client';
import { isEmail, safeNext } from '@/lib/access';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; code?: unknown; next?: unknown }
    | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!isEmail(email) || !new RegExp(`^\\d{${PUBLIC_OTP_LENGTH}}$`).test(code)) {
    return Response.json({ ok: false, error: 'That code is wrong or has expired.' }, { status: 400 });
  }
  const result = await locals.backend.verifyCode(email, code);
  if (!result.ok) return Response.json(result, { status: 400 });

  const products = await locals.backend.getProducts(email);
  const next = products.includes('challenge')
    ? safeNext(typeof body?.next === 'string' ? body.next : null)
    : '/no-purchase';
  return Response.json({ ok: true, redirect: next });
};
