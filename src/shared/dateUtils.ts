import { APP_CONSTANTS, MONTH_KEY_REGEX } from "./constants.js";

/**
 * Converts a Date or ISO date string to a normalized UTC Date representing
 * midnight (00:00:00.000Z) of that calendar date in Asia/Dhaka (UTC+6).
 */
export const toDhakaBusinessDate = (input: Date | string): Date => {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [yearStr, monthStr, dayStr] = input.split("-");
    return new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr), 0, 0, 0, 0));
  }
  const date = typeof input === "string" ? new Date(input) : input;
  const dhakaTime = new Date(date.getTime() + APP_CONSTANTS.DHAKA_UTC_OFFSET_MS);
  return new Date(
    Date.UTC(
      dhakaTime.getUTCFullYear(),
      dhakaTime.getUTCMonth(),
      dhakaTime.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
};

/**
 * Returns the YYYY-MM monthKey in Asia/Dhaka for a given Date or ISO string.
 */
export const getDhakaMonthKey = (input: Date | string = new Date()): string => {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input.slice(0, 7);
  }
  const date = typeof input === "string" ? new Date(input) : input;
  const dhakaTime = new Date(date.getTime() + APP_CONSTANTS.DHAKA_UTC_OFFSET_MS);
  const year = dhakaTime.getUTCFullYear();
  const month = String(dhakaTime.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const isValidMonthKey = (monthKey: string): boolean => {
  return MONTH_KEY_REGEX.test(monthKey);
};

/**
 * Returns the inclusive start and exclusive end UTC Date boundaries for a monthKey (YYYY-MM).
 */
export const getMonthBounds = (monthKey: string): { start: Date; endExclusive: Date } => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, endExclusive };
};
