import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Home,
  Info,
  MapPin,
  Radio,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  ShieldAlert,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { fetchKboLiveGame, fetchKboSchedule, hasLiveApi } from './liveApi';
import { calculateLiveStats } from './recordEngine';
import { WEEKLY_RECORDS, WEEKLY_RECORD_SOURCE } from './weeklyRecords';
import { fetchCalculatedRecords, hasSupabaseRecords } from './supabaseRecords';
import { getTodayKey, getYearDays } from './dateUtils';
import './styles.css';

const TEAMS = {
  LG: { name: 'LG', city: '서울', color: '#c81d3c' },
  HH: { name: '한화', city: '대전', color: '#f36f21' },
  LT: { name: '롯데', city: '부산', color: '#173e7a' },
  KT: { name: 'KT', city: '수원', color: '#222222' },
  SS: { name: '삼성', city: '대구', color: '#1764ae' },
  NC: { name: 'NC', city: '창원', color: '#315288' },
  DS: { name: '두산', city: '서울', color: '#182958' },
  OB: { name: '두산', city: '서울', color: '#182958' },
  WO: { name: '키움', city: '서울', color: '#7d2248' },
  SK: { name: 'SSG', city: '인천', color: '#ce0e2d' },
  KIA: { name: 'KIA', city: '광주', color: '#e31937' },
  HT: { name: 'KIA', city: '광주', color: '#e31937' },
};

const TEAM_NAME_TO_CODE = Object.entries(TEAMS).reduce((map, [code, team]) => {
  if (!map[team.name]) map[team.name] = code;
  map[code] = code;
  return map;
}, {});

const TEAM_BADGE_LABELS = {
  LG: 'LG',
  HH: 'HE',
  LT: 'LT',
  KT: 'KT',
  SS: 'SL',
  NC: 'NC',
  DS: 'DB',
  OB: 'DB',
  WO: 'KH',
  SK: 'SG',
  KIA: 'KA',
  HT: 'KA',
};

const SELECTABLE_TEAM_CODES = ['LG', 'HH', 'LT', 'KT', 'SS', 'NC', 'DS', 'WO', 'SK', 'KIA'];
const SEASON_YEAR = 2026;
const SEASON_START = `${SEASON_YEAR}-01-01`;
const SEASON_END = `${SEASON_YEAR}-12-31`;
const TODAY = getTodayKey();
const INITIAL_DATE = TODAY >= SEASON_START && TODAY <= SEASON_END ? TODAY : SEASON_START;
const DAYS = getYearDays(SEASON_YEAR);

const GAMES = {
  '2026-06-30': [
    { id: 'lg-hh', away: 'LG', home: 'HH', time: '18:30', venue: '대전', weather: '맑음 27°' },
    { id: 'lt-kt', away: 'LT', home: 'KT', time: '18:30', venue: '수원', weather: '구름 26°' },
    { id: 'ss-nc', away: 'SS', home: 'NC', time: '18:30', venue: '창원', weather: '구름 25°' },
    { id: 'ds-wo', away: 'DS', home: 'WO', time: '18:30', venue: '고척', weather: '실내' },
    { id: 'sk-kia', away: 'SK', home: 'KIA', time: '18:30', venue: '광주', weather: '비 24°' },
  ],
  '2026-07-01': [
    { id: 'hh-lg', away: 'HH', home: 'LG', time: '18:30', venue: '잠실', weather: '맑음 28°' },
    { id: 'kt-lt', away: 'KT', home: 'LT', time: '18:30', venue: '사직', weather: '구름 25°' },
    { id: 'nc-ss', away: 'NC', home: 'SS', time: '18:30', venue: '대구', weather: '맑음 27°' },
  ],
  '2026-07-02': [
    { id: 'lg-sk', away: 'LG', home: 'SK', time: '18:30', venue: '인천', weather: '구름 24°' },
    { id: 'kia-hh', away: 'KIA', home: 'HH', time: '18:30', venue: '대전', weather: '맑음 28°' },
    { id: 'wo-ds', away: 'WO', home: 'DS', time: '18:30', venue: '잠실', weather: '구름 27°' },
  ],
};

const LIVE_FEEDS = {
  'lg-hh': {
    status: '경기 전',
    inning: '18:30 예정',
    score: { away: 0, home: 0 },
    bases: [false, false, false],
    outs: 0,
    pitcher: '류현진',
    batter: '홍창기',
    headline: '라인업 발표 전입니다. 경기 시작 후 타석별 문자중계가 갱신됩니다.',
    timeline: [
      { time: '17:45', label: '라인업 대기', text: '양 팀 선발 라인업 확인 중' },
      { time: '17:30', label: '선발 예고', text: 'LG 선발 엔스, 한화 선발 류현진' },
      { time: '16:50', label: '구장 상태', text: '대전구장 정상 진행 예정' },
    ],
  },
  'hh-lg': {
    status: 'LIVE',
    inning: '5회말',
    score: { away: 2, home: 3 },
    bases: [true, false, true],
    outs: 1,
    pitcher: '문동주',
    batter: '오지환',
    headline: '오지환이 2루타 하나를 추가하면 개인 통산 300 2루타에 도달합니다.',
    timeline: [
      { time: '20:12', label: '타석', text: '오지환 타석, 1사 1·3루' },
      { time: '20:08', label: '안타', text: '문보경 우전 안타, LG 1·3루 기회' },
      { time: '19:55', label: '득점', text: 'LG 희생플라이로 3-2 역전' },
      { time: '19:41', label: '교체', text: '한화 불펜 준비 시작' },
    ],
  },
  'lg-sk': {
    status: '경기 전',
    inning: '18:30 예정',
    score: { away: 0, home: 0 },
    bases: [false, false, false],
    outs: 0,
    pitcher: '김광현',
    batter: '홍창기',
    headline: 'SSG전 시작 후 실시간 기록 트리거를 확인합니다.',
    timeline: [
      { time: '17:20', label: '프리뷰', text: 'LG 원정 경기 기록 후보 2건 대기' },
      { time: '16:40', label: '구장', text: '인천 경기 정상 진행 예정' },
    ],
  },
};

const DEFAULT_LIVE_FEED = {
  status: '경기 전',
  inning: '18:30 예정',
  score: { away: 0, home: 0 },
  bases: [false, false, false],
  outs: 0,
  pitcher: '선발 투수',
  batter: '1번 타자',
  headline: '공식 데이터 연동 전까지는 자체 계산 데모 피드로 표시됩니다.',
  timeline: [
    { time: '17:30', label: '대기', text: '문자중계 데이터 연결 준비 중' },
    { time: '16:30', label: '일정', text: '경기 시작 전 상태입니다.' },
  ],
};

const RECORD_INPUTS = [
  {
    id: 1, date: '2026-06-30', game: 'lg-hh', team: 'HH', player: '문현빈', role: '타자',
    milestone: 100, current: 98, unit: '안타', title: '개인 통산 100안타', recent: [1, 2, 0, 2, 1],
    season: { 경기: 72, 타율: '0.312', 안타: 87, 홈런: 8, 타점: 39 }, note: '최근 5경기에서 6안타를 기록 중이에요.',
  },
  {
    id: 2, date: '2026-06-30', game: 'sk-kia', team: 'KIA', player: '최형우', role: '타자',
    milestone: 1700, current: 1699, unit: '타점', title: '개인 통산 1,700타점', recent: [0, 1, 2, 0, 1],
    season: { 경기: 68, 타율: '0.286', 안타: 69, 홈런: 11, 타점: 48 }, note: '타점 1개를 추가하면 대기록에 도달해요.',
  },
  {
    id: 3, date: '2026-06-30', game: 'lt-kt', team: 'KT', player: '고영표', role: '투수',
    milestone: 1000, current: 995, unit: '이닝', title: '개인 통산 1,000이닝', recent: [6, 7, 5, 6, 7],
    season: { 경기: 15, 평균자책: '3.24', 승: 8, 패: 4, 이닝: '94.2' }, note: '선발 등판 시 5이닝을 소화하면 달성해요.',
  },
  {
    id: 4, date: '2026-06-30', game: 'ss-nc', team: 'SS', player: '구자욱', role: '타자',
    milestone: 150, current: 149, unit: '홈런', title: '개인 통산 150홈런', recent: [0, 0, 1, 0, 0],
    season: { 경기: 70, 타율: '0.329', 안타: 91, 홈런: 14, 타점: 52 }, note: '홈런 1개가 남았어요.',
  },
  {
    id: 5, date: '2026-06-30', game: 'ds-wo', team: 'DS', player: '곽빈', role: '투수',
    milestone: 50, current: 49, unit: '승', title: '개인 통산 50승', recent: [1, 0, 1, 0, 1],
    season: { 경기: 14, 평균자책: '3.61', 승: 7, 패: 5, 이닝: '82.1' }, note: '오늘 승리투수가 되면 50승을 채워요.',
  },
  {
    id: 6, date: '2026-06-30', game: 'lg-hh', team: 'LG', player: '홍창기', role: '타자',
    milestone: 500, current: 497, unit: '득점', title: '개인 통산 500득점', recent: [1, 0, 0, 2, 1],
    season: { 경기: 69, 타율: '0.301', 안타: 82, 홈런: 4, 득점: 51 }, note: '3득점이 필요해 오늘 달성 난도는 높은 편이에요.',
  },
  {
    id: 10, date: '2026-06-30', game: 'lg-hh', team: 'LG', player: '이영빈', role: '타자',
    milestone: 100, current: 99, unit: '안타', title: '개인 통산 100안타', recent: [0, 1, 0, 1, 0],
    season: { 경기: 62, 타율: '0.268', 안타: 99, 홈런: 2, 타점: 24 }, note: '실시간 문자중계에서 안타가 감지되면 바로 달성으로 바뀌는 테스트 카드입니다.',
  },
  {
    id: 7, date: '2026-07-01', game: 'hh-lg', team: 'LG', player: '오지환', role: '타자',
    milestone: 300, current: 299, unit: '개', title: '개인 통산 300 2루타', recent: [0, 1, 0, 0, 1],
    season: { 경기: 71, 타율: '0.274', 안타: 70, 홈런: 7, 타점: 35 }, note: '2루타 하나면 달성합니다.',
  },
  {
    id: 9, date: '2026-07-01', game: 'hh-lg', team: 'HH', player: '노시환', role: '타자',
    milestone: 500, current: 498, unit: '타점', title: '개인 통산 500타점', recent: [1, 0, 2, 1, 0],
    season: { 경기: 73, 타율: '0.291', 안타: 78, 홈런: 17, 타점: 55 }, note: 'LG전에서 2타점을 더하면 달성합니다.',
  },
  {
    id: 8, date: '2026-07-02', game: 'kia-hh', team: 'HH', player: '노시환', role: '타자',
    milestone: 150, current: 148, unit: '홈런', title: '개인 통산 150홈런', recent: [0, 1, 0, 1, 0],
    season: { 경기: 73, 타율: '0.291', 안타: 78, 홈런: 17, 타점: 55 }, note: '홈런 2개가 필요합니다.',
  },
];

const TEAM_RECORD_INPUTS = [
  {
    id: 101, scope: '구단', date: '2026-06-30', game: 'lg-hh', team: 'LG', entity: 'LG 트윈스',
    milestone: 2600, current: 2599, unit: '승', title: '구단 통산 2,600승', recent: [1, 0, 1, 1, 0],
    season: { 경기: 75, 승: 44, 패: 29, 무: 2, 순위: '2위' }, note: '오늘 승리하면 구단 통산 2,600승에 도달해요.',
  },
  {
    id: 102, scope: '구단', date: '2026-06-30', game: 'ss-nc', team: 'SS', entity: '삼성 라이온즈',
    milestone: 5200, current: 5198, unit: '홈런', title: '구단 통산 5,200홈런', recent: [1, 2, 0, 1, 1],
    season: { 경기: 74, 승: 39, 패: 33, 홈런: 81, 득점: 348 }, note: '팀 홈런 2개를 추가하면 달성하는 기록이에요.',
  },
  {
    id: 103, scope: '구단', date: '2026-07-01', game: 'hh-lg', team: 'HH', entity: '한화 이글스',
    milestone: 2400, current: 2399, unit: '승', title: '구단 통산 2,400승', recent: [1, 1, 0, 1, 0],
    season: { 경기: 76, 승: 42, 패: 31, 무: 3, 순위: '3위' }, note: '승리 하나가 남아 있어요.',
  },
  {
    id: 104, scope: '구단', date: '2026-07-01', game: 'hh-lg', team: 'LG', entity: 'LG 트윈스',
    milestone: 9500, current: 9498, unit: '안타', title: '구단 통산 9,500안타', recent: [9, 12, 7, 11, 8],
    season: { 경기: 75, 승: 44, 패: 29, 무: 2, 순위: '2위' }, note: '팀 안타 2개를 추가하면 달성하는 기록이에요.',
  },
];

const VENUE_RECORD_INPUTS = [
  {
    id: 201, scope: '구장', date: '2026-06-30', game: 'lg-hh', team: 'HH', entity: '대전구장', venue: '대전',
    milestone: 1800, current: 1799, unit: '홈런', title: '구장 통산 1,800홈런', recent: [2, 1, 0, 3, 1],
    season: { 경기: 37, 홈런: 76, 득점: 341, 안타: 692, 평균득점: '9.2' }, note: '오늘 양 팀 합계 홈런 1개가 나오면 달성해요.',
  },
  {
    id: 202, scope: '구장', date: '2026-06-30', game: 'ds-wo', team: 'WO', entity: '고척돔', venue: '고척',
    milestone: 5000, current: 4994, unit: '득점', title: '구장 통산 5,000득점', recent: [7, 4, 9, 5, 8],
    season: { 경기: 36, 홈런: 61, 득점: 326, 안타: 641, 평균득점: '9.1' }, note: '오늘 양 팀 합계 6득점이 나오면 달성해요.',
  },
  {
    id: 203, scope: '구장', date: '2026-07-02', game: 'lg-sk', team: 'SK', entity: '인천구장', venue: '인천',
    milestone: 12000, current: 11992, unit: '안타', title: '구장 통산 12,000안타', recent: [14, 9, 17, 12, 11],
    season: { 경기: 38, 홈런: 72, 득점: 337, 안타: 668, 평균득점: '8.9' }, note: '양 팀 합계 8안타가 필요해요.',
  },
  {
    id: 204, scope: '구장', date: '2026-07-01', game: 'hh-lg', team: 'LG', entity: '잠실구장', venue: '잠실',
    milestone: 7000, current: 6997, unit: '득점', title: '잠실 통산 7,000득점', recent: [6, 5, 9, 4, 7],
    season: { 경기: 39, 홈런: 58, 득점: 329, 안타: 684, 평균득점: '8.4' }, note: '양 팀 합계 3득점이 더 나오면 달성해요.',
  },
];

const ALL_RECORDS = [...RECORD_INPUTS, ...TEAM_RECORD_INPUTS, ...VENUE_RECORD_INPUTS];
const ACTIVE_RECORDS = WEEKLY_RECORDS;

function isRecordActiveOnDate(record, date) {
  if (record.weekStart && record.weekEnd) return record.weekStart <= date && date <= record.weekEnd;
  return record.date === date;
}

function getRecordState(record, liveDelta = 0) {
  const current = record.current + liveDelta;
  const remaining = Math.max(record.milestone - current, 0);
  const recentAverage = record.recent.reduce((sum, value) => sum + value, 0) / record.recent.length;
  const likelihood = remaining === 0 ? '달성' : remaining <= Math.max(1, recentAverage) ? '매우 유력' : remaining <= Math.max(2, recentAverage * 2) ? '주목' : '도전';
  const key = likelihood === '매우 유력' ? 'hot' : likelihood === '주목' ? 'watch' : likelihood === '달성' ? 'done' : 'try';
  return { current, remaining, likelihood, key, progress: Math.min((current / record.milestone) * 100, 100) };
}

function formatRecordNumber(value) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function formatRecordValue(record, state, field) {
  if ((record.liveDelta || 0) > 0) return formatRecordNumber(state[field]);
  if (field === 'current') return record.currentText || formatRecordNumber(state.current);
  return record.remainingText || formatRecordNumber(state.remaining);
}

function getRecordStatKey(record) {
  const title = record.title || '';
  const unit = record.unit || '';
  if (unit === '개' && title.includes('2루타')) return ['doubles', '2루타'];
  if (unit === '개' && title.includes('3루타')) return ['triples', '3루타'];
  if (unit === '안타' || title.includes('안타')) return ['hits', '안타'];
  if (unit === '홈런' || title.includes('홈런')) return ['homeRuns', '홈런'];
  if (unit === '타점' || title.includes('타점')) return ['rbi', '타점'];
  if (unit === '득점' || title.includes('득점')) return ['runs', '득점'];
  if (unit === '도루' || title.includes('도루')) return ['steals', '도루'];
  if (unit === '탈삼진' || title.includes('탈삼진')) return ['strikeouts', '탈삼진'];
  if (unit === '루타' || title.includes('루타')) return ['totalBases', '루타'];
  if (record.title.includes('2루타')) return ['doubles', '2루타'];
  if (record.title.includes('3루타')) return ['triples', '3루타'];
  if (record.unit === '안타' || record.title.includes('안타')) return ['hits', '안타'];
  if (record.unit === '홈런' || record.title.includes('홈런')) return ['homeRuns', '홈런'];
  if (record.unit === '타점' || record.title.includes('타점')) return ['rbi', '타점'];
  if (record.unit === '득점' || record.title.includes('득점')) return ['runs', '득점'];
  if (record.unit === '도루' || record.title.includes('도루')) return ['steals', '도루'];
  if (record.unit === '삼진' || record.title.includes('삼진')) return ['strikeouts', '삼진'];
  return [null, ''];
}

function getRecordLiveDelta(record, liveStats) {
  const [statKey, label] = getRecordStatKey(record);
  if (!statKey || !liveStats?.players?.length) return { delta: 0, label };

  if (record.player) {
    const player = liveStats.players.find((item) => item.name === record.player);
    return { delta: player?.[statKey] || 0, label };
  }

  if (record.scope === '구단' || record.scope === '팀') {
    const delta = liveStats.players
      .filter((item) => isSameTeam(item.team, record.team))
      .reduce((sum, item) => sum + (item[statKey] || 0), 0);
    return { delta, label };
  }

  if (record.scope === '구장') {
    const delta = liveStats.players.reduce((sum, item) => sum + (item[statKey] || 0), 0);
    return { delta, label };
  }

  return { delta: 0, label };
}

function getTeam(code) {
  const normalizedCode = TEAM_NAME_TO_CODE[code] || code;
  return TEAMS[normalizedCode] || { name: code || '-', city: '', color: '#555b66' };
}

function getTeamCode(codeOrName) {
  return TEAM_NAME_TO_CODE[codeOrName] || codeOrName;
}

function isSameTeam(left, right) {
  return getTeamCode(left) === getTeamCode(right) || getTeam(left).name === getTeam(right).name;
}

function TeamMark({ code, small = false }) {
  const team = getTeam(code);
  const teamCode = getTeamCode(code);
  const label = TEAM_BADGE_LABELS[teamCode] || TEAM_BADGE_LABELS[code] || String(teamCode || '--').slice(0, 2);
  return (
    <span className={`team-mark ${small ? 'small' : ''}`} style={{ '--team-color': team.color }} role="img" aria-label={`${team.name} 팀 배지`}>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}

function getOpponent(game, favoriteTeam) {
  if (!game) return null;
  if (game.away === favoriteTeam) return game.home;
  if (game.home === favoriteTeam) return game.away;
  return null;
}

function RecordMark({ record }) {
  if (record.scope === '구장') {
    return <span className="venue-mark"><MapPin size={21} /></span>;
  }
  return <TeamMark code={record.team} />;
}

function getRecordTypeLabel(record) {
  if (record.scope === '팀') return '팀 기록';
  if (record.scope === '구단') return '구단 기록';
  if (record.scope === '구장') return '구장 기록';
  return record.role || '선수 기록';
}

function getRecordGameLabel(record, game) {
  if (record.gameLabel) return record.gameLabel;
  if (record.weekStart && record.weekEnd) {
    return `${Number(record.weekStart.slice(5, 7))}.${Number(record.weekStart.slice(8))}-${Number(record.weekEnd.slice(5, 7))}.${Number(record.weekEnd.slice(8))} 주간 예상`;
  }
  if (!record.game || game.away === game.home) return getTeam(record.team).name;
  return `${getTeam(game.away).name} vs ${getTeam(game.home).name}`;
}

function GameCard({ game, selected, favorite, onSelect }) {
  const awayTeam = getTeam(game.away);
  const homeTeam = getTeam(game.home);

  return (
    <button className={`game-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(game.id)}>
      <span className="game-meta"><Clock3 size={13} /> {game.time} · {game.venue}</span>
      <span className="matchup">
        <span><TeamMark code={game.away} small /> <b>{game.awayName || awayTeam.name}</b></span>
        <em>vs</em>
        <span><TeamMark code={game.home} small /> <b>{game.homeName || homeTeam.name}</b></span>
      </span>
      <span className="weather">{game.weather}</span>
      {favorite && <Heart className="favorite-dot" size={14} fill="currentColor" />}
    </button>
  );
}

function RecordLineupCard({ game, selected, onSelect }) {
  const awayTeam = getTeam(game.away);
  const homeTeam = getTeam(game.home);

  return (
    <button className={`lineup-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(game.id)}>
      <span className="game-meta"><Clock3 size={13} /> {game.time} · {game.venue}</span>
      <span className="lineup-matchup">
        <span><TeamMark code={game.away} small /><b>{game.awayName || awayTeam.name}</b></span>
        <em>vs</em>
        <span><TeamMark code={game.home} small /><b>{game.homeName || homeTeam.name}</b></span>
      </span>
    </button>
  );
}

function buildLiveFeed(game, liveGame) {
  if (!liveGame?.state && !game?.kboId) return null;

  const state = liveGame?.state || {
    SECTION_ID: game.state,
    INN_NO: game.raw?.GAME_INN_NO,
    TB_NM: game.raw?.GAME_TB_SC_NM,
    A_SCORE_CN: game.score?.away || 0,
    H_SCORE_CN: game.score?.home || 0,
    OUT_CN: game.current?.outs || 0,
    BASE_SC: game.current?.bases?.map((occupied, index) => (occupied ? String(index + 1) : '')).join('') || '',
  };
  const events = liveGame?.textcast || [];
  const latestEvent = events[0];
  const section = String(state.SECTION_ID);
  const status = section === '2' ? 'LIVE' : section === '3' ? '종료' : section === '4' ? '취소' : '경기 전';
  const bases = String(state.BASE_SC || '').split('');

  return {
    status,
    inning: section === '2' ? `${state.INN_NO}회${state.TB_NM}` : status,
    score: { away: Number(state.A_SCORE_CN || game.score?.away || 0), home: Number(state.H_SCORE_CN || game.score?.home || 0) },
    bases: ['1', '2', '3'].map((base) => bases.includes(base)),
    outs: Number(state.OUT_CN || 0),
    pitcher: liveGame?.ground?.listDefense?.find((player) => String(player.POS_SC) === '1')?.P_NM || game.current?.pitcher || game.pitchers?.home || '-',
    batter: liveGame?.ground?.listHitter?.[0]?.P_NM || latestEvent?.batter || game.current?.batter || game.pitchers?.away || '-',
    headline: latestEvent?.text || (section === '1' ? `선발 예고: ${game.awayName || getTeam(game.away).name} ${game.pitchers?.away || '-'}, ${game.homeName || getTeam(game.home).name} ${game.pitchers?.home || '-'}` : '실시간 문자중계를 불러오는 중입니다.'),
    events,
    source: liveGame?.state ? 'KBO 모바일 실시간 JSON' : 'KBO 모바일 일정 JSON',
  };
}

function getPlateAppearanceRows(events) {
  const grouped = new Map();

  for (const event of events) {
    const key = event.paKey || event.id.split('-').slice(0, 4).join('-');
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        inning: event.inning,
        team: event.team,
        batter: event.batter,
        battingOrder: event.battingOrder,
        events: [],
      });
    }
    grouped.get(key).events.push(event);
  }

  return Array.from(grouped.values()).map((row) => {
    const resultEvent = [...row.events].reverse().find((event) => !/^(\d+)구/.test(event.text)) || row.events[row.events.length - 1];
    const pitches = row.events.filter((event) => /^(\d+)구/.test(event.text));
    const result = resultEvent?.text || '';

    return {
      ...row,
      pitchCount: pitches.length,
      result,
      badge: getTextcastBadge(result),
      scoring: row.events.some((event) => event.text.includes('홈인')),
    };
  });
}

function getTextcastBadge(text) {
  if (text.includes('교체')) return { label: '교체', type: 'neutral' };
  if (text.includes('홈런')) return { label: '홈런', type: 'hit' };
  if (text.includes('3루타')) return { label: '3루타', type: 'hit' };
  if (text.includes('2루타')) return { label: '2루타', type: 'hit' };
  if (text.includes('안타') || text.includes('1루타')) return { label: '1루타', type: 'hit' };
  if (text.includes('볼넷')) return { label: '볼넷', type: 'walk' };
  if (text.includes('몸에 맞는 볼')) return { label: '사구', type: 'walk' };
  if (text.includes('삼진')) return { label: 'KOUT', type: 'out' };
  if (text.includes('아웃')) return { label: 'OUT', type: 'out' };
  if (text.includes('홈인')) return { label: '득점', type: 'score' };
  return { label: '진행', type: 'neutral' };
}

function BaseDiamond({ bases }) {
  const baseItems = [
    { key: '2', label: '2루', occupied: bases[1] },
    { key: '3', label: '3루', occupied: bases[2] },
    { key: '1', label: '1루', occupied: bases[0] },
    { key: 'home', label: '홈', occupied: false },
  ];

  return (
    <div className="base-diamond" aria-label="주자 상황">
      <span className="field-line" />
      {baseItems.map((base) => (
        <span key={base.key} className={`base-node base-${base.key} ${base.occupied ? 'occupied' : ''}`}>
          {base.label}
        </span>
      ))}
    </div>
  );
}

function TextcastBoard({ feed }) {
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => {
    const groupedRows = getPlateAppearanceRows(feed.events || []);
    return filter === 'score' ? groupedRows.filter((row) => row.scoring) : groupedRows;
  }, [feed.events, filter]);

  if (!feed.events?.length) {
    return (
      <div className="textcast-empty">
        <p>경기 시작 후 타석별 문자중계가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="textcast-board">
      <div className="textcast-tabs" aria-label="문자중계 필터">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button>
        <button className={filter === 'score' ? 'active' : ''} onClick={() => setFilter('score')}>득점</button>
      </div>
      <div className="textcast-rows">
        {rows.map((row) => (
          <details key={row.key} className="textcast-row">
            <summary>
              <span className={`result-badge result-${row.badge.type}`}>{row.badge.label}</span>
              <span className="textcast-main">
                <b>{row.battingOrder}번타자</b>
                <span>| {row.batter} {row.pitchCount || row.events.length}구 {row.badge.label}</span>
              </span>
              <span className="textcast-inning">{row.inning}</span>
            </summary>
            <div className="textcast-detail">
              <div className="textcast-mini-field">
                <BaseDiamond bases={feed.bases} />
                <span>{feed.outs}OUT</span>
              </div>
              <div className="pitch-log">
                <b>{row.battingOrder}번타자 {row.batter}</b>
                {row.events.map((event, index) => (
                  <p key={`${event.id}-${index}`}>{event.text}</p>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function LiveGamePanel({ game, liveGame, showTextcast = true }) {
  if (!game) return null;
  const feed = buildLiveFeed(game, liveGame) || LIVE_FEEDS[game.id] || DEFAULT_LIVE_FEED;
  const awayTeam = getTeam(game.away);
  const homeTeam = getTeam(game.home);

  return (
    <section className="live-panel">
      <div className="live-scoreboard">
        <div>
          <span className={`live-status ${feed.status === 'LIVE' ? 'on' : ''}`}><Radio size={13} /> {feed.status}</span>
          <h2>{game.awayName || awayTeam.name} vs {game.homeName || homeTeam.name}</h2>
          <p>{feed.inning} · {game.venue} · {game.weather}</p>
        </div>
        <div className="score-box">
          <span><TeamMark code={game.away} small /> <b>{feed.score.away}</b></span>
          <em>:</em>
          <span><TeamMark code={game.home} small /> <b>{feed.score.home}</b></span>
        </div>
      </div>

      <div className="live-current">
        <BaseDiamond bases={feed.bases} />
        <div className="count-strip">
          <span>OUT <b>{feed.outs}</b></span>
          <span>투수 <b>{feed.pitcher}</b></span>
          <span>타자 <b>{feed.batter}</b></span>
        </div>
      </div>

      <div className="live-headline">
        <Activity size={16} />
        <p>{feed.headline}</p>
      </div>

      {showTextcast && <TextcastBoard feed={feed} />}
      {showTextcast && <p className="live-source-note">{feed.source ? `${feed.source}에서 가져온 개인용 실시간 피드입니다.` : '현재는 샘플 문자중계입니다. 실제 서비스에서는 허가된 경기 데이터 API 또는 자체 입력 피드로 교체해야 합니다.'}</p>}
    </section>
  );
}

function RecordCard({ record, onOpen }) {
  const state = getRecordState(record, record.liveDelta || 0);
  const game = (GAMES[record.date] || []).find((item) => item.id === record.game) || { away: record.team, home: record.team };
  const currentText = formatRecordValue(record, state, 'current');
  const remainingText = formatRecordValue(record, state, 'remaining');
  return (
    <button className={`record-card ${record.liveDelta ? 'live-linked' : ''}`} onClick={() => onOpen(record)}>
      <span className="record-topline">
        <span className={`chance chance-${state.key}`}>{state.likelihood}</span>
        <span className="record-game">{getRecordGameLabel(record, game)}</span>
      </span>
      <span className="player-row">
        <RecordMark record={record} />
        <span className="player-copy">
          <span className="player-name">{record.player || record.entity} <small>{getRecordTypeLabel(record)}</small></span>
          <strong>{record.title}</strong>
        </span>
        <ChevronRight size={20} />
      </span>
      <span className="progress-track"><span style={{ width: `${state.progress}%` }} /></span>
      {record.liveDelta > 0 && <span className="live-delta-badge">실시간 +{record.liveDelta}{record.liveStatLabel}</span>}
      <span className="progress-label">
        <span>현재 <b>{currentText}{record.unit}</b>{record.liveDelta > 0 && <em> 경기 전 {record.currentText || formatRecordNumber(record.current)}</em>}</span>
        <strong>{remainingText}{record.unit} 남음</strong>
      </span>
    </button>
  );
}

const STAT_LABELS = [
  ['hits', '안타'],
  ['doubles', '2루타'],
  ['triples', '3루타'],
  ['homeRuns', '홈런'],
  ['totalBases', '루타'],
  ['rbi', '타점'],
  ['runs', '득점'],
  ['steals', '도루'],
  ['strikeouts', '삼진'],
  ['walks', '볼넷'],
  ['hbp', '사구'],
];

function getFilteredLiveStats(stats, teamFilter) {
  if (!teamFilter || teamFilter === 'all') return stats;
  const players = (stats?.players || []).filter((player) => isSameTeam(player.team, teamFilter));
  return {
    ...stats,
    players,
    leaders: players.slice(0, 5),
  };
}

function emptyLiveTotals() {
  return Object.fromEntries(STAT_LABELS.map(([key]) => [key, 0]));
}

function makeTrackedLivePlayer(record, stats) {
  if (!record) return null;
  const players = stats?.players || [];

  if (record.player) {
    const player = players.find((item) => item.name === record.player && isSameTeam(item.team, record.team));
    return {
      ...emptyLiveTotals(),
      ...(player || {}),
      team: record.team,
      name: record.player,
      events: player?.events || [],
      total: player?.total || 0,
      tracked: true,
      trackingTitle: record.title,
    };
  }

  const teamPlayers = players.filter((player) => isSameTeam(player.team, record.team));
  const aggregate = {
    ...emptyLiveTotals(),
    team: record.team,
    name: record.entity || getTeam(record.team).name,
    events: [],
    total: 0,
    tracked: true,
    trackingTitle: record.title,
  };

  for (const player of teamPlayers) {
    for (const [key] of STAT_LABELS) aggregate[key] += player[key] || 0;
    aggregate.events.push(...(player.events || []).map((event) => ({ ...event, playerName: player.name })));
  }
  aggregate.total = STAT_LABELS.reduce((sum, [key]) => sum + aggregate[key], 0);
  return aggregate;
}

function getLivePlayerCards(stats, teamFilter, trackedRecord) {
  const filteredStats = getFilteredLiveStats(stats, teamFilter);
  const trackedPlayer = makeTrackedLivePlayer(trackedRecord, stats);
  const leaders = filteredStats?.leaders || [];
  if (!trackedPlayer) return leaders;

  const withoutDuplicate = leaders.filter((player) => !(player.name === trackedPlayer.name && isSameTeam(player.team, trackedPlayer.team)));
  return [trackedPlayer, ...withoutDuplicate].slice(0, 6);
}

function LivePlayerCard({ player }) {
  const chips = STAT_LABELS.filter(([key]) => player[key] > 0);
  const latestEvent = player.events?.[0];

  return (
    <article className={player.tracked ? 'tracked' : ''}>
      <div className="live-stat-player">
        <TeamMark code={player.team} small />
        <div>
          <b>{player.name}</b>
          <span>{getTeam(player.team).name}</span>
        </div>
      </div>
      <div className="live-stat-chips">
        {chips.length > 0 ? chips.map(([key, label]) => (
          <span key={key}>{label} {player[key]}</span>
        )) : <span className="muted-chip">감지 대기</span>}
      </div>
      {latestEvent ? (
        <p>{latestEvent.inning} · {latestEvent.playerName ? `${latestEvent.playerName} ` : ''}{latestEvent.text}</p>
      ) : (
        <p>{player.trackingTitle ? `${player.trackingTitle} 실시간 감지 대기 중` : '실시간 이벤트 대기 중'}</p>
      )}
    </article>
  );
}

function LiveStatsPanel({ stats, game, teamFilter, trackedRecord }) {
  if (!stats?.events) return null;
  const filteredStats = getFilteredLiveStats(stats, teamFilter);
  const playerCards = getLivePlayerCards(stats, teamFilter, trackedRecord);
  if (!filteredStats.players.length && !playerCards.length) return null;

  return (
    <section className="live-stats-panel">
      <div className="section-title">
        <div>
          <span className="eyebrow">LIVE RECORD ENGINE</span>
          <h3>{teamFilter === 'all' ? `${game.awayName || getTeam(game.away).name} vs ${game.homeName || getTeam(game.home).name}` : `${getTeam(teamFilter).name} 실시간 감지`}</h3>
        </div>
        <span>{filteredStats.players.length}명</span>
      </div>
      <div className="live-stat-list">
        {playerCards.map((player) => <LivePlayerCard key={`${player.team}-${player.name}`} player={player} />)}
      </div>
    </section>
  );
}

function RecordLiveStatus({ record, liveStats }) {
  const trackedPlayer = makeTrackedLivePlayer(record, liveStats);

  return (
    <div className="detail-section record-live-status">
      <div className="section-title">
        <h3>실시간 현황</h3>
        <span>LIVE RECORD ENGINE</span>
      </div>
      <div className="live-stat-list detail-live-stat-list">
        <LivePlayerCard player={trackedPlayer} />
      </div>
    </div>
  );
}

function DetailSheet({ record, liveStats, onClose }) {
  if (!record) return null;
  const state = getRecordState(record, record.liveDelta || 0);
  const currentText = formatRecordValue(record, state, 'current');
  const remainingText = formatRecordValue(record, state, 'remaining');
  const maxRecent = Math.max(...record.recent, 1);
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="detail-sheet" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="sheet-handle" />
        <button className="icon-button close-button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        <div className="detail-heading">
          <RecordMark record={record} />
          <div><span>{record.scope === '구장' ? `${record.venue} · 구장 기록` : `${TEAMS[record.team].name} · ${getRecordTypeLabel(record)}`}</span><h2>{record.player || record.entity}</h2></div>
        </div>
        <div className="milestone-callout">
          <span><Target size={18} /> 오늘의 도전 기록</span>
          <h3>{record.title}</h3>
          <p>현재 {currentText}{record.unit} <b>· {remainingText}{record.unit} 남음</b></p>
          {record.liveDelta > 0 && <p className="live-detail-delta">이번 경기에서 +{record.liveDelta}{record.liveStatLabel} 감지</p>}
        </div>
        <div className="detail-section">
          <div className="section-title"><h3>{record.scope === '구장' ? '구장 현황' : '기록 현황'}</h3><span>{record.sourceType === 'calculated' ? '자동 계산' : '문서 기준'}</span></div>
          <div className="stat-grid">
            {Object.entries(record.season).map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
          </div>
        </div>
        <div className="detail-section">
          <div className="section-title"><h3>최근 근황</h3><span>최근 5경기 · {record.unit}</span></div>
          <div className="mini-chart">
            {record.recent.map((value, index) => (
              <div key={index}><span style={{ height: `${Math.max(8, (value / maxRecent) * 68)}px` }} /><b>{value}</b><small>{index + 1}G</small></div>
            ))}
          </div>
          <p className="insight"><Sparkles size={16} /> {record.note}</p>
        </div>
        <RecordLiveStatus record={record} liveStats={liveStats} />
        <p className="demo-notice"><Info size={15} /> 기록 기준: {record.sourceType === 'calculated' ? 'Supabase 선수 스냅숏 자동 계산' : WEEKLY_RECORD_SOURCE}</p>
      </section>
    </div>
  );
}

function TeamSettings({ current, onSave, onClose }) {
  const [selected, setSelected] = useState(current);
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="team-sheet" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="sheet-handle" />
        <button className="icon-button close-button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        <h2>선호팀 설정</h2>
        <p>선택한 팀의 경기와 기록을 먼저 보여드려요.</p>
        <div className="team-grid">
          {SELECTABLE_TEAM_CODES.map((code) => {
            const team = getTeam(code);
            return (
            <button key={code} className={selected === code ? 'active' : ''} onClick={() => setSelected(code)}>
              <TeamMark code={code} /><span>{team.name}</span>{selected === code && <Check size={16} />}
            </button>
            );
          })}
        </div>
        <button className="primary-button" onClick={() => onSave(selected)}>선택 완료</button>
      </section>
    </div>
  );
}

function getGameFeed(game, liveGame) {
  if (!game) return null;
  return buildLiveFeed(game, liveGame) || LIVE_FEEDS[game.id] || DEFAULT_LIVE_FEED;
}

function FavoriteGameHero({ game, liveGame, favoriteTeam, recordCount, warningCount, onOpenGame, onOpenRecords }) {
  if (!game) {
    return (
      <section className="favorite-game-hero no-game">
        <span className="eyebrow">MY GAME</span>
        <h1>{getTeam(favoriteTeam).name} 경기가 없어요</h1>
        <p>다음 경기와 이번 주 예상 기록은 기록 탭에서 확인할 수 있어요.</p>
        <button className="home-secondary-button" onClick={() => onOpenRecords('favorite')}>이번 주 기록 보기</button>
      </section>
    );
  }

  const feed = getGameFeed(game, liveGame);
  const isPregame = feed.status === '경기 전';
  const awayName = game.awayName || getTeam(game.away).name;
  const homeName = game.homeName || getTeam(game.home).name;

  return (
    <section className="favorite-game-hero">
      <div className="hero-kicker">
        <span><Heart size={13} fill="currentColor" /> MY GAME</span>
        <b className={feed.status === 'LIVE' ? 'is-live' : ''}>{feed.inning}</b>
      </div>
      <button className="hero-score" onClick={onOpenGame}>
        <span className="hero-team"><TeamMark code={game.away} /><b>{awayName}</b></span>
        <strong>{isPregame ? '-' : feed.score.away}<em>:</em>{isPregame ? '-' : feed.score.home}</strong>
        <span className="hero-team"><TeamMark code={game.home} /><b>{homeName}</b></span>
      </button>
      <p className="hero-meta">{game.time} · {game.venue} · {game.weather}</p>
      <div className="hero-record-actions">
        <button onClick={() => onOpenRecords('favorite')}><Target size={16} /><span>우리 팀 도전</span><b>{recordCount}</b><ChevronRight size={16} /></button>
        <button onClick={() => onOpenRecords('opponent')}><ShieldAlert size={16} /><span>상대 달성 주의</span><b>{warningCount}</b><ChevronRight size={16} /></button>
      </div>
    </section>
  );
}

function CompactGameRow({ game, liveGame, favorite, onSelect }) {
  const feed = getGameFeed(game, liveGame);
  const isPregame = feed.status === '경기 전';
  return (
    <button className={`compact-game-row ${favorite ? 'favorite' : ''}`} onClick={onSelect}>
      <span className="compact-game-status"><b>{feed.inning}</b><small>{game.venue}</small></span>
      <span className="compact-team"><TeamMark code={game.away} small /><b>{game.awayName || getTeam(game.away).name}</b></span>
      <strong className="compact-score">{isPregame ? '-' : feed.score.away}</strong>
      <span className="compact-divider" />
      <strong className="compact-score">{isPregame ? '-' : feed.score.home}</strong>
      <span className="compact-team home"><b>{game.homeName || getTeam(game.home).name}</b><TeamMark code={game.home} small /></span>
      <ChevronRight size={17} />
    </button>
  );
}

function RadarRecordRow({ record, onOpen }) {
  const state = getRecordState(record, record.liveDelta || 0);
  return (
    <button className="radar-record-row" onClick={() => onOpen(record)}>
      <RecordMark record={record} />
      <span><b>{record.player || record.entity}</b><small>{record.title}</small></span>
      <strong className={state.remaining === 0 ? 'done' : ''}>{state.remaining === 0 ? '달성' : `${formatRecordValue(record, state, 'remaining')}${record.unit} 남음`}</strong>
    </button>
  );
}

function HomePage({ games, favoriteGame, favoriteTeam, liveGames, ourRecords, opponentRecords, onOpenGame, onOpenRecords, onOpenRecord }) {
  return (
    <section className="home-page">
      <FavoriteGameHero
        game={favoriteGame}
        liveGame={liveGames[favoriteGame?.id]}
        favoriteTeam={favoriteTeam}
        recordCount={ourRecords.length}
        warningCount={opponentRecords.length}
        onOpenGame={() => onOpenGame(favoriteGame?.id)}
        onOpenRecords={onOpenRecords}
      />

      <section className="home-section record-radar-section">
        <div className="section-title"><div><span className="eyebrow">RECORD RADAR</span><h2>오늘의 기록 매치업</h2></div><button onClick={() => onOpenRecords('favorite')}>전체 보기</button></div>
        <div className="radar-group">
          <div className="radar-heading"><span><Target size={16} /> 우리 팀 도전</span><b>{ourRecords.length}</b></div>
          {ourRecords.slice(0, 2).map((record) => <RadarRecordRow key={record.id} record={record} onOpen={onOpenRecord} />)}
          {ourRecords.length === 0 && <p className="radar-empty">오늘 확인할 우리 팀 기록이 없어요.</p>}
        </div>
        <div className="radar-group warning">
          <div className="radar-heading"><span><ShieldAlert size={16} /> 상대 달성 주의</span><b>{opponentRecords.length}</b></div>
          {opponentRecords.slice(0, 2).map((record) => <RadarRecordRow key={record.id} record={record} onOpen={onOpenRecord} />)}
          {opponentRecords.length === 0 && <p className="radar-empty">상대 팀의 임박 기록이 없어요.</p>}
        </div>
      </section>

      <section className="home-section today-games-section">
        <div className="section-title"><div><span className="eyebrow">TODAY'S GAMES</span><h2>오늘의 경기</h2></div><span>{games.length}경기</span></div>
        <div className="compact-game-list">
          {games.map((game) => <CompactGameRow key={game.id} game={game} liveGame={liveGames[game.id]} favorite={game.id === favoriteGame?.id} onSelect={() => onOpenGame(game.id)} />)}
        </div>
      </section>
    </section>
  );
}

function PowerPanel({ game, liveGame }) {
  const feed = getGameFeed(game, liveGame);
  const raw = game.raw || {};
  const finished = feed.status === '종료';
  const resultPitchers = [
    raw.W_PIT_P_NM && ['승리투수', raw.W_PIT_P_NM],
    raw.L_PIT_P_NM && ['패전투수', raw.L_PIT_P_NM],
    raw.SV_PIT_P_NM && ['세이브', raw.SV_PIT_P_NM],
  ].filter(Boolean);

  return (
    <section className="summary-tab-panel power-panel">
      <div className="power-matchup">
        {[
          { side: 'away', code: game.away, name: game.awayName || getTeam(game.away).name, rank: raw.T_RANK_NO, starter: game.pitchers?.away, score: feed.score.away },
          { side: 'home', code: game.home, name: game.homeName || getTeam(game.home).name, rank: raw.B_RANK_NO, starter: game.pitchers?.home, score: feed.score.home },
        ].map((team) => (
          <article key={team.side}>
            <TeamMark code={team.code} />
            <strong>{team.name}</strong>
            <span>{team.rank ? `${team.rank}위` : '순위 정보 없음'}</span>
            <dl><dt>선발</dt><dd>{team.starter || '-'}</dd></dl>
            {finished && <b>{team.score}점</b>}
          </article>
        ))}
        <em>VS</em>
      </div>
      <div className="game-facts">
        <div><span>경기 상태</span><b>{feed.status}</b></div>
        <div><span>구장</span><b>{game.venue}</b></div>
        <div><span>날씨</span><b>{game.weather || '-'}</b></div>
        <div><span>시작</span><b>{game.time}</b></div>
      </div>
      {resultPitchers.length > 0 && (
        <div className="decision-pitchers">
          {resultPitchers.map(([label, name]) => <span key={label}><small>{label}</small><b>{name}</b></span>)}
        </div>
      )}
    </section>
  );
}

function LineupPanel({ game, liveGame }) {
  const [side, setSide] = useState('away');
  const roster = liveGame?.records?.[side];
  const teamCode = side === 'away' ? game.away : game.home;
  const teamName = side === 'away' ? (game.awayName || getTeam(game.away).name) : (game.homeName || getTeam(game.home).name);
  const hitters = roster?.hitters || [];
  const pitchers = roster?.pitchers || [];

  return (
    <section className="summary-tab-panel lineup-panel">
      <div className="lineup-team-tabs" aria-label="라인업 팀 선택">
        {[
          ['away', game.away, game.awayName || getTeam(game.away).name],
          ['home', game.home, game.homeName || getTeam(game.home).name],
        ].map(([id, code, name]) => (
          <button key={id} className={side === id ? 'active' : ''} onClick={() => setSide(id)}><TeamMark code={code} small />{name}</button>
        ))}
      </div>
      <div className="lineup-section-heading"><span><TeamMark code={teamCode} small /><b>{teamName} 타순</b></span><small>{hitters.length ? `${hitters.length}명` : '발표 대기'}</small></div>
      {hitters.length > 0 ? (
        <ol className="batting-order-list">
          {hitters.map((player) => (
            <li key={`${player.RANK}-${player.P_ID}`}>
              <b>{player.RANK}</b>
              <span><strong>{player.NAME}</strong><small>{player.SPAN || '-'}</small></span>
              {Number(player.CHANGE) > 0 && <em>교체</em>}
            </li>
          ))}
        </ol>
      ) : <p className="lineup-empty">아직 공식 라인업이 발표되지 않았어요.</p>}
      <div className="lineup-section-heading pitcher-heading"><span><Radio size={16} /><b>투수 명단</b></span><small>{pitchers.length ? `${pitchers.length}명` : ''}</small></div>
      <div className="pitcher-roster">
        {(pitchers.length ? pitchers : [{ P_ID: 'starter', NAME: game.pitchers?.[side] || '-', SPAN: '선발' }]).map((player) => (
          <span key={player.P_ID || `${player.RANK}-${player.NAME}`}><b>{player.NAME}</b><small>{player.SPAN || '-'}</small></span>
        ))}
      </div>
    </section>
  );
}

function GameCenter({ games, liveGame, selectedLiveGame, favoriteTeam, detailOpen, onSelectGame, onBack }) {
  const [summaryTab, setSummaryTab] = useState('power');

  useEffect(() => {
    setSummaryTab('power');
  }, [liveGame?.id, detailOpen]);

  if (detailOpen && liveGame) {
    const feed = getGameFeed(liveGame, selectedLiveGame);
    return (
      <section className="game-center-page game-summary-page">
        <button className="game-summary-back" onClick={onBack}><ArrowLeft size={18} /> 경기센터</button>
        <div className="page-heading"><span className="eyebrow">GAME SUMMARY</span><h1>경기 요약</h1><p>{liveGame.awayName || getTeam(liveGame.away).name} vs {liveGame.homeName || getTeam(liveGame.home).name}</p></div>
        <LiveGamePanel game={liveGame} liveGame={selectedLiveGame} showTextcast={false} />
        <nav className="game-summary-tabs" aria-label="경기 요약 메뉴">
          {[
            ['power', '전력', Activity],
            ['lineup', '라인업', CircleUserRound],
            ['relay', '중계', Radio],
          ].map(([id, label, Icon]) => <button key={id} className={summaryTab === id ? 'active' : ''} onClick={() => setSummaryTab(id)}><Icon size={16} />{label}</button>)}
        </nav>
        {summaryTab === 'power' && <PowerPanel game={liveGame} liveGame={selectedLiveGame} />}
        {summaryTab === 'lineup' && <LineupPanel game={liveGame} liveGame={selectedLiveGame} />}
        {summaryTab === 'relay' && (
          <section className="summary-tab-panel relay-panel">
            <TextcastBoard feed={feed} />
            <p className="live-source-note">{feed.source ? `${feed.source}에서 가져온 개인용 실시간 피드입니다.` : '현재는 샘플 문자중계입니다.'}</p>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="game-center-page">
      <div className="page-heading"><span className="eyebrow">GAME CENTER</span><h1>경기센터</h1><p>오늘 경기 스코어를 확인하고 경기를 선택해보세요.</p></div>
      <div className="game-center-list">
        {games.map((game) => <CompactGameRow key={game.id} game={game} liveGame={game.id === liveGame?.id ? selectedLiveGame : null} favorite={game.away === favoriteTeam || game.home === favoriteTeam} onSelect={() => onSelectGame(game.id)} />)}
      </div>
    </section>
  );
}

function MyPage({ favoriteTeam, onOpenSettings, recordSourceLabel }) {
  const team = getTeam(favoriteTeam);
  return (
    <section className="my-page">
      <div className="page-heading"><span className="eyebrow">MY BASEBALL</span><h1>내 야구</h1><p>응원팀을 기준으로 경기와 기록을 정리합니다.</p></div>
      <button className="my-team-card" onClick={onOpenSettings}>
        <TeamMark code={favoriteTeam} />
        <span><small>선호팀</small><b>{team.name}</b><em>{team.city}</em></span>
        <Settings2 size={20} />
      </button>
      <section className="my-setting-list">
        <button><span><Target size={18} /> 기록 알림</span><b>임박·달성</b><ChevronRight size={18} /></button>
        <button><span><Info size={18} /> 데이터 기준</span><b>{recordSourceLabel}</b><ChevronRight size={18} /></button>
      </section>
      <p className="my-data-note">{recordSourceLabel}<br />일정과 문자중계는 실시간 프록시 연결 상태에 따라 갱신됩니다.</p>
    </section>
  );
}

function App() {
  const liveApiEnabled = hasLiveApi();
  const supabaseEnabled = hasSupabaseRecords();
  const [date, setDate] = useState(INITIAL_DATE);
  const [favoriteTeam, setFavoriteTeam] = useState(() => localStorage.getItem('favoriteTeamV2') || 'LG');
  const [liveGameId, setLiveGameId] = useState('');
  const [liveSchedule, setLiveSchedule] = useState(null);
  const [liveGames, setLiveGames] = useState({});
  const [teamView, setTeamView] = useState('favorite');
  const [scope, setScope] = useState('전체');
  const [role, setRole] = useState('전체');
  const [recordStatus, setRecordStatus] = useState('전체');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState('home');
  const [gameDetailOpen, setGameDetailOpen] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [calculatedRecords, setCalculatedRecords] = useState([]);
  const [recordDataError, setRecordDataError] = useState('');

  const games = liveSchedule?.date === date ? liveSchedule.games : (GAMES[date] || []);
  const favoriteGame = games.find((game) => game.away === favoriteTeam || game.home === favoriteTeam);
  const opponentTeam = getOpponent(favoriteGame, favoriteTeam);
  const liveGame = games.find((game) => game.id === liveGameId) || favoriteGame || games[0];
  const selectedLiveGame = liveGames[liveGame?.id];
  const liveStats = useMemo(() => calculateLiveStats(selectedLiveGame?.textcast || []), [selectedLiveGame?.textcast]);
  const liveStatsTeamFilter = teamView === 'opponent' ? opponentTeam : favoriteTeam;
  const recordsHeading = teamView === 'opponent' ? '상대 달성 주의' : '우리 팀 도전';
  const dateLabel = date === TODAY ? '오늘' : `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`;
  const selectedDay = DAYS.find((day) => day.key === date);
  const liveBadge = liveSchedule?.date === date
    ? 'LIVE DATA'
    : liveApiEnabled && liveError
      ? '연결 오류'
      : liveApiEnabled
        ? '연결 중'
        : 'DEMO';

  const recordInputs = calculatedRecords.length > 0 ? calculatedRecords : ACTIVE_RECORDS;
  const recordSourceLabel = calculatedRecords.length > 0 ? 'Supabase 자동 계산 기록' : WEEKLY_RECORD_SOURCE;
  const activeRecords = useMemo(() => recordInputs
    .filter((record) => isRecordActiveOnDate(record, date))
    .map((record) => {
      const live = getRecordLiveDelta(record, liveStats);
      return { ...record, liveDelta: live.delta, liveStatLabel: live.label };
    })
    .sort((a, b) => getRecordState(a, a.liveDelta).remaining - getRecordState(b, b.liveDelta).remaining),
  [date, liveStats, recordInputs]);

  const ourRecords = useMemo(() => activeRecords.filter((record) => isSameTeam(record.team, favoriteTeam)), [activeRecords, favoriteTeam]);
  const opponentRecords = useMemo(() => activeRecords.filter((record) => opponentTeam && isSameTeam(record.team, opponentTeam)), [activeRecords, opponentTeam]);

  const records = useMemo(() => activeRecords
    .filter((record) => scope === '전체' || (record.scope || '선수') === scope)
    .filter((record) => {
      if (teamView === 'opponent') return opponentTeam ? isSameTeam(record.team, opponentTeam) : false;
      return isSameTeam(record.team, favoriteTeam);
    })
    .filter((record) => scope === '팀' || role === '전체' || record.role === role)
    .filter((record) => {
      if (recordStatus === '전체') return true;
      const state = getRecordState(record, record.liveDelta || 0);
      if (recordStatus === '달성') return state.remaining === 0;
      if (recordStatus === '추적 중') return record.liveDelta > 0 && state.remaining > 0;
      return ['hot', 'watch'].includes(state.key) && state.remaining > 0;
    })
    .filter((record) => !query || `${record.player || ''} ${record.entity || ''} ${record.title} ${getTeam(record.team).name}`.includes(query.trim())),
  [activeRecords, scope, teamView, opponentTeam, favoriteTeam, role, recordStatus, query]);
  const detailRecord = detail ? activeRecords.find((record) => record.id === detail.id) || detail : null;

  useEffect(() => {
    setLiveGameId((favoriteGame || games[0])?.id || '');
    setTeamView('favorite');
    setGameDetailOpen(false);
  }, [date, favoriteTeam, liveSchedule?.rawDate]);

  useEffect(() => {
    if (!supabaseEnabled) return undefined;
    let cancelled = false;

    fetchCalculatedRecords(date)
      .then((records) => {
        if (!cancelled) {
          setCalculatedRecords(records);
          setRecordDataError('');
        }
      })
      .catch((error) => {
        console.warn('Calculated records load failed', error);
        if (!cancelled) {
          setCalculatedRecords([]);
          setRecordDataError('자동 계산 기록을 불러오지 못해 주간 자료를 표시합니다.');
        }
      });

    return () => { cancelled = true; };
  }, [date, supabaseEnabled]);

  useEffect(() => {
    if (!liveApiEnabled) return undefined;

    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const schedule = await fetchKboSchedule(date);
        if (!cancelled) {
          setLiveSchedule(schedule);
          setLiveError('');
        }
      } catch (error) {
        console.warn('KBO schedule load failed', error);
        if (!cancelled) setLiveError('일정 데이터를 불러오지 못했어요.');
      }
    };

    loadSchedule();
    const timer = window.setInterval(loadSchedule, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [date, liveApiEnabled]);

  useEffect(() => {
    if (!liveApiEnabled || !liveGame?.kboId) return undefined;

    let cancelled = false;
    const loadLiveGame = async () => {
      try {
        const inning = liveGame.raw?.GAME_INN_NO ? String(liveGame.raw.GAME_INN_NO) : '1';
        const data = await fetchKboLiveGame(liveGame.kboId, inning);
        if (!cancelled) {
          setLiveGames((current) => ({ ...current, [liveGame.id]: data }));
          setLiveError('');
        }
      } catch (error) {
        console.warn('KBO live game load failed', error);
        if (!cancelled) setLiveError('경기 중계 데이터를 불러오지 못했어요.');
      }
    };

    loadLiveGame();
    const timer = window.setInterval(loadLiveGame, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveApiEnabled, liveGame?.id, liveGame?.kboId, liveGame?.raw?.GAME_INN_NO]);

  const changeDate = (direction) => {
    const index = DAYS.findIndex((day) => day.key === date);
    setDate(DAYS[Math.min(Math.max(index + direction, 0), DAYS.length - 1)].key);
  };

  const saveTeam = (team) => {
    setFavoriteTeam(team);
    localStorage.setItem('favoriteTeamV2', team);
    setSettingsOpen(false);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const openGame = (gameId) => {
    if (gameId) setLiveGameId(gameId);
    setGameDetailOpen(true);
    setMobileView('game');
    setDetail(null);
    scrollTop();
  };

  const openRecords = (view = 'favorite') => {
    setTeamView(view);
    setLiveGameId(favoriteGame?.id || games[0]?.id || '');
    setMobileView('records');
    setDetail(null);
    setQuery('');
    scrollTop();
  };

  const changeView = (view) => {
    if (view === 'home' || view === 'records') setLiveGameId(favoriteGame?.id || games[0]?.id || '');
    if (view === 'game') setGameDetailOpen(false);
    setMobileView(view);
    setDetail(null);
    scrollTop();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-ball" /><span><b>기록앞에</b><small>오늘 만날 야구 기록</small></span></div>
        <button className="favorite-button" onClick={() => setSettingsOpen(true)}><TeamMark code={favoriteTeam} small /><span>{getTeam(favoriteTeam).name}</span><Settings2 size={16} /></button>
      </header>

      <main>
        <section className="date-bar">
          <button className="icon-button" onClick={() => changeDate(-1)} aria-label="이전 날짜" disabled={date === DAYS[0].key}><ArrowLeft size={19} /></button>
          <div className="date-selector">
            <CalendarDays size={18} />
            <span className="date-selector-copy"><b>{dateLabel} · {selectedDay?.day}요일</b><small>2026 전체</small></span>
            <input
              className="date-picker-input"
              type="date"
              aria-label="2026년 경기 날짜 선택"
              title="2026년 경기 날짜 선택"
              min={SEASON_START}
              max={SEASON_END}
              value={date}
              onChange={(event) => {
                const nextDate = event.target.value;
                if (nextDate >= SEASON_START && nextDate <= SEASON_END) setDate(nextDate);
              }}
            />
            <span className={`demo-badge ${liveError ? 'error' : ''}`}>{liveBadge}</span>
          </div>
          <button className="icon-button" onClick={() => changeDate(1)} aria-label="다음 날짜" disabled={date === DAYS[DAYS.length - 1].key}><ArrowRight size={19} /></button>
        </section>
        {liveError && <p className="live-error" role="status">{liveError} 잠시 후 자동으로 다시 연결합니다.</p>}
        {recordDataError && <p className="live-error" role="status">{recordDataError}</p>}

        <div className={mobileView === 'home' ? '' : 'view-hidden'}>
          <HomePage
            games={games}
            favoriteGame={favoriteGame}
            favoriteTeam={favoriteTeam}
            liveGames={liveGames}
            ourRecords={ourRecords}
            opponentRecords={opponentRecords}
            onOpenGame={openGame}
            onOpenRecords={openRecords}
            onOpenRecord={setDetail}
          />
        </div>

        <section className={`records-section ${mobileView !== 'records' ? 'view-hidden' : ''}`}>
          <div className="record-header">
            <div><span className="eyebrow">POSSIBLE RECORDS</span><h2>{recordsHeading} <b>{records.length}</b></h2></div>
            <button className="icon-button desktop-search-toggle" aria-label="검색"><Search size={19} /></button>
          </div>
          <p className="record-view-copy">{teamView === 'opponent' ? `상대팀 ${getTeam(opponentTeam).name}의 ${getTeam(favoriteTeam).name}전 달성 가능 기록이에요.` : `${getTeam(favoriteTeam).name}가 오늘 도전하는 기록이에요.`}</p>
          <div className="team-view-tabs perspective-tabs" aria-label="기록 관점">
            {[
              { id: 'favorite', label: '우리 팀 도전', icon: Target },
              { id: 'opponent', label: '상대 달성 주의', icon: ShieldAlert },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} className={teamView === id ? 'active' : ''} onClick={() => setTeamView(id)}><Icon size={16} />{label}</button>
            ))}
          </div>
          <div className="scope-tabs" aria-label="기록 범위">
            {[
              { id: '전체', label: '전체', icon: Sparkles },
              { id: '선수', label: '개인', icon: CircleUserRound },
              { id: '팀', label: '팀 기록', icon: Trophy },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} className={scope === id ? 'active' : ''} onClick={() => { setScope(id); setRole('전체'); setQuery(''); }}><Icon size={16} />{label}</button>
            ))}
          </div>
          <div className="tools-row">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="선수 또는 기록 검색" /></label>
            {scope !== '팀' && <div className="segmented" aria-label="선수 유형">
              {['전체', '타자', '투수'].map((item) => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}>{item}</button>)}
            </div>}
          </div>
          <div className="record-status-tabs" aria-label="기록 상태">
            {['전체', '임박', '추적 중', '달성'].map((item) => <button key={item} className={recordStatus === item ? 'active' : ''} onClick={() => setRecordStatus(item)}>{item}</button>)}
          </div>
          {records.length > 0 ? (
            <div className="record-list">{records.map((record) => <RecordCard key={record.id} record={record} onOpen={setDetail} />)}</div>
          ) : (
            <div className="empty-state"><SlidersHorizontal size={28} /><h3>조건에 맞는 기록이 없어요</h3><p>기록 범위나 상태 필터를 바꿔보세요.</p><button onClick={() => { setScope('전체'); setRole('전체'); setRecordStatus('전체'); setQuery(''); }}>필터 초기화</button></div>
          )}
        </section>

        <div className={mobileView === 'game' ? '' : 'view-hidden'}>
          <GameCenter
            games={games}
            liveGame={liveGame}
            selectedLiveGame={selectedLiveGame}
            favoriteTeam={favoriteTeam}
            detailOpen={gameDetailOpen}
            onSelectGame={(gameId) => { setLiveGameId(gameId); setGameDetailOpen(true); scrollTop(); }}
            onBack={() => { setGameDetailOpen(false); scrollTop(); }}
          />
        </div>

        <div className={mobileView === 'my' ? '' : 'view-hidden'}>
          <MyPage favoriteTeam={favoriteTeam} onOpenSettings={() => setSettingsOpen(true)} recordSourceLabel={recordSourceLabel} />
        </div>
      </main>

      <footer><span>개인용 기록 검색 데모</span><p>기록 기준: {recordSourceLabel}. 일정과 문자중계는 KBO 모바일 데이터를 불러옵니다.</p></footer>

      <nav className="mobile-nav">
        <button className={mobileView === 'home' ? 'active' : ''} onClick={() => changeView('home')}><Home size={21} /><span>HOME</span></button>
        <button className={mobileView === 'records' ? 'active' : ''} onClick={() => changeView('records')}><Target size={21} /><span>기록</span></button>
        <button className={mobileView === 'game' ? 'active' : ''} onClick={() => changeView('game')}><CalendarDays size={21} /><span>경기</span></button>
        <button className={mobileView === 'my' ? 'active' : ''} onClick={() => changeView('my')}><CircleUserRound size={21} /><span>MY</span></button>
      </nav>

      <DetailSheet record={detailRecord} liveStats={liveStats} onClose={() => setDetail(null)} />
      {settingsOpen && <TeamSettings current={favoriteTeam} onSave={saveTeam} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
