import { getSchedule } from '../../server/kboClient.mjs';
import { prepareRequest, sendUpstreamError } from '../../server/vercelHttp.mjs';
import { getTodayKey } from '../../src/dateUtils.js';

export default async function handler(request, response) {
  if (!prepareRequest(request, response)) return;

  const rawDate = String(request.query?.date || '').replaceAll('-', '');
  const date = /^\d{8}$/.test(rawDate)
    ? rawDate
    : getTodayKey().replaceAll('-', '');

  try {
    const schedule = await getSchedule(date);
    response.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=20');
    response.status(200).json(schedule);
  } catch (error) {
    sendUpstreamError(response, error);
  }
}
