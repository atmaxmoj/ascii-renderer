/**
 * Unicode full-width character detection and display width utilities.
 * CJK (Chinese/Japanese/Korean) characters occupy 2 columns in monospace fonts.
 */

/** Check if a Unicode code point is full-width (occupies 2 columns) */
export function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115F) ||   // Hangul Jamo
    (code >= 0x2E80 && code <= 0x303E) ||   // CJK Radicals, Kangxi, Ideographic
    (code >= 0x3040 && code <= 0x9FFF) ||   // Hiragana, Katakana, CJK Unified Ideographs
    (code >= 0xAC00 && code <= 0xD7AF) ||   // Hangul Syllables
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0xFE30 && code <= 0xFE4F) ||   // CJK Compatibility Forms
    (code >= 0xFF01 && code <= 0xFF60) ||   // Fullwidth Forms
    (code >= 0xFFE0 && code <= 0xFFE6) ||   // Fullwidth Signs
    (code >= 0x20000 && code <= 0x2FFFF) || // CJK Unified Ideographs Extension B+
    (code >= 0x30000 && code <= 0x3FFFF)    // CJK Unified Ideographs Extension G+
  );
}

/** Get the display width of a single character (1 or 2) */
export function charDisplayWidth(char: string): number {
  const code = char.codePointAt(0);
  if (code === undefined) return 0;
  return isFullWidth(code) ? 2 : 1;
}

/** Get the total display width of a string (sum of character widths) */
export function stringDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += charDisplayWidth(char);
  }
  return width;
}

/**
 * Convert a visual column position to a character index in the string.
 * Used for cursor positioning in text inputs containing CJK characters.
 * Returns the character index whose visual start position matches targetCol.
 */
export function visualColToCharIndex(str: string, targetCol: number): number {
  let visualCol = 0;
  let charIndex = 0;
  for (const char of str) {
    if (visualCol >= targetCol) break;
    visualCol += charDisplayWidth(char);
    charIndex++;
  }
  return charIndex;
}
