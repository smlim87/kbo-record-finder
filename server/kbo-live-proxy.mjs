import http from 'node:http';
import { getLiveGame, getSchedule } from './kboClient.mjs';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const cache = new Map();

function sendJson(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

async function cached(key, ttlMs, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.data;
  const data = await loader();
  cache.set(key, { at: now, data });
  return data;
}

function getDateParam(url) {
  const raw = url.searchParams.get('date') || new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return raw.replaceAll('-', '');
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/api/kbo/schedule') {
      const date = getDateParam(url);
      const data = await cached(`schedule:${date}`, 8000, () => getSchedule(date));
      sendJson(response, 200, data);
      return;
    }

    const liveMatch = url.pathname.match(/^\/api\/kbo\/games\/([^/]+)\/live$/);
    if (request.method === 'GET' && liveMatch) {
      const gId = decodeURIComponent(liveMatch[1]);
      const inning = url.searchParams.get('inning') || '1';
      const data = await cached(`live:${gId}:${inning}`, 5000, () => getLiveGame(gId, inning));
      sendJson(response, 200, data);
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    sendJson(response, 500, {
      error: 'kbo_proxy_error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`KBO live proxy listening on http://${host}:${port}`);
});
