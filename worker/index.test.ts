import { expect, it, vi } from 'vitest';
import worker from './index';

it('routes API requests to the handler instead of the SPA', async () => {
  const assets = { fetch: vi.fn() };
  const response = await worker.fetch(new Request('https://birthday.example/api/wishes'), { ASSETS: assets });
  expect(response.status).toBe(405);
  expect(assets.fetch).not.toHaveBeenCalled();
});

it('returns JSON for unknown API paths', async () => {
  const assets = { fetch: vi.fn() };
  const response = await worker.fetch(new Request('https://birthday.example/api/missing'), { ASSETS: assets });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: 'Not found' });
  expect(assets.fetch).not.toHaveBeenCalled();
});

it('forwards page and asset requests to the static asset binding', async () => {
  const response = new Response('<html lang="de"></html>');
  const assets = { fetch: vi.fn().mockResolvedValue(response) };
  const request = new Request('https://birthday.example/');
  expect(await worker.fetch(request, { ASSETS: assets })).toBe(response);
  expect(assets.fetch).toHaveBeenCalledWith(request);
});
