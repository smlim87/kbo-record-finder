const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || '';

export function hasSupabaseRecords() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function mapCandidate(row) {
  return {
    id: `calculated-${row.id}`,
    scope: '선수',
    date: row.as_of_date,
    weekStart: row.active_from,
    weekEnd: row.active_to,
    game: '',
    team: row.team_code,
    player: row.player_name,
    playerId: row.player_id,
    role: row.role,
    statKey: row.stat_key,
    milestone: Number(row.milestone),
    current: Number(row.current_value),
    currentText: row.current_text || undefined,
    remainingText: row.remaining_text || undefined,
    unit: row.unit,
    title: row.title,
    recent: Array.isArray(row.recent) ? row.recent.map(Number) : [0, 0, 0, 0, 0],
    season: row.season && typeof row.season === 'object' ? row.season : {},
    note: row.note,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
  };
}

export async function fetchCalculatedRecords(dateKey) {
  if (!hasSupabaseRecords()) return [];
  const query = new URLSearchParams({
    select: 'id,player_id,player_name,team_code,role,stat_key,as_of_date,active_from,active_to,milestone,current_value,remaining,current_text,remaining_text,unit,title,recent,season,note,source_url,source_type',
    active_from: `lte.${dateKey}`,
    active_to: `gte.${dateKey}`,
    order: 'remaining.asc',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/milestone_candidates?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase record request failed: ${response.status}`);
  return (await response.json()).map(mapCandidate);
}
