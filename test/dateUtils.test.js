import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, getTodayKey, getWeekDays, getYearDays } from '../src/dateUtils.js';

test('서울 날짜를 자정 경계에 맞춰 계산한다', () => {
  assert.equal(getTodayKey(new Date('2026-07-03T15:30:00Z')), '2026-07-04');
  assert.equal(getTodayKey(new Date('2026-07-03T14:59:59Z')), '2026-07-03');
});

test('날짜 덧셈은 월 경계를 처리한다', () => {
  assert.equal(addDays('2026-06-30', 1), '2026-07-01');
  assert.equal(addDays('2026-07-01', -1), '2026-06-30');
});

test('오늘이 포함된 월요일부터 일요일까지를 만든다', () => {
  assert.deepEqual(getWeekDays('2026-07-04').map(({ key }) => key), [
    '2026-06-29',
    '2026-06-30',
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-04',
    '2026-07-05',
  ]);
});

test('2026년 전체 날짜 범위를 만든다', () => {
  const days = getYearDays(2026);
  assert.equal(days.length, 365);
  assert.equal(days[0].key, '2026-01-01');
  assert.equal(days.at(-1).key, '2026-12-31');
});
