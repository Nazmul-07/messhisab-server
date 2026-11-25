export const APP_CONSTANTS = {
  TIMEZONE: "Asia/Dhaka",
  CURRENCY: "BDT",
  DHAKA_UTC_OFFSET_MS: 6 * 60 * 60 * 1000,
  API_PREFIX: "/api/v1",
  INVITE_EXPIRY_DAYS: 7,
  MAX_MEAL_HALF_UNITS_PER_ENTRY: 20, // max 10 meals per single slot
} as const;

export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
export const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
