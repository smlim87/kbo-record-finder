const WEEK_START = '2026-06-30';
const WEEK_END = '2026-07-05';
const BASE_DATE = '2026-07-01';

const TEAM_CODES = {
  LG: 'LG',
  한화: 'HH',
  롯데: 'LT',
  KT: 'KT',
  삼성: 'SS',
  NC: 'NC',
  두산: 'DS',
  키움: 'WO',
  SSG: 'SK',
  KIA: 'KIA',
};

const TEAM_NAMES = {
  LG: 'LG 트윈스',
  HH: '한화 이글스',
  LT: '롯데 자이언츠',
  KT: 'KT 위즈',
  SS: '삼성 라이온즈',
  NC: 'NC 다이노스',
  DS: '두산 베어스',
  WO: '키움 히어로즈',
  SK: 'SSG 랜더스',
  KIA: 'KIA 타이거즈',
};

function numberFromText(value) {
  const text = String(value).replace(/,/g, '').trim();
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(text);
}

function splitMilestone(label) {
  const award = label.startsWith('★');
  const cleanLabel = label.replace(/^★\s*/, '');
  const [, milestoneText, metric] = cleanLabel.match(/^([\d,]+)\s+(.+)$/) || [];
  return {
    award,
    label: cleanLabel,
    milestone: numberFromText(milestoneText),
    metric,
    unit: metric === '2루타' ? '개' : metric,
  };
}

function recentFor(metric, remaining, scope) {
  if (metric === '루타') return scope === '팀' ? [13, 16, 11, 15, 12] : [3, 5, 2, 4, 3];
  if (metric === '안타') return scope === '팀' ? [8, 11, 9, 12, 10] : [1, 2, 1, 0, 2];
  if (metric === '홈런') return scope === '팀' ? [1, 2, 0, 1, 1] : [0, 1, 0, 0, 1];
  if (metric === '타점') return scope === '팀' ? [4, 6, 3, 5, 4] : [0, 2, 1, 1, 2];
  if (metric === '득점') return [1, 0, 1, 1, 0];
  if (metric === '도루') return [0, 1, 0, 1, 0];
  if (metric === '탈삼진') return [4, 6, 5, 7, 4];
  if (metric === '이닝') return [5, 6, 5, 6, 5];
  return [0, 1, 0, 1, 1];
}

function makeTeamRecord(index, label, teamName, current, remaining, rank) {
  const milestone = splitMilestone(label);
  const team = TEAM_CODES[teamName] || teamName;
  return {
    id: `team-${index}`,
    scope: '팀',
    date: BASE_DATE,
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    game: '',
    team,
    entity: TEAM_NAMES[team] || teamName,
    milestone: milestone.milestone,
    current: numberFromText(current),
    currentText: current,
    remainingText: remaining,
    unit: milestone.unit,
    title: `팀 통산 ${milestone.label}`,
    recent: recentFor(milestone.metric, numberFromText(remaining), '팀'),
    season: {
      구분: '팀 예상기록',
      현재기록: current,
      잔여기록: remaining,
      비고: rank,
    },
    note: `첨부 문서 기준 ${rank} 달성 후보입니다. 남은 기록은 ${remaining}${milestone.unit}입니다.`,
  };
}

function roleFor(metric) {
  return ['홀드', '세이브', '이닝', '탈삼진'].includes(metric) ? '투수' : '타자';
}

function makePlayerRecord(index, label, player, teamName, current, remaining, rank = '') {
  const milestone = splitMilestone(label);
  const team = TEAM_CODES[teamName] || teamName;
  const remainingNumber = numberFromText(remaining);
  return {
    id: `player-${index}`,
    scope: '선수',
    date: BASE_DATE,
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    game: '',
    team,
    player,
    role: roleFor(milestone.metric),
    milestone: milestone.milestone,
    current: numberFromText(current),
    currentText: current,
    remainingText: remaining,
    unit: milestone.unit,
    title: `개인 통산 ${milestone.label}`,
    recent: recentFor(milestone.metric, remainingNumber, '선수'),
    season: {
      구분: milestone.award ? '기념상 예상기록' : '개인 예상기록',
      현재기록: current,
      잔여기록: remaining,
      비고: rank || '-',
    },
    note: `${player}(${teamName}) 문서 기준 달성 후보입니다. ${remaining}${milestone.unit}만 더하면 ${milestone.label}에 도달합니다.`,
  };
}

const TEAM_ROWS = [
  ['4,600 홈런', '한화', '4,588', '12', '3번째'],
  ['3,700 홈런', 'SSG', '3,688', '12', '7번째'],
  ['2,200 홈런', '키움', '2,196', '4', '9번째'],
  ['18,000 안타', 'NC', '17,989', '11', '10번째'],
  ['76,000 루타', '두산', '75,928', '72', '3번째'],
  ['75,000 루타', '롯데', '74,991', '9', '4번째'],
  ['27,000 타점', '삼성', '26,987', '13', '첫 번째'],
  ['4,900 도루', '삼성', '4,895', '5', '4번째'],
];

const PLAYER_ROWS = [
  ['130 홀드', '노경은', 'SSG', '127', '3', '7번째'],
  ['120 홀드', '한현희', '롯데', '117', '3', '12번째'],
  ['110 홀드', '원종현', '키움', '108', '2', '20번째'],
  ['★ 100 홀드', '임정호', 'NC', '97', '3', '22번째'],
  ['170 세이브', '김원중', '롯데', '167', '3', '10번째'],
  ['1,500 이닝', '우규민', 'KT', '1493 1/3', '6 2/3', '33번째'],
  ['1,200 이닝', '백정현', '삼성', '1189 1/3', '10 2/3', '56번째'],
  ['1,100 이닝', '이용찬', '두산', '1087 2/3', '12 1/3', '75번째'],
  ['1,100 탈삼진', '노경은', 'SSG', '1,090', '10', '31번째'],
  ['★ 1,000 탈삼진', '최원태', '삼성', '989', '11', '39번째'],
  ['177 홀드', '김진성', 'LG', '175', '2', '최다'],
  ['2,300 경기출장', '김현수', 'KT', '2,296', '4', '4번째'],
  ['★ 1,500 경기출장', '박동원', 'LG', '1,494', '6', '77번째'],
  ['1,400 경기출장', '최재훈', '한화', '1,394', '6', '97번째'],
  ['★ 1,000 경기출장', '하주석', '한화', '997', '3', '191번째'],
  ['5,000 타수', '서건창', '키움', '4,990', '10', '65번째'],
  ['★ 300 홈런', '나성범', 'KIA', '297', '3', '16번째'],
  ['★ 300 홈런', '양의지', '두산', '293', '7', ''],
  ['★ 200 홈런', '구자욱', '삼성', '193', '7', '37번째'],
  ['150 홈런', '박건우', 'NC', '146', '4', '65번째'],
  ['150 홈런', '최주환', '키움', '143', '7', ''],
  ['2,100 안타', '전준우', '롯데', '2,096', '4', '17번째'],
  ['1,800 안타', '김선빈', 'KIA', '1,796', '4', '29번째'],
  ['1,700 안타', '박민우', 'NC', '1,688', '12', '39번째'],
  ['1,600 안타', '박건우', 'NC', '1,596', '4', '46번째'],
  ['1,100 안타', '강백호', '한화', '1,095', '5', '113번째'],
  ['★ 1,000 안타', '고종욱', 'KIA', '992', '8', '126번째'],
  ['500 2루타', '김현수', 'KT', '492', '8', '2번째'],
  ['450 2루타', '최정', 'SSG', '446', '4', '6번째'],
  ['300 2루타', '김민성', '롯데', '299', '1', '36번째'],
  ['300 2루타', '허경민', 'KT', '295', '5', ''],
  ['300 2루타', '김선빈', 'KIA', '292', '8', ''],
  ['250 2루타', '박해민', 'LG', '249', '1', '61번째'],
  ['250 2루타', '채은성', '한화', '242', '8', ''],
  ['★ 4,500 루타', '최정', 'SSG', '4,492', '8', '2번째'],
  ['★ 4,000 루타', '김현수', 'KT', '3,972', '28', '4번째'],
  ['3,300 루타', '양의지', '두산', '3,295', '5', '12번째'],
  ['2,900 루타', '오지환', 'LG', '2,873', '27', '27번째'],
  ['2,800 루타', '구자욱', '삼성', '2,791', '9', '30번째'],
  ['2,200 루타', '허경민', 'KT', '2,180', '20', '60번째'],
  ['★ 2,000 루타', '한유섬', 'SSG', '1,984', '16', '76번째'],
  ['1,800 타점', '최형우', '삼성', '1,792', '8', '첫 번째'],
  ['1,100 타점', '손아섭', '두산', '1,098', '2', '18번째'],
  ['800 타점', '박건우', 'NC', '790', '10', '47번째'],
  ['700 타점', '김선빈', 'KIA', '691', '9', '67번째'],
  ['1,400 득점', '최형우', '삼성', '1,399', '1', '3번째'],
];

export const WEEKLY_RECORD_SOURCE = '2026 주간 예상 달성 기록(6.30~7.5).doc';
export const WEEKLY_RECORDS = [
  ...TEAM_ROWS.map((row, index) => makeTeamRecord(index + 1, ...row)),
  ...PLAYER_ROWS.map((row, index) => makePlayerRecord(index + 1, ...row)),
];
