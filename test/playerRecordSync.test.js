import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMilestoneCandidates, parsePlayerTotalPage } from '../server/playerRecordSync.mjs';

test('parses career and season rows from a KBO total table', () => {
  const html = `
    <table>
      <thead><tr><th>연도</th><th>팀명</th><th>AVG</th><th>G</th><th>H</th><th>2B</th></tr></thead>
      <tfoot class="play_record"><tr><th colspan="2">통산</th><th>0.284</th><th>1753</th><th>1773</th><th>249</th></tr></tfoot>
      <tbody><tr><td>2026</td><td>LG</td><td>0.291</td><td>81</td><td>77</td><td>12</td></tr></tbody>
    </table>`;
  const parsed = parsePlayerTotalPage(html);
  assert.equal(parsed.career.G, 1753);
  assert.equal(parsed.career['2B'], 249);
  assert.equal(parsed.season.H, 77);
  assert.equal(parsed.seasonRaw.AVG, '0.291');
});

test('calculates a nearby milestone with the app record shape', () => {
  const parsed = {
    career: { G: 1753, R: 1083, H: 1773, '2B': 249, '3B': 72, HR: 63, TB: 2356, RBI: 654, SB: 482, BB: 644 },
    careerRaw: { '2B': '249' },
    season: { G: 81, '2B': 12 },
    seasonRaw: { G: '81', AVG: '0.291', H: '77', HR: '3', RBI: '33', SB: '22' },
  };
  const records = calculateMilestoneCandidates({ playerId: '62415', name: '박해민', teamCode: 'LG', role: '타자' }, parsed, '2026-07-04');
  const doubles = records.find((record) => record.stat_key === '2B');
  assert.equal(doubles.milestone, 250);
  assert.equal(doubles.current_value, 249);
  assert.equal(doubles.remaining_text, '1');
  assert.equal(doubles.source_type, 'calculated');
});
