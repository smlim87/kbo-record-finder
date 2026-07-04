const KBO_BASE_URL = 'https://m.koreabaseball.com';

async function postKbo(path, body) {
  const response = await fetch(`${KBO_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'user-agent': 'Mozilla/5.0 KBO-record-finder personal collector',
      referer: `${KBO_BASE_URL}/`,
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    throw new Error(`KBO request failed ${response.status} ${path}`);
  }

  return response.json();
}

function toDateKey(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function findWeather(weatherList, game) {
  return weatherList.find((item) => item.s_id === game.S_ID && item.away_id === game.AWAY_ID)
    || weatherList.find((item) => item.s_id === game.S_ID)
    || null;
}

function normalizeGame(game, weatherList) {
  const weather = findWeather(weatherList, game);

  return {
    id: game.G_ID,
    kboId: game.G_ID,
    date: toDateKey(game.G_DT),
    away: game.AWAY_ID,
    home: game.HOME_ID,
    awayName: game.AWAY_NM,
    homeName: game.HOME_NM,
    time: game.G_TM,
    venue: game.S_NM,
    weather: weather ? `${weather.game_icon_nm || weather.icon_nm || '날씨'} ${weather.game_temp_va || weather.temp_va || '-'}°` : '',
    state: game.GAME_STATE_SC,
    inning: game.GAME_INN_NO ? `${game.GAME_INN_NO}회${game.GAME_TB_SC_NM || ''}` : '경기 전',
    score: {
      away: Number(game.T_SCORE_CN || 0),
      home: Number(game.B_SCORE_CN || 0),
    },
    pitchers: {
      away: (game.T_PIT_P_NM || '').trim(),
      home: (game.B_PIT_P_NM || '').trim(),
    },
    current: {
      pitcher: (game.GAME_TB_SC === 'T' ? game.B_P_NM : game.T_P_NM || '').trim(),
      batter: (game.GAME_TB_SC === 'T' ? game.T_P_NM : game.B_P_NM || '').trim(),
      outs: game.OUT_CN == null ? 0 : Number(game.OUT_CN),
      bases: [
        game.B1_BAT_ORDER_NO != null,
        game.B2_BAT_ORDER_NO != null,
        game.B3_BAT_ORDER_NO != null,
      ],
    },
    raw: game,
  };
}

function normalizeLiveText(data) {
  return (data.listInnTb || []).flatMap((inning) => (
    (inning.listBatOrder || []).flatMap((plateAppearance) => {
      const paKey = `${inning.INN_NO}-${inning.TB_SC}-${plateAppearance.BAT_AROUND_NO}-${plateAppearance.BAT_ORDER_NO}`;
      return (plateAppearance.listData || []).map((event, index) => ({
        id: `${paKey}-${index}`,
        paKey,
        inning: `${inning.INN_NO}회${inning.TB_NM}`,
        team: inning.T_NM,
        batterId: plateAppearance.BAT_P_ID,
        batter: plateAppearance.BAT_P_NM,
        battingOrder: plateAppearance.BAT_ORDER_NO,
        text: event.LIVETEXT_IF,
        style: event.TEXTSTYLE_SC,
      }));
    })
  ));
}

function getInningsToFetch(state, fallbackInning) {
  const game = state.game?.[0];
  const maxInning = Number(game?.INN_NO || fallbackInning || 1);
  if (!Number.isFinite(maxInning) || maxInning < 1) return [String(fallbackInning || 1)];

  return Array.from({ length: Math.min(maxInning, 12) }, (_, index) => String(maxInning - index));
}

function parseTableRows(tableJson) {
  if (!tableJson) return [];
  try {
    return JSON.parse(tableJson).rows || [];
  } catch {
    return [];
  }
}

export async function getSchedule(date) {
  const data = await postKbo('/ws/Kbo.asmx/GetKboGameDateList', {
    leId: '1',
    srId: '0',
    date,
  });

  return {
    date: toDateKey(data.NOW_G_DT || date),
    rawDate: data.NOW_G_DT || date,
    label: data.NOW_G_DT_TEXT || '',
    before: data.BEFORE_G_DT ? toDateKey(data.BEFORE_G_DT) : '',
    after: data.AFTER_G_DT ? toDateKey(data.AFTER_G_DT) : '',
    games: (data.game || []).map((game) => normalizeGame(game, data.list || [])),
  };
}

export async function getLiveGame(gId, inning = '1') {
  const state = await postKbo('/ws/Kbo.asmx/GetGameState', { le_id: '1', sr_id: '0', g_id: gId });
  const innings = getInningsToFetch(state, inning);

  const [score, ground, textByInning, awayRecord, homeRecord] = await Promise.all([
    postKbo('/ws/Kbo.asmx/GetLiveTextScore', { le_id: '1', sr_id: '0', g_id: gId, sc_id: '0' }).catch(() => null),
    postKbo('/ws/Kbo.asmx/GetLiveTextGround', { le_id: '1', sr_id: '0', g_id: gId }).catch(() => null),
    Promise.all(innings.map((inn) => postKbo('/ws/Kbo.asmx/GetLiveText', {
      le_id: '1',
      sr_id: '0',
      g_id: gId,
      inning: inn,
      order: 'DESC',
    }).catch(() => ({ listInnTb: [] })))),
    postKbo('/ws/Kbo.asmx/GetLiveRecord', { le_id: '1', sr_id: '0', g_id: gId, tb_sc: 'T' }).catch(() => null),
    postKbo('/ws/Kbo.asmx/GetLiveRecord', { le_id: '1', sr_id: '0', g_id: gId, tb_sc: 'B' }).catch(() => null),
  ]);

  return {
    gId,
    state: state.game?.[0] || null,
    score,
    ground,
    textcast: textByInning.flatMap((text) => normalizeLiveText(text)),
    innings,
    records: {
      away: awayRecord ? {
        team: awayRecord.awayTeam,
        hitters: awayRecord.listHitter || [],
        pitchers: awayRecord.listPitcher || [],
        hitterRows: parseTableRows(awayRecord.tableHitter),
        pitcherRows: parseTableRows(awayRecord.tablePitcher),
      } : null,
      home: homeRecord ? {
        team: homeRecord.homeTeam,
        hitters: homeRecord.listHitter || [],
        pitchers: homeRecord.listPitcher || [],
        hitterRows: parseTableRows(homeRecord.tableHitter),
        pitcherRows: parseTableRows(homeRecord.tablePitcher),
      } : null,
    },
  };
}
