const EMPTY_TOTALS = {
  hits: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  totalBases: 0,
  rbi: 0,
  runs: 0,
  steals: 0,
  strikeouts: 0,
  walks: 0,
  hbp: 0,
};

function createPlayer(team, name, playerId) {
  return {
    team,
    name,
    playerId,
    ...EMPTY_TOTALS,
    events: [],
  };
}

function getPlayer(players, team, name, playerId = '') {
  const key = `${team}:${name || playerId}`;
  if (!players.has(key)) {
    players.set(key, createPlayer(team, name || '-', playerId));
  }
  return players.get(key);
}

function isBatterResult(event) {
  return event.text.includes(`${event.batter} :`);
}

function isHitText(text) {
  return text.includes('안타') || text.includes('2루타') || text.includes('3루타') || text.includes('홈런');
}

function getTotalBasesFromText(text) {
  if (text.includes('홈런')) return 4;
  if (text.includes('3루타')) return 3;
  if (text.includes('2루타')) return 2;
  if (text.includes('안타') || text.includes('1루타')) return 1;
  return 0;
}

function addEvent(player, stat, event) {
  player[stat] += 1;
  player.events.push({
    inning: event.inning,
    stat,
    text: event.text,
  });
}

function runnerNameFromText(text) {
  const match = text.match(/(?:\d루주자\s*)?([^:]+)\s*:/);
  return match?.[1]?.trim() || '';
}

function groupByPlateAppearance(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.paKey || event.id.split('-').slice(0, 4).join('-');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return Array.from(groups.values());
}

export function calculateLiveStats(events = []) {
  const players = new Map();

  for (const event of events) {
    const text = event.text || '';
    const batter = getPlayer(players, event.team, event.batter, event.batterId);

    if (isBatterResult(event)) {
      if (isHitText(text)) addEvent(batter, 'hits', event);
      if (text.includes('2루타')) addEvent(batter, 'doubles', event);
      if (text.includes('3루타')) addEvent(batter, 'triples', event);
      if (text.includes('홈런')) addEvent(batter, 'homeRuns', event);
      const totalBases = getTotalBasesFromText(text);
      if (totalBases > 0) {
        batter.totalBases += totalBases;
        batter.events.push({
          inning: event.inning,
          stat: 'totalBases',
          text: `${event.text} / ${totalBases}루타 감지`,
        });
      }
      if (text.includes('삼진')) addEvent(batter, 'strikeouts', event);
      if (text.includes('볼넷')) addEvent(batter, 'walks', event);
      if (text.includes('몸에 맞는 볼')) addEvent(batter, 'hbp', event);
    }

    if (text.includes('도루로')) {
      const runnerName = runnerNameFromText(text);
      const runner = getPlayer(players, event.team, runnerName || event.batter);
      addEvent(runner, 'steals', event);
    }

    if (text.includes('홈인')) {
      const runnerName = runnerNameFromText(text);
      const runner = getPlayer(players, event.team, runnerName || event.batter);
      addEvent(runner, 'runs', event);
    }
  }

  for (const plateAppearance of groupByPlateAppearance(events)) {
    const batterEvent = plateAppearance.find((event) => isBatterResult(event));
    if (!batterEvent) continue;
    const rbiCount = plateAppearance.filter((event) => event.text.includes('홈인')).length;
    if (rbiCount === 0) continue;
    const text = batterEvent.text || '';
    const noRbiLikely = text.includes('실책') || text.includes('병살') || text.includes('땅볼 아웃');
    if (noRbiLikely) continue;

    const batter = getPlayer(players, batterEvent.team, batterEvent.batter, batterEvent.batterId);
    batter.rbi += rbiCount;
    batter.events.push({
      inning: batterEvent.inning,
      stat: 'rbi',
      text: `${batterEvent.text} / ${rbiCount}타점 감지`,
    });
  }

  const playerList = Array.from(players.values())
    .map((player) => ({
      ...player,
      total: player.hits + player.homeRuns + player.totalBases + player.rbi + player.runs + player.steals + player.strikeouts + player.walks + player.hbp,
    }))
    .filter((player) => player.total > 0)
    .sort((a, b) => b.total - a.total || b.hits - a.hits);

  return {
    events: events.length,
    players: playerList,
    leaders: playerList.slice(0, 5),
  };
}
