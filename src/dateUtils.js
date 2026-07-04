const SEOUL_TIME_ZONE = 'Asia/Seoul';
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function dateKeyFromParts(parts) {
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getTodayKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dateKeyFromParts(formatter.formatToParts(now));
}

export function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getWeekDays(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const monday = addDays(dateKey, -mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(monday, index);
    const day = new Date(`${key}T00:00:00Z`);
    return {
      key,
      day: DAY_NAMES[day.getUTCDay()],
      label: `${Number(key.slice(5, 7))}.${Number(key.slice(8, 10))}`,
    };
  });
}
