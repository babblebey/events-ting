/**
 * Assignment Cutoff Helper Functions
 * 
 * Utilities for calculating and displaying ticket assignment cutoff times.
 * 
 * Assignment cutoff determines when buyers can no longer assign/reassign tickets.
 * Organizers can choose from presets (event start, 1h before, 24h before) or
 * set a custom cutoff time.
 * 
 * Current Implementation: Display only (validation to be added in future sprint)
 * TODO: Add cutoff enforcement validation in assignment procedures
 */

/**
 * Assignment cutoff types
 */
export type AssignmentCutoffType = 
  | 'event_start'
  | '1h_before'
  | '24h_before'
  | 'custom';

/**
 * Event with assignment cutoff configuration
 */
export interface EventWithCutoff {
  startDate: Date;
  assignmentCutoffType: AssignmentCutoffType;
  assignmentCutoffTime?: Date | null;
}

/**
 * Calculate the effective assignment cutoff time for an event.
 * 
 * @param event - Event with cutoff configuration
 * @returns The calculated cutoff time as a Date
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: '1h_before',
 * };
 * const cutoff = getAssignmentCutoffTime(event);
 * // Returns: 2025-12-01T17:00:00Z
 * ```
 */
export function getAssignmentCutoffTime(event: EventWithCutoff): Date {
  switch (event.assignmentCutoffType) {
    case 'event_start':
      return event.startDate;
      
    case '1h_before':
      return new Date(event.startDate.getTime() - 60 * 60 * 1000);
      
    case '24h_before':
      return new Date(event.startDate.getTime() - 24 * 60 * 60 * 1000);
      
    case 'custom':
      return event.assignmentCutoffTime ?? event.startDate;
      
    default:
      // Fallback to event start if unknown type
      return event.startDate;
  }
}

/**
 * Check if the assignment cutoff has passed (for display purposes).
 * 
 * Note: This is for UI display only. Actual validation should be done
 * server-side in the assignment procedure.
 * 
 * @param event - Event with cutoff configuration
 * @param currentTime - Optional current time (defaults to now)
 * @returns True if the cutoff time has passed
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: 'event_start',
 * };
 * const hasPassed = isAssignmentCutoffPassed(event);
 * // Returns: true if current time > event start
 * ```
 */
export function isAssignmentCutoffPassed(
  event: EventWithCutoff,
  currentTime: Date = new Date()
): boolean {
  const cutoffTime = getAssignmentCutoffTime(event);
  return currentTime > cutoffTime;
}

/**
 * Get a human-readable description of the assignment cutoff policy.
 * 
 * @param event - Event with cutoff configuration
 * @returns Human-readable cutoff description
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: '1h_before',
 * };
 * const description = getAssignmentCutoffDescription(event);
 * // Returns: "1 hour before event start"
 * ```
 */
export function getAssignmentCutoffDescription(event: EventWithCutoff): string {
  switch (event.assignmentCutoffType) {
    case 'event_start':
      return 'At event start time';
      
    case '1h_before':
      return '1 hour before event start';
      
    case '24h_before':
      return '24 hours before event start';
      
    case 'custom':
      if (event.assignmentCutoffTime) {
        return `Custom cutoff: ${event.assignmentCutoffTime.toLocaleString()}`;
      }
      return 'At event start time';
      
    default:
      return 'At event start time';
  }
}

/**
 * Format the cutoff time for display in the UI.
 * 
 * @param event - Event with cutoff configuration
 * @param locale - Optional locale for date formatting (defaults to 'en-US')
 * @returns Formatted cutoff time string
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: '1h_before',
 * };
 * const formatted = formatAssignmentCutoffTime(event);
 * // Returns: "December 1, 2025 at 5:00 PM"
 * ```
 */
export function formatAssignmentCutoffTime(
  event: EventWithCutoff,
  locale = 'en-US'
): string {
  const cutoffTime = getAssignmentCutoffTime(event);
  
  return cutoffTime.toLocaleString(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/**
 * Calculate time remaining until assignment cutoff.
 * 
 * @param event - Event with cutoff configuration
 * @param currentTime - Optional current time (defaults to now)
 * @returns Object with remaining time components
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: 'event_start',
 * };
 * const remaining = getTimeUntilCutoff(event);
 * // Returns: { days: 5, hours: 3, minutes: 45, isPassed: false }
 * ```
 */
export function getTimeUntilCutoff(
  event: EventWithCutoff,
  currentTime: Date = new Date()
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPassed: boolean;
  totalMilliseconds: number;
} {
  const cutoffTime = getAssignmentCutoffTime(event);
  const diff = cutoffTime.getTime() - currentTime.getTime();
  
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPassed: true,
      totalMilliseconds: 0,
    };
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    days,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60,
    isPassed: false,
    totalMilliseconds: diff,
  };
}

/**
 * Format time remaining until cutoff for display.
 * 
 * @param event - Event with cutoff configuration
 * @param currentTime - Optional current time (defaults to now)
 * @returns Human-readable time remaining string
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: 'event_start',
 * };
 * const remaining = formatTimeUntilCutoff(event);
 * // Returns: "5 days, 3 hours remaining"
 * ```
 */
export function formatTimeUntilCutoff(
  event: EventWithCutoff,
  currentTime: Date = new Date()
): string {
  const remaining = getTimeUntilCutoff(event, currentTime);
  
  if (remaining.isPassed) {
    return 'Cutoff has passed';
  }
  
  const parts: string[] = [];
  
  if (remaining.days > 0) {
    parts.push(`${remaining.days} day${remaining.days !== 1 ? 's' : ''}`);
  }
  
  if (remaining.hours > 0) {
    parts.push(`${remaining.hours} hour${remaining.hours !== 1 ? 's' : ''}`);
  }
  
  if (remaining.minutes > 0 && remaining.days === 0) {
    parts.push(`${remaining.minutes} minute${remaining.minutes !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) {
    return 'Less than 1 minute remaining';
  }
  
  return `${parts.join(', ')} remaining`;
}

/**
 * Validate assignment cutoff configuration.
 * 
 * @param event - Event with cutoff configuration to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```typescript
 * const event = {
 *   startDate: new Date('2025-12-01T18:00:00Z'),
 *   assignmentCutoffType: 'custom',
 *   assignmentCutoffTime: null, // Missing required custom time
 * };
 * const validation = validateAssignmentCutoffConfig(event);
 * // Returns: { valid: false, error: "Custom cutoff time is required..." }
 * ```
 */
export function validateAssignmentCutoffConfig(event: EventWithCutoff): {
  valid: boolean;
  error?: string;
} {
  if (event.assignmentCutoffType === 'custom' && !event.assignmentCutoffTime) {
    return {
      valid: false,
      error: 'Custom cutoff time is required when cutoff type is "custom"',
    };
  }
  
  if (event.assignmentCutoffType === 'custom' && event.assignmentCutoffTime) {
    if (event.assignmentCutoffTime > event.startDate) {
      return {
        valid: false,
        error: 'Cutoff time cannot be after event start time',
      };
    }
  }
  
  return { valid: true };
}
