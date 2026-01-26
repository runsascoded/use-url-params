/**
 * Base64 alphabet definitions and utilities
 *
 * Provides named presets for common base64 alphabets and validation.
 */

/**
 * Named alphabet presets
 */
export const ALPHABETS = {
  /**
   * RFC 4648 base64url alphabet (default)
   * Standard URL-safe encoding, but NOT lexicographically sortable.
   */
  rfc4648: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',

  /**
   * ASCII-ordered alphabet for lexicographic sortability
   * Encoded strings sort in the same order as their numeric values.
   * Uses URL-safe characters only (- and _).
   */
  sortable: '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
} as const

/**
 * Preset alphabet names
 */
export type AlphabetName = keyof typeof ALPHABETS

/**
 * Alphabet specification: either a preset name or a 64-character string
 */
export type Alphabet = AlphabetName | (string & {})

/**
 * URL-safe characters for base64 encoding
 */
const URL_SAFE_CHARS = /^[A-Za-z0-9\-_]+$/

/**
 * Validate an alphabet string
 * @throws Error if alphabet is invalid
 */
export function validateAlphabet(alphabet: string): void {
  if (alphabet.length !== 64) {
    throw new Error(`Alphabet must be exactly 64 characters, got ${alphabet.length}`)
  }

  const seen = new Set<string>()
  for (const char of alphabet) {
    if (seen.has(char)) {
      throw new Error(`Duplicate character in alphabet: '${char}'`)
    }
    seen.add(char)
  }

  if (!URL_SAFE_CHARS.test(alphabet)) {
    const unsafe = [...alphabet].filter(c => !URL_SAFE_CHARS.test(c))
    throw new Error(`Alphabet contains non-URL-safe characters: ${unsafe.map(c => `'${c}'`).join(', ')}`)
  }
}

/**
 * Resolve an alphabet specification to a 64-character string
 * @param alphabet - Preset name or 64-character string
 * @returns The resolved alphabet string
 * @throws Error if alphabet is invalid
 */
export function resolveAlphabet(alphabet: Alphabet): string {
  if (alphabet in ALPHABETS) {
    return ALPHABETS[alphabet as AlphabetName]
  }

  validateAlphabet(alphabet)
  return alphabet
}

/**
 * Create a reverse lookup map for decoding
 */
export function createLookupMap(alphabet: string): Map<string, number> {
  return new Map(alphabet.split('').map((c, i) => [c, i]))
}
