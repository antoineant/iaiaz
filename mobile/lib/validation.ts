/**
 * Check if a display name looks like a real human name (not bot/spam gibberish).
 * Returns true if the name is valid, false if it looks suspicious.
 * Empty/undefined names are considered valid (name is optional).
 *
 * NOTE: Keep in sync with src/lib/signup-validation.ts isValidDisplayName()
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
      if (switchRatio > 0.6) return false;
    }
  }

  // Repeated character patterns
  const lower = trimmed.toLowerCase().replace(/\s/g, "");
  if (/(.)\1{3,}/.test(lower)) return false;
  if (/^(.{2,3})\1{2,}/.test(lower)) return false;

  return true;
}
