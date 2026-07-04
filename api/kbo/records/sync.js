import { syncPlayerRecords } from '../../../server/playerRecordSync.mjs';
import { getTodayKey } from '../../../src/dateUtils.js';

export default async function handler(request, response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const expectedSecret = process.env.KBO_SYNC_SECRET || '';
  const authorization = String(request.headers.authorization || '');
  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  const rawDate = String(request.query?.date || getTodayKey());
  const date = /^2026-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '';
  if (!date) {
    response.status(400).json({ error: 'invalid_date' });
    return;
  }

  try {
    const result = await syncPlayerRecords(date);
    response.status(200).json(result);
  } catch (error) {
    console.error(error);
    response.status(502).json({ error: 'record_sync_failed', message: error.message });
  }
}
