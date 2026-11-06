import type { APIRoute } from 'astro';
import { CORE_DAYS, TOTAL_DAYS } from '@/lib/content';

async function update(request: Request, locals: App.Locals, done: boolean) {
  const member = locals.member;
  if (!member) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { day?: unknown } | null;
  const day = Number(body?.day);
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) {
    return Response.json({ error: 'Unknown day' }, { status: 400 });
  }
  if (day > CORE_DAYS && !locals.products.includes('addon')) {
    return Response.json({ error: 'Five More is not unlocked' }, { status: 403 });
  }
  await locals.backend.setProgress(member.id, day, done);
  return Response.json({ ok: true, progress: await locals.backend.getProgress(member.id) });
}

export const POST: APIRoute = ({ request, locals }) => update(request, locals, true);
export const DELETE: APIRoute = ({ request, locals }) => update(request, locals, false);

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.member) return Response.json({ error: 'Not signed in' }, { status: 401 });
  return Response.json({ progress: await locals.backend.getProgress(locals.member.id) });
};
