/**
 * Escapes characters that are special in a regular expression so that
 * user-supplied search text is treated literally. Prevents regex/ReDoS
 * injection when the value is passed to a Mongo `$regex` query.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a case-insensitive, literal `$regex` filter from user input.
 * Caps the length to avoid pathological patterns.
 */
export function safeRegex(input: string, maxLen = 100): { $regex: string; $options: string } {
  return { $regex: escapeRegex(input.slice(0, maxLen)), $options: 'i' };
}
