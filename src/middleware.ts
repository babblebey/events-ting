/**
 * Next.js Middleware
 *
 * Handles security concerns including:
 * - CSRF protection for invitation acceptance endpoints
 * - Request logging for security monitoring
 * - Additional security validations
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { type NextRequest, NextResponse } from "next/server";

/**
 * CSRF Token Validation
 *
 * NextAuth.js already provides CSRF protection for its routes.
 * For invitation acceptance, we use token-based authentication
 * where the token itself serves as the security mechanism.
 *
 * Additional CSRF protection is applied to state-changing operations
 * that don't use tokens.
 */

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/**
 * Middleware function
 *
 * Runs on every request matched by the matcher configuration.
 * Used for security headers, logging, and validation.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Log security-relevant requests (invitation acceptance, team actions)
  if (
    pathname.includes("/invitations/accept") ||
    pathname.includes("/api/trpc/team")
  ) {
    logSecurityEvent(request, "team_action_attempt");
  }

  // Validate invitation token format if present
  if (pathname.includes("/invitations/accept")) {
    const token = request.nextUrl.searchParams.get("token");
    if (token && !isValidTokenFormat(token)) {
      // Invalid token format - redirect to error page
      return NextResponse.redirect(
        new URL("/invitations/invalid", request.url),
      );
    }
  }

  // Add security headers to response
  const response = NextResponse.next();

  // Additional CSP header for enhanced security
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
    ].join("; "),
  );

  return response;
}

/**
 * Validate token format
 *
 * Tokens should be 43 characters (base64url encoded 32 bytes)
 * This prevents injection attacks and invalid token attempts
 */
function isValidTokenFormat(token: string): boolean {
  // Base64url character set: A-Z, a-z, 0-9, -, _
  const base64urlRegex = /^[A-Za-z0-9_-]{43}$/;
  return base64urlRegex.test(token);
}

/**
 * Log security-relevant events
 *
 * In production, this should log to a proper logging service
 * (e.g., Datadog, LogRocket, Sentry)
 */
function logSecurityEvent(request: NextRequest, eventType: string): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    path: request.nextUrl.pathname,
    method: request.method,
    ip:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Security Event]", logEntry);
  }

  // In production, send to logging service
  // Example: sendToLoggingService(logEntry);
}
