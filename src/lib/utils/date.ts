/**
 * Date utility functions for timezone handling
 * All dates are stored in UTC in the database
 * Display dates are converted to event's timezone or user's browser timezone
 */

import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format, parse, differenceInMinutes, addMinutes, toDate } from "date-fns";

/**
 * Format a UTC date in the specified timezone
 * @param utcDate - Date object in UTC
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @param formatString - date-fns format string (default: "PPpp" = "Apr 29, 2023, 9:30 AM")
 * @returns Formatted date string in the specified timezone
 */
export function formatEventTime(
  utcDate: Date,
  timezone: string,
  formatString = "PPpp"
): string {
  return formatInTimeZone(utcDate, timezone, formatString);
}

/**
 * Parse a local date/time string in the event's timezone and convert to UTC
 * @param localDateString - ISO date string (e.g., "2023-04-29T09:30:00")
 * @param eventTimezone - IANA timezone identifier
 * @returns Date object in UTC
 */
export function parseEventTime(
  localDateString: string,
  eventTimezone: string
): Date {
  // Parse the local date string and treat it as being in the event's timezone
  const localDate = new Date(localDateString);
  return toDate(localDate);
}

/**
 * Combine date and time strings into a UTC Date object
 * @param date - ISO date string (e.g., "2023-04-29")
 * @param time - Time string in HH:mm format (e.g., "09:30")
 * @param eventTimezone - IANA timezone identifier
 * @returns Date object in UTC
 */
export function combineDateTime(
  date: string,
  time: string,
  eventTimezone: string
): Date {
  const localDateTime = `${date}T${time}:00`;
  return parseEventTime(localDateTime, eventTimezone);
}

/**
 * Extract time string (HH:mm) from a UTC Date in the event's timezone
 * @param utcDate - Date object in UTC
 * @param eventTimezone - IANA timezone identifier
 * @returns Time string in HH:mm format
 */
export function extractTimeString(utcDate: Date, eventTimezone: string): string {
  return formatInTimeZone(utcDate, eventTimezone, "HH:mm");
}

/**
 * Extract date string (YYYY-MM-DD) from a UTC Date in the event's timezone
 * @param utcDate - Date object in UTC
 * @param eventTimezone - IANA timezone identifier
 * @returns ISO date string
 */
export function extractDateString(utcDate: Date, eventTimezone: string): string {
  return formatInTimeZone(utcDate, eventTimezone, "yyyy-MM-dd");
}

/**
 * Check if two time ranges overlap (for schedule conflict detection)
 * @param start1 - Start time of first range
 * @param end1 - End time of first range
 * @param start2 - Start time of second range
 * @param end2 - End time of second range
 * @returns true if the ranges overlap
 */
export function doTimeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate duration in minutes between two times
 * @param startTime - Start time
 * @param endTime - End time
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  return differenceInMinutes(endTime, startTime);
}

/**
 * Add minutes to a date
 * @param date - Base date
 * @param minutes - Minutes to add
 * @returns New date with minutes added
 */
export function addDuration(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

/**
 * Format date range for display
 * @param startDate - Start date (UTC)
 * @param endDate - End date (UTC)
 * @param timezone - IANA timezone identifier
 * @returns Formatted date range string (e.g., "Apr 29-30, 2023")
 */
export function formatDateRange(
  startDate: Date,
  endDate: Date,
  timezone: string
): string {
  const startStr = formatInTimeZone(startDate, timezone, "MMM d");
  const endStr = formatInTimeZone(endDate, timezone, "d, yyyy");
  
  // If same day, show once
  const startDay = formatInTimeZone(startDate, timezone, "yyyy-MM-dd");
  const endDay = formatInTimeZone(endDate, timezone, "yyyy-MM-dd");
  
  if (startDay === endDay) {
    return formatInTimeZone(startDate, timezone, "MMM d, yyyy");
  }
  
  return `${startStr}-${endStr}`;
}

/**
 * Format time range for display
 * @param startTime - Start time (UTC)
 * @param endTime - End time (UTC)
 * @param timezone - IANA timezone identifier
 * @returns Formatted time range string (e.g., "9:30 AM - 10:30 AM")
 */
export function formatTimeRange(
  startTime: Date,
  endTime: Date,
  timezone: string
): string {
  const start = formatInTimeZone(startTime, timezone, "h:mm a");
  const end = formatInTimeZone(endTime, timezone, "h:mm a");
  return `${start} - ${end}`;
}

/**
 * Get the current time in a specific timezone
 * @param timezone - IANA timezone identifier
 * @returns Date object representing current time in UTC
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  return new Date();
}

/**
 * Check if a date is in the past (in the event's timezone)
 * @param date - Date to check (UTC)
 * @param timezone - IANA timezone identifier
 * @returns true if the date is in the past
 */
export function isPast(date: Date, timezone: string): boolean {
  const now = new Date();
  const dateInTimezone = toZonedTime(date, timezone);
  const nowInTimezone = toZonedTime(now, timezone);
  return dateInTimezone < nowInTimezone;
}

/**
 * Check if a date is in the future (in the event's timezone)
 * @param date - Date to check (UTC)
 * @param timezone - IANA timezone identifier
 * @returns true if the date is in the future
 */
export function isFuture(date: Date, timezone: string): boolean {
  return !isPast(date, timezone);
}

/**
 * Validate if a string is a valid IANA timezone
 * @param timezone - Timezone string to validate
 * @returns true if valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a list of common timezones for dropdown selection
 * @returns Array of { value: string, label: string }
 */
export function getCommonTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (US & Canada)" },
    { value: "America/Chicago", label: "Central Time (US & Canada)" },
    { value: "America/Denver", label: "Mountain Time (US & Canada)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
    { value: "America/Anchorage", label: "Alaska" },
    { value: "Pacific/Honolulu", label: "Hawaii" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris, Berlin, Madrid" },
    { value: "Europe/Moscow", label: "Moscow" },
    { value: "Asia/Dubai", label: "Dubai" },
    { value: "Asia/Kolkata", label: "Mumbai, Kolkata, New Delhi" },
    { value: "Asia/Singapore", label: "Singapore, Kuala Lumpur" },
    { value: "Asia/Tokyo", label: "Tokyo, Osaka, Sapporo" },
    { value: "Asia/Shanghai", label: "Beijing, Shanghai, Hong Kong" },
    { value: "Australia/Sydney", label: "Sydney, Melbourne" },
    { value: "Pacific/Auckland", label: "Auckland, Wellington" },
    { value: "Africa/Lagos", label: "West Africa (Lagos, Accra)" },
    { value: "Africa/Johannesburg", label: "South Africa (Johannesburg)" },
    { value: "Africa/Cairo", label: "Cairo" },
  ];
}
