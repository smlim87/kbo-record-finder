import { getLiveGame, getSchedule } from './kboClient.mjs';

const KBO_WEB_BASE = 'https://www.koreabaseball.com';

const HITTER_RULES = [
  { statKey: 'G', label: '경기 출장', unit: '경기', step: 100, minimum: 500, maxRemaining: 10 },
  { statKey: 'R', label: '득점', unit: '득점', step: 100, minimum: 500, maxRemaining: 10 },
  { statKey: 'H', label: '안타', unit: '안타', step: 100, minimum: 500, maxRemaining: 15 },
  { statKey: '2B', label: '2루타', unit: '개', step: 50, minimum: 100, maxRemaining: 10 },
  { statKey: '3B', label: '3루타', unit: '개', step: 10, minimum: 20, maxRemaining: 3 },
  { statKey: 'HR', label: '홈런', unit: '홈런', step: 50, minimum: 100, maxRemaining: 10 },
  { statKey: 'TB', label: '루타', unit: '루타', step: 100, minimum: 1000, maxRemaining: 30 },
  { statKey: 'RBI', label: '타점', unit: '타점', step: 100, minimum: 500, maxRemaining: 15 },
  { statKey: 'SB', label: '도루', unit: '도루', step: 50, minimum: 100, maxRemaining: 10 },
  { statKey: 'BB', label: '볼넷', unit: '볼넷', step: 100, minimum: 300, maxRemaining: 15 },
];

const PITCHER_RULES = [
  { statKey: 'G', label: '경기 출장', unit: '경기', step: 100, minimum: 300, maxRemaining: 10 },
  { statKey: 'W', label: '승', unit: '승', step: 50, minimum: 50, maxRemaining: 5 },
  { statKey: 'SV', label: '세이브', unit: '세이브', step: 50, minimum: 50, maxRemaining: 5 },
  { statKey: 'HLD', label: '홀드', unit: '홀드', step: 50, minimum: 50, maxRemaining: 5 },
  { statKey: 'IP', label: '이닝', unit: '이닝', step: 100, minimum: 500, maxRemaining: 15 },
  { statKey: 'SO', label: '탈삼진', unit: '탈삼진', step: 100, minimum: 500, maxRemaining: 20 },
];

function decodeHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function readCells(fragment) {
  return [...String(fragment || '').matchAll(/<t(?:d|h)\b[^>]*>([\s\S]*?)<\/t(?:d|h)>/gi)]
    .map((match) => decodeHtml(match[1]));
}

function parseNumber(value) {
  const text = String(value || '').replaceAll(',', '').trim();
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + (Number(mixed[2]) / Number(mixed[3]));
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function parsePlayerTotalPage(html, seasonYear = '2026') {
  const headerMatch = String(html).match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const totalMatch = String(html).match(/<tfoot\b[^>]*class=["'][^"']*play_record[^"']*["'][^>]*>([\s\S]*?)<\/tfoot>/i);
  if (!headerMatch || !totalMatch) throw new Error('KBO total table was not found');

  const headers = readCells(headerMatch[1]);
  const totalCells = readCells(totalMatch[1]);
  const statHeaders = headers.slice(2);
  const totalValues = totalCells.slice(1);
  const career = Object.fromEntries(statHeaders.map((key, index) => [key, parseNumber(totalValues[index])]));
  const careerRaw = Object.fromEntries(statHeaders.map((key, index) => [key, totalValues[index] ?? '']));

  const bodyMatch = String(html).match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const rows = bodyMatch ? [...bodyMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)] : [];
  const seasonCells = rows.map((match) => readCells(match[1])).find((cells) => cells[0] === String(seasonYear)) || [];
  const season = Object.fromEntries(headers.map((key, index) => [key, parseNumber(seasonCells[index])]));
  const seasonRaw = Object.fromEntries(headers.map((key, index) => [key, seasonCells[index] ?? '']));

  return { career, careerRaw, season, seasonRaw };
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: Number.isInteger(value) ? 0 : 1 });
}

function formatInnings(value) {
  const full = Math.floor(value + 1e-6);
  const thirds = Math.round((value - full) * 3);
  return thirds > 0 ? `${full} ${thirds}/3` : String(full);
}

function nextMilestone(value, rule) {
  const quotient = value / rule.step;
  const rounded = Math.round(quotient);
  const exact = Math.abs(value - (rounded * rule.step)) < 0.001;
  return exact ? rounded * rule.step : Math.ceil(quotient) * rule.step;
}

function seasonSummary(role, parsed) {
  const raw = parsed.seasonRaw;
  if (role === '타자') {
    return {
      경기: raw.G || '0',
      타율: raw.AVG || '-',
      안타: raw.H || '0',
      홈런: raw.HR || '0',
      타점: raw.RBI || '0',
      도루: raw.SB || '0',
    };
  }
  return {
    경기: raw.G || '0',
    평균자책: raw.ERA || '-',
    승: raw.W || '0',
    세이브: raw.SV || '0',
    홀드: raw.HLD || '0',
    탈삼진: raw.SO || '0',
  };
}

function recentEstimate(rule, parsed) {
  const games = parsed.season.G || 0;
  const seasonValue = parsed.season[rule.statKey] || 0;
  const estimate = games > 0 ? Number((seasonValue / games).toFixed(1)) : 0;
  return [estimate, estimate, estimate, estimate, estimate];
}

export function calculateMilestoneCandidates(player, parsed, asOfDate) {
  const rules = player.role === '투수' ? PITCHER_RULES : HITTER_RULES;
  const activeTo = addDays(asOfDate, 6);

  return rules.flatMap((rule) => {
    const current = parsed.career[rule.statKey];
    if (!Number.isFinite(current)) return [];
    const milestone = nextMilestone(current, rule);
    const remaining = Math.max(milestone - current, 0);
    if (milestone < rule.minimum || remaining > rule.maxRemaining) return [];

    const sourceUrl = player.role === '투수'
      ? `${KBO_WEB_BASE}/Record/Player/PitcherDetail/Total.aspx?playerId=${player.playerId}`
      : `${KBO_WEB_BASE}/record/player/hitterdetail/Total.aspx?playerId=${player.playerId}`;
    const currentText = rule.statKey === 'IP'
      ? (parsed.careerRaw.IP || formatInnings(current))
      : formatNumber(current);
    const remainingText = rule.statKey === 'IP' ? formatInnings(remaining) : formatNumber(remaining);

    return [{
      id: `${player.playerId}-${player.role === '투수' ? 'p' : 'h'}-${rule.statKey}-${milestone}`,
      player_id: player.playerId,
      player_name: player.name,
      team_code: player.teamCode,
      role: player.role,
      stat_key: rule.statKey,
      as_of_date: asOfDate,
      active_from: asOfDate,
      active_to: activeTo,
      milestone,
      current_value: current,
      current_text: currentText,
      remaining_text: remainingText,
      unit: rule.unit,
      title: `개인 통산 ${formatNumber(milestone)} ${rule.label}`,
      recent: recentEstimate(rule, parsed),
      season: seasonSummary(player.role, parsed),
      note: `KBO 통산 기록을 자체 기준으로 계산했습니다. 목표까지 ${remainingText}${rule.unit} 남았습니다.`,
      source_url: sourceUrl,
      source_type: 'calculated',
      updated_at: new Date().toISOString(),
    }];
  });
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function playersFromLiveGame(liveGame) {
  const state = liveGame.state || {};
  const sides = [
    { record: liveGame.records?.away, teamCode: state.AWAY_ID },
    { record: liveGame.records?.home, teamCode: state.HOME_ID },
  ];

  return sides.flatMap(({ record, teamCode }) => {
    if (!record || !teamCode) return [];
    const hitters = (record.hitters || []).map((player) => ({
      playerId: String(player.P_ID || ''), name: player.NAME, teamCode, role: '타자',
    }));
    const pitchers = (record.pitchers || []).map((player) => ({
      playerId: String(player.P_ID || ''), name: player.NAME, teamCode, role: '투수',
    }));
    return [...hitters, ...pitchers].filter((player) => player.playerId && player.name);
  });
}

async function fetchPlayerPage(player) {
  const path = player.role === '투수'
    ? `/Record/Player/PitcherDetail/Total.aspx?playerId=${player.playerId}`
    : `/record/player/hitterdetail/Total.aspx?playerId=${player.playerId}`;
  const response = await fetch(`${KBO_WEB_BASE}${path}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 KBO-record-finder personal collector',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`KBO player page failed ${response.status}: ${player.playerId}`);
  return { html: await response.text(), sourceUrl: `${KBO_WEB_BASE}${path}` };
}

function createSupabaseClient() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRoleKey) throw new Error('Supabase server environment is not configured');

  return async function request(path, options = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase request failed ${response.status}: ${body}`);
    }
    if (response.status === 204) return null;
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  };
}

export async function syncPlayerRecords(dateKey) {
  const request = createSupabaseClient();
  const run = await request('record_sync_runs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ sync_date: dateKey, status: 'running' }]),
  });
  const runId = run?.[0]?.id;

  try {
    const schedule = await getSchedule(dateKey.replaceAll('-', ''));
    const liveGames = await mapLimit(schedule.games.filter((game) => game.kboId), 3, (game) => (
      getLiveGame(game.kboId, String(game.raw?.GAME_INN_NO || 1)).catch(() => null)
    ));
    const uniquePlayers = new Map();
    liveGames.filter(Boolean).flatMap(playersFromLiveGame).forEach((player) => {
      uniquePlayers.set(`${player.playerId}-${player.role}`, player);
    });
    const players = [...uniquePlayers.values()];

    const collected = (await mapLimit(players, 4, async (player) => {
      try {
        const { html, sourceUrl } = await fetchPlayerPage(player);
        const parsed = parsePlayerTotalPage(html, dateKey.slice(0, 4));
        return { player, parsed, sourceUrl };
      } catch (error) {
        console.warn(`Player sync skipped: ${player.playerId}`, error);
        return null;
      }
    })).filter(Boolean);

    const snapshots = collected.map(({ player, parsed, sourceUrl }) => ({
      player_id: player.playerId,
      player_name: player.name,
      team_code: player.teamCode,
      role: player.role,
      as_of_date: dateKey,
      career_stats: parsed.careerRaw,
      season_stats: parsed.seasonRaw,
      source_url: sourceUrl,
      fetched_at: new Date().toISOString(),
    }));
    const candidates = collected.flatMap(({ player, parsed }) => calculateMilestoneCandidates(player, parsed, dateKey));

    if (snapshots.length) {
      await request('player_record_snapshots?on_conflict=player_id,role,as_of_date', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(snapshots),
      });
    }
    await request(`milestone_candidates?as_of_date=eq.${encodeURIComponent(dateKey)}`, { method: 'DELETE' });
    if (candidates.length) {
      await request('milestone_candidates?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(candidates),
      });
    }

    if (runId) {
      await request(`record_sync_runs?id=eq.${runId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'success',
          player_count: collected.length,
          candidate_count: candidates.length,
          message: `${schedule.games.length} games scanned`,
          finished_at: new Date().toISOString(),
        }),
      });
    }
    return { date: dateKey, games: schedule.games.length, players: collected.length, candidates: candidates.length };
  } catch (error) {
    if (runId) {
      await request(`record_sync_runs?id=eq.${runId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', message: error.message, finished_at: new Date().toISOString() }),
      }).catch(() => null);
    }
    throw error;
  }
}
