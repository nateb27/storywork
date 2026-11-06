import type { APIRoute } from 'astro';
import { isEmail } from '@/lib/access';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isEmail(email)) {
    return Response.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  const result = await locals.backend.sendCode(email);
  if (!result.ok) return Response.json(result, { status: 429 });
  // The code itself is only ever returned by the development backend
  return Response.json(
    import.meta.env.DEV && result.devCode ? { ok: true, devCode: result.devCode } : { ok: true },
  );
};
