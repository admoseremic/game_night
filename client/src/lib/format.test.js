import { it, expect } from 'vitest';
import { rel, ordinal, tierTx, fmtDate } from './format.js';

it('ordinal', () => { expect(ordinal(1)).toBe('1st'); expect(ordinal(2)).toBe('2nd'); expect(ordinal(11)).toBe('11th'); });
it('tierTx colors', () => { expect(tierTx('Heavy')).toBe('#FF6FA5'); expect(tierTx('Light')).toBe('#34D9A0'); expect(tierTx('Medium')).toBe('#FF8A3D'); });
it('rel relative time', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(rel('2026-06-24T08:00', now)).toBe('today');
  expect(rel('2026-06-23T20:00', now)).toBe('yesterday');
});
it('fmtDate', () => { expect(fmtDate('2026-06-10T20:00')).toBe('Jun 10'); });
