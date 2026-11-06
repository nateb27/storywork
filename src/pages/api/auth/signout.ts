import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, redirect }) => {
  await locals.backend.signOut();
  return redirect('/login?signedout=1', 303);
};
