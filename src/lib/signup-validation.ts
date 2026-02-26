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
  /^nada\./i,
  /^burner/i,
  /^yopmail/i,
  /mail\.me$/i,    // meteormail.me etc.
  /mail\.ws$/i,
  /mail\.xyz$/i,   // random disposable .xyz domains
];

// TLDs commonly used for throwaway/disposable domains
// Legitimate providers use .com, .fr, .net, .org, .edu, etc.
const SUSPICIOUS_TLDS = new Set([
  "shop", "xyz", "top", "buzz", "click", "link", "site", "online",
  "fun", "icu", "rest", "surf", "monster", "uno", "cyou", "cfd",
  "sbs", "lol", "mom", "bond", "bid", "gdn", "pw",
]);

// Well-known legitimate email providers — always allowed regardless of TLD checks
const TRUSTED_EMAIL_DOMAINS = new Set([
  // Major providers
  "gmail.com", "outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr",
  "yahoo.com", "yahoo.fr", "live.com", "live.fr", "msn.com",
  "icloud.com", "me.com", "mac.com", "protonmail.com", "proton.me",
  // French providers
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net",
  "bbox.fr", "numericable.fr",
  // Education
  "edu", "ac-paris.fr", "ac-versailles.fr", "ac-lyon.fr",
  "univ-paris1.fr", "sorbonne-universite.fr",
]);

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
 * Check if email uses a suspicious TLD with a non-trusted domain.
 * Blocks random throwaway domains like "qemvbbi.shop" while allowing
 * legitimate services on those TLDs if they're in the trusted list.
 */
export function hasSuspiciousTLD(domain: string): boolean {
  if (TRUSTED_EMAIL_DOMAINS.has(domain)) return false;
  const tld = domain.split(".").pop() || "";
  return SUSPICIOUS_TLDS.has(tld);
}

/**
 * Check if the local part of an email (before @) looks like random gibberish.
 * Catches patterns like "bxk25qn4", "m4h363d9", "03955934".
 * Real emails are usually name-based: "jean.dupont", "marie42", etc.
 */
export function hasGibberishLocalPart(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() || "";
  if (local.length < 6) return false; // too short to judge

  // Strip dots/underscores/hyphens (common in real emails)
  const cleaned = local.replace(/[._-]/g, "");

  // Purely numeric
  if (/^\d+$/.test(cleaned)) return true;

  // High digit ratio in short local parts: "bxk25qn4" = 3 digits / 8 chars = 0.375
  const digitCount = (cleaned.match(/\d/g) || []).length;
  const letterCount = (cleaned.match(/[a-z]/g) || []).length;
  if (cleaned.length >= 6 && cleaned.length <= 12) {
    // Mix of letters and digits with no recognizable pattern
    if (digitCount >= 2 && letterCount >= 2 && digitCount / cleaned.length > 0.3) {
      // Check for vowels — real names have them, random strings often don't
      const vowelCount = (cleaned.match(/[aeiou]/g) || []).length;
      if (vowelCount / letterCount < 0.2) return true;
    }
  }

  return false;
}

/**
 * Basic email format validation
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a display name looks like a real human name (not bot/spam gibberish).
 * Returns true if the name is valid, false if it looks suspicious.
 * Empty/undefined names are considered valid (name is optional).
 */
export function isValidDisplayName(name: string | undefined): boolean {
  if (!name || name.trim().length === 0) return true;

  const trimmed = name.trim();

  // Too short or too long
  if (trimmed.length < 2 || trimmed.length > 100) return false;

  // Purely numeric or only special characters (no letters)
  if (!/[a-zA-ZÀ-ÿ\u0100-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(trimmed)) return false;

  // Extract only ASCII letters for heuristic checks
  const asciiLetters = trimmed.replace(/[^a-zA-Z]/g, "");

  if (asciiLetters.length > 0) {
    // No vowels in the ASCII portion — real names have vowels
    if (!/[aeiouAEIOU]/.test(asciiLetters)) return false;

    // Long single-word names without spaces are suspicious (>15 chars with no space)
    if (trimmed.length > 15 && !/\s/.test(trimmed)) return false;

    // Excessive case switching — count transitions between upper and lower
    if (asciiLetters.length >= 6) {
      let switches = 0;
      for (let i = 1; i < asciiLetters.length; i++) {
        const prevUpper = asciiLetters[i - 1] === asciiLetters[i - 1].toUpperCase();
        const currUpper = asciiLetters[i] === asciiLetters[i].toUpperCase();
        if (prevUpper !== currUpper) switches++;
      }
      const switchRatio = switches / (asciiLetters.length - 1);
      // Normal names: "Jean-Pierre" → low ratio; "elICElszHwIp" → very high ratio
      if (switchRatio > 0.6) return false;
    }
  }

  // Repeated character patterns: "aaaaaaa" or "abcabcabc"
  const lower = trimmed.toLowerCase().replace(/\s/g, "");
  // Same character repeated 4+ times in a row
  if (/(.)\1{3,}/.test(lower)) return false;
  // Short repeating pattern (2-3 chars) repeated 3+ times
  if (/^(.{2,3})\1{2,}/.test(lower)) return false;

  return true;
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
