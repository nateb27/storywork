/** Current prices as JSON, for the sales page to display. Public. */
import type { APIRoute } from 'astro';
import { pricesAt } from '@/config/pricing';

export const GET: APIRoute = () =>
  Response.json(pricesAt(), {
    headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
  });
