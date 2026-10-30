/**
 * Pure normalizers for the two profile identity fields. Unit-tested; the
 * same rules are mirrored by DB CHECK constraints
 * (supabase/migrations/20261030000001_profile_school_and_seat.sql):
 *
 *  - school_name      1..80 chars, whitespace collapsed. Shown as a tag on
 *                     every profile display; typed during onboarding.
 *  - exam_seat_number the last 3-4 digits of the student's ID card. Optional,
 *                     own-profile text only (never a tag, never shown to
 *                     other students).
 */

export const MAX_SCHOOL_NAME_LENGTH = 80;

/** Collapse runs of whitespace, trim, cap at 80 chars. Empty → null. */
export function normalizeSchoolName(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  return collapsed.slice(0, MAX_SCHOOL_NAME_LENGTH).trim() || null;
}

export type SeatNumberResult =
  | { status: 'empty' }                 // nothing typed — optional, fine
  | { status: 'valid'; value: string }  // 3-4 digits (longer input keeps the last 4)
  | { status: 'invalid' };              // too short, or letters with <3 digits

/**
 * Forgiving parser for "last 3 or 4 digits of my ID card": separators are
 * stripped, a full ID typed by mistake keeps its last 4 digits, and only
 * genuinely unusable input is flagged invalid.
 */
export function parseSeatNumber(raw: string): SeatNumberResult {
  if (!raw.trim()) return { status: 'empty' };
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length > 4) return { status: 'valid', value: digits.slice(-4) };
  if (digits.length >= 3) return { status: 'valid', value: digits };
  return { status: 'invalid' };
}

/** Valid normalized seat number, or null (empty or invalid). */
export function normalizeSeatNumber(raw: string): string | null {
  const parsed = parseSeatNumber(raw);
  return parsed.status === 'valid' ? parsed.value : null;
}

/** Save-safe check: empty (allowed — the field is optional) or valid. */
export function isSeatNumberAcceptable(raw: string): boolean {
  return parseSeatNumber(raw).status !== 'invalid';
}
