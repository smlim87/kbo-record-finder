const ALLOWED_ORIGINS = new Set([
  'https://penta1031.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export function prepareRequest(request, response) {
  const origin = request.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return false;
  }
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'method_not_allowed' });
    return false;
  }
  return true;
}

export function sendUpstreamError(response, error) {
  console.error(error);
  response.status(502).json({ error: 'kbo_upstream_unavailable' });
}
