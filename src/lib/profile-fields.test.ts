import { describe, it, expect } from 'vitest';
import {
  normalizeSchoolName,
  parseSeatNumber,
  normalizeSeatNumber,
  isSeatNumberAcceptable,
  MAX_SCHOOL_NAME_LENGTH,
} from './profile-fields';

describe('normalizeSchoolName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSchoolName('  Baptist   High  School \n')).toBe('Baptist High School');
  });

  it('empty / whitespace-only becomes null', () => {
    expect(normalizeSchoolName('')).toBeNull();
    expect(normalizeSchoolName('   \t  ')).toBeNull();
  });

  it('caps at 80 characters without leaving a trailing space', () => {
    const long = `${'a'.repeat(79)} ${'b'.repeat(40)}`; // space lands inside the cap
    const out = normalizeSchoolName(long)!;
    expect(out.length).toBeLessThanOrEqual(MAX_SCHOOL_NAME_LENGTH);
    expect(out.endsWith(' ')).toBe(false);
  });

  it('passes a normal name through unchanged', () => {
    expect(normalizeSchoolName('Command Day Secondary School')).toBe(
      'Command Day Secondary School',
    );
  });
});

describe('parseSeatNumber', () => {
  it('accepts exactly 3 or 4 digits', () => {
    expect(parseSeatNumber('123')).toEqual({ status: 'valid', value: '123' });
    expect(parseSeatNumber('4321')).toEqual({ status: 'valid', value: '4321' });
  });

  it('strips separators students like to type', () => {
    expect(parseSeatNumber(' 43-21 ')).toEqual({ status: 'valid', value: '4321' });
  });

  it('keeps the LAST 4 digits when a longer ID is typed', () => {
    expect(parseSeatNumber('20241234567')).toEqual({ status: 'valid', value: '4567' });
  });

  it('flags 1-2 digits as invalid (too short to be a seat number)', () => {
    expect(parseSeatNumber('42')).toEqual({ status: 'invalid' });
  });

  it('empty input is empty, letters-only is invalid', () => {
    expect(parseSeatNumber('   ')).toEqual({ status: 'empty' });
    expect(parseSeatNumber('abc')).toEqual({ status: 'invalid' });
  });
});

describe('normalizeSeatNumber / isSeatNumberAcceptable', () => {
  it('normalizes valid input and nulls everything else', () => {
    expect(normalizeSeatNumber(' 99-9 ')).toBe('999');
    expect(normalizeSeatNumber('')).toBeNull();
    expect(normalizeSeatNumber('12')).toBeNull();
  });

  it('save gate: empty allowed (optional field), invalid blocked', () => {
    expect(isSeatNumberAcceptable('')).toBe(true);
    expect(isSeatNumberAcceptable('  ')).toBe(true);
    expect(isSeatNumberAcceptable('1234')).toBe(true);
    expect(isSeatNumberAcceptable('12')).toBe(false);
  });
});
