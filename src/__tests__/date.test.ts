import {
  formatDate,
  getDateGroupHeader,
  getWeekRange,
  getMonthRange,
  getYearRange,
  getMonthKey,
  getWeekKey,
} from '../utils/date';

describe('Date Boundary & Leap Year Handling Tests', () => {
  test('Leap year February ends on 29th Feb (e.g. 2028 or 2024)', () => {
    const leapFeb = new Date(2028, 1, 15); // Feb 15, 2028
    const range = getMonthRange(leapFeb);
    expect(range.start.includes('2028-02-01')).toBe(true);
    expect(range.end.includes('2028-02-29')).toBe(true);
  });

  test('Non-leap year February ends on 28th Feb (e.g. 2026)', () => {
    const normalFeb = new Date(2026, 1, 15); // Feb 15, 2026
    const range = getMonthRange(normalFeb);
    expect(range.start.includes('2026-02-01')).toBe(true);
    expect(range.end.includes('2026-02-28')).toBe(true);
  });

  test('Week strictly starts on Monday and ends on Sunday', () => {
    // 09 Nov 2026 is a Monday
    const monday = new Date(2026, 10, 9);
    const range = getWeekRange(monday);

    // Monday start
    expect(range.start.includes('2026-11-09')).toBe(true);
    // Sunday end (15 Nov 2026)
    expect(range.end.includes('2026-11-15')).toBe(true);
  });

  test('Year range spans from 01 Jan to 31 Dec', () => {
    const d = new Date(2026, 5, 1);
    const range = getYearRange(d);
    expect(range.start.includes('2026-01-01')).toBe(true);
    expect(range.end.includes('2026-12-31')).toBe(true);
  });

  test('Month key formatted as YYYY-MM', () => {
    const d = new Date(2026, 10, 9); // Month 10 is Nov
    expect(getMonthKey(d)).toBe('2026-11');
  });

  test('Date group header returns Today for current date', () => {
    const now = new Date().toISOString();
    expect(getDateGroupHeader(now)).toBe('Today');
  });
});

