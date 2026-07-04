import { getLiveGame } from '../../../../server/kboClient.mjs';
import { prepareRequest, sendUpstreamError } from '../../../../server/vercelHttp.mjs';

export default async function handler(request, response) {
  if (!prepareRequest(request, response)) return;

  const gameId = String(request.query?.gameId || '');
  const requestedInning = Number(request.query?.inning || 1);
  const inning = Number.isInteger(requestedInning) && requestedInning >= 1 && requestedInning <= 12
    ? String(requestedInning)
    : '1';

  if (!/^[A-Z0-9]+$/i.test(gameId)) {
    response.status(400).json({ error: 'invalid_game_id' });
    return;
  }

  try {
    const game = await getLiveGame(gameId, inning);
    response.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    response.status(200).json(game);
  } catch (error) {
    sendUpstreamError(response, error);
  }
}
