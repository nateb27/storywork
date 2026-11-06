import { defineMiddleware } from 'astro:middleware';
import { getBackend } from '@/lib/backend';

/** Paths anyone can reach. Everything else needs a signed-in member. */
const PUBLIC: RegExp[] = [
  /^\/login\/?$/,
  /^\/api\/auth\//,
  /^\/checkout\/?$/,
  /^\/welcome\/?$/,
  /^\/api\/stripe\//,
  /^\/404\/?$/,
  /^\/(_astro|_image)\//,
  /^\/(favicon\.svg|og\.png|robots\.txt)$/,
];

/** Signed in but without the challenge: these still work */
const NO_PURCHASE_OK: RegExp[] = [/^\/no-purchase\/?$/, /^\/account\/?$/];

const isApi = (path: string) => path.startsWith('/api/');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const backend = await getBackend(ctx.request, ctx.cookies);
  ctx.locals.backend = backend;
  ctx.locals.member = null;
  ctx.locals.products = [];

  if (PUBLIC.some((re) => re.test(path))) {
    // Public pages may still want to know who is signed in (e.g. /login)
    if (!path.startsWith('/_') && !path.startsWith('/api/stripe/')) {
      ctx.locals.member = await backend.getMember();
    }
    return next();
  }

  const member = await backend.getMember();
  if (!member) {
    if (isApi(path)) return json(401, { error: 'Not signed in' });
    const nextPath = path + ctx.url.search;
    return ctx.redirect(`/login?next=${encodeURIComponent(nextPath)}`, 302);
  }

  const products = await backend.getProducts(member.email);
  ctx.locals.member = member;
  ctx.locals.products = products;

  if (!products.includes('challenge') && !NO_PURCHASE_OK.some((re) => re.test(path))) {
    if (isApi(path)) return json(403, { error: 'No purchase found' });
    return ctx.redirect('/no-purchase', 302);
  }

  const response = await next();
  // Member pages are personal: never cache them in shared caches
  try {
    response.headers.set('Cache-Control', 'private, no-store');
  } catch {
    /* immutable headers (e.g. a redirect Response): nothing to cache anyway */
  }
  return response;
});
