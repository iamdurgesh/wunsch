import { handleWishes, type Env } from './wishes';

export type WorkerEnv = Env & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api/wishes' || path === '/api/wishes/') {
      return handleWishes(request, env);
    }
    // API errors must never fall through to the SPA's index.html response.
    if (path === '/api' || path.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return env.ASSETS.fetch(request);
  },
};
