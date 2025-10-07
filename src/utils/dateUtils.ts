/**
 * Date utility functions to handle timezone issues
 * Ensures consistent date handling across the application
 */

/**
 * Get local date string in YYYY-MM-DD format
 * This avoids timezone issues when using toISOString() which returns UTC
 * @param date - Optional date object, defaults to current date
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Parse a date string to a Date object at local midnight
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object set to local midnight
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayString(): string {
  return getLocalDateString(new Date());
}

/**
 * Get tomorrow's date string in YYYY-MM-DD format
 * @returns Tomorrow's date string
 */
export function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
}
