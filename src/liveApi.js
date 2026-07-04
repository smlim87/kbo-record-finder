const LIVE_API_URL = import.meta.env.VITE_LIVE_API_URL || '';

export function hasLiveApi() {
  return Boolean(LIVE_API_URL);
}

function toKboDate(dateKey) {
  return dateKey.replaceAll('-', '');
}

async function readJson(path) {
  const response = await fetch(`${LIVE_API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Live API request failed: ${response.status}`);
  }
  return response.json();
}

export function fetchKboSchedule(dateKey) {
  return readJson(`/api/kbo/schedule?date=${toKboDate(dateKey)}`);
}

export function fetchKboLiveGame(gameId, inning = '1') {
  return readJson(`/api/kbo/games/${encodeURIComponent(gameId)}/live?inning=${encodeURIComponent(inning)}`);
}
