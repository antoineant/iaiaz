// Signup validation utilities for abuse prevention

// Common disposable email patterns (fallback for domains not in DB blocklist)
const DISPOSABLE_PATTERNS = [
  /^temp/i,
  /^throw/i,
  /^trash/i,
  /^fake/i,
  /^spam/i,
  /minute.*mail/i,
  /guerrilla/i,
  /mailinator/i,
  /disposable/i,
  /temporary/i,
];

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts[1]?.toLowerCase() || "";
}

/**
 * Check if domain matches known disposable email patterns
 * This is a fallback for domains not in the database blocklist
 */
export function matchesDisposablePattern(domain: string): boolean {
  return DISPOSABLE_PATTERNS.some((pattern) => pattern.test(domain));
}

/**
 * Basic email format validation
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Email validation result
 */
export interface EmailValidationResult {
  valid: boolean;
  reason?: "blocked_domain" | "disposable_pattern" | "invalid_format";
  message?: string;
}

/**
 * Signup rate limit result from database
 */
export interface SignupRateLimitResult {
  allowed: boolean;
  attempts: number;
  limit: number;
  reset_at: string;
}

/**
 * Get client IP address from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, nginx)
 */
export function getClientIP(headers: Headers): string {
  // Check Vercel/Next.js forwarded header first
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwarded.split(",")[0].trim();
  }

  // Check Cloudflare header
  const cfConnectingIP = headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Check real IP header (nginx)
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback - may not be accurate behind proxy
  return "0.0.0.0";
}
