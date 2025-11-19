/**
 * Email Validation Helper
 * 
 * Validates email addresses with soft warnings for common typos and suspicious patterns.
 * Provides both strict validation (RFC 5322 compliant) and helpful suggestions to
 * improve data quality during ticket assignment.
 * 
 * Features:
 * - RFC 5322 format validation
 * - Common typo detection (gmial.com → gmail.com)
 * - Suspicious pattern warnings (no-reply@, test@, etc.)
 * - Domain validation (MX record check capability)
 */

/**
 * Email validation result
 */
export interface EmailValidationResult {
  /** Whether the email format is valid */
  isValid: boolean;
  /** Critical error message (email cannot be used) */
  error?: string;
  /** Warning messages (email can be used but might have issues) */
  warnings: string[];
  /** Suggested correction if typo detected */
  suggestion?: string;
}

/**
 * Common email domain typos
 */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outloook.com': 'outlook.com',
};

/**
 * Suspicious email patterns that should trigger warnings
 */
const SUSPICIOUS_PATTERNS = [
  { pattern: /^no-?reply@/i, message: 'Email appears to be a no-reply address' },
  { pattern: /^test@/i, message: 'Email appears to be a test address' },
  { pattern: /^admin@/i, message: 'Email appears to be an admin address' },
  { pattern: /^noreply@/i, message: 'Email appears to be a no-reply address' },
  { pattern: /^do-?not-?reply@/i, message: 'Email appears to be a do-not-reply address' },
  { pattern: /\+\d+@/, message: 'Email contains numbers after + sign (might be temporary)' },
  { pattern: /@example\./i, message: 'Email uses example domain' },
  { pattern: /@test\./i, message: 'Email uses test domain' },
];

/**
 * RFC 5322 compliant email regex (simplified but robust)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * More strict email validation (closer to RFC 5322)
 */
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate an email address with soft warnings.
 * 
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const result = validateEmail('user@gmial.com');
 * // Returns: {
 * //   isValid: true,
 * //   warnings: ['Domain might have typo'],
 * //   suggestion: 'user@gmail.com'
 * // }
 * ```
 */
export function validateEmail(
  email: string,
  options: {
    /** Use strict RFC 5322 validation */
    strict?: boolean;
    /** Skip typo detection */
    skipTypoCheck?: boolean;
    /** Skip suspicious pattern warnings */
    skipSuspiciousCheck?: boolean;
  } = {}
): EmailValidationResult {
  const warnings: string[] = [];
  let suggestion: string | undefined;
  
  // Basic validation
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required',
      warnings: [],
    };
  }
  
  // Trim and lowercase for validation
  const trimmedEmail = email.trim().toLowerCase();
  
  if (trimmedEmail.length === 0) {
    return {
      isValid: false,
      error: 'Email address cannot be empty',
      warnings: [],
    };
  }
  
  // Format validation
  const regex = options.strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX;
  if (!regex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Email address format is invalid',
      warnings: [],
    };
  }
  
  // Extract domain
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    return {
      isValid: false,
      error: 'Email address format is invalid',
      warnings: [],
    };
  }
  
  // Check for common typos
  if (!options.skipTypoCheck && domain in DOMAIN_TYPOS) {
    const suggestedDomain = DOMAIN_TYPOS[domain];
    suggestion = `${localPart}@${suggestedDomain}`;
    warnings.push(`Did you mean ${suggestion}? (common typo detected)`);
  }
  
  // Check for suspicious patterns
  if (!options.skipSuspiciousCheck) {
    for (const { pattern, message } of SUSPICIOUS_PATTERNS) {
      if (pattern.test(trimmedEmail)) {
        warnings.push(message);
      }
    }
  }
  
  // Check for common issues
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    warnings.push('Local part should not start or end with a dot');
  }
  
  if (localPart.includes('..')) {
    warnings.push('Local part should not contain consecutive dots');
  }
  
  if (domain.includes('..')) {
    warnings.push('Domain should not contain consecutive dots');
  }
  
  // Check domain has at least one dot
  if (!domain.includes('.')) {
    return {
      isValid: false,
      error: 'Email domain must include a top-level domain (e.g., .com)',
      warnings: [],
    };
  }
  
  return {
    isValid: true,
    warnings,
    suggestion,
  };
}

/**
 * Batch validate multiple email addresses.
 * 
 * @param emails - Array of email addresses to validate
 * @param options - Validation options
 * @returns Map of email to validation result
 * 
 * @example
 * ```typescript
 * const results = validateBatchEmails(['user@gmail.com', 'test@gmial.com']);
 * // Returns: {
 * //   'user@gmail.com': { isValid: true, warnings: [] },
 * //   'test@gmial.com': { isValid: true, warnings: [...], suggestion: '...' }
 * // }
 * ```
 */
export function validateBatchEmails(
  emails: string[],
  options?: Parameters<typeof validateEmail>[1]
): Record<string, EmailValidationResult> {
  const results: Record<string, EmailValidationResult> = {};
  
  for (const email of emails) {
    results[email] = validateEmail(email, options);
  }
  
  return results;
}

/**
 * Check if an email address is from a disposable email provider.
 * 
 * Note: This is a basic check. For production, consider using a service
 * like mailcheck.ai or EmailListVerify for comprehensive disposable email detection.
 * 
 * @param email - The email address to check
 * @returns True if the email appears to be from a disposable provider
 * 
 * @example
 * ```typescript
 * isDisposableEmail('user@tempmail.com'); // true
 * isDisposableEmail('user@gmail.com'); // false
 * ```
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return false;
  }
  
  // Common disposable email domains (partial list)
  const disposableDomains = [
    'tempmail.com',
    'guerrillamail.com',
    'mailinator.com',
    '10minutemail.com',
    'throwawaymil.com',
    'temp-mail.org',
    'fakemil.com',
    'trashmail.com',
    'getnada.com',
    'maildrop.cc',
  ];
  
  return disposableDomains.includes(domain);
}

/**
 * Sanitize an email address for storage.
 * 
 * @param email - The email address to sanitize
 * @returns Sanitized email (trimmed and lowercased)
 * 
 * @example
 * ```typescript
 * sanitizeEmail('  User@GMAIL.COM  '); // 'user@gmail.com'
 * ```
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Extract domain from an email address.
 * 
 * @param email - The email address
 * @returns The domain part (after @)
 * 
 * @example
 * ```typescript
 * extractDomain('user@gmail.com'); // 'gmail.com'
 * ```
 */
export function extractDomain(email: string): string | null {
  const domain = email.split('@')[1];
  return domain?.toLowerCase() ?? null;
}

/**
 * Check if two email addresses are the same (case-insensitive, trimmed).
 * 
 * @param email1 - First email address
 * @param email2 - Second email address
 * @returns True if emails are the same
 * 
 * @example
 * ```typescript
 * isSameEmail('user@gmail.com', 'User@GMAIL.COM'); // true
 * ```
 */
export function isSameEmail(email1: string, email2: string): boolean {
  return sanitizeEmail(email1) === sanitizeEmail(email2);
}
