/**
 * Binary encoding utilities for compact URL parameters
 *
 * Provides base64url and base80 encoding for arbitrary binary data.
 * Use these to create compact URL representations of complex data structures.
 */

/**
 * URL-safe base64 alphabet (RFC 4648 base64url)
 * Uses - and _ instead of + and / for URL safety
 */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/**
 * Base80 alphabet for maximum density in URL hash fragments
 * Uses all 80 URL-safe characters (excluding & which delimits params)
 *
 * Per RFC 3986, these don't need percent-encoding in fragments:
 * - A-Z, a-z, 0-9 (62)
 * - -._~ (4 unreserved)
 * - !$'()*+,;= (10 sub-delims, minus &)
 * - :@/? (4)
 *
 * Sorted for consistency.
 */
const BASE80_CHARS = "!$'()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~"

// Lookup tables for fast decoding
const BASE64_LOOKUP = new Map(BASE64_CHARS.split('').map((c, i) => [c, i]))
const BASE80_LOOKUP = new Map(BASE80_CHARS.split('').map((c, i) => [c, i]))

/**
 * Encode a Uint8Array to base64url string
 */
export function base64Encode(bytes: Uint8Array): string {
  let result = ''
  let i = 0

  while (i < bytes.length) {
    const b0 = bytes[i++] ?? 0
    const b1 = bytes[i++] ?? 0
    const b2 = bytes[i++] ?? 0

    // Combine 3 bytes into 24 bits, then split into 4 6-bit values
    const n = (b0 << 16) | (b1 << 8) | b2

    result += BASE64_CHARS[(n >> 18) & 0x3f]
    result += BASE64_CHARS[(n >> 12) & 0x3f]

    // Only add padding chars if we have the bytes
    if (i - 2 < bytes.length) {
      result += BASE64_CHARS[(n >> 6) & 0x3f]
    }
    if (i - 1 < bytes.length) {
      result += BASE64_CHARS[n & 0x3f]
    }
  }

  return result
}

/**
 * Decode a base64url string to Uint8Array
 */
export function base64Decode(str: string): Uint8Array {
  // Remove any padding (we don't require it)
  str = str.replace(/=+$/, '')

  const bytes: number[] = []

  for (let i = 0; i < str.length; i += 4) {
    const c0 = BASE64_LOOKUP.get(str[i]) ?? 0
    const c1 = BASE64_LOOKUP.get(str[i + 1]) ?? 0
    const c2 = i + 2 < str.length ? BASE64_LOOKUP.get(str[i + 2]) ?? 0 : 0
    const c3 = i + 3 < str.length ? BASE64_LOOKUP.get(str[i + 3]) ?? 0 : 0

    // Combine 4 6-bit values into 24 bits, then split into 3 bytes
    const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3

    bytes.push((n >> 16) & 0xff)
    if (i + 2 < str.length) bytes.push((n >> 8) & 0xff)
    if (i + 3 < str.length) bytes.push(n & 0xff)
  }

  return new Uint8Array(bytes)
}

/**
 * Encode a Uint8Array to base80 string
 *
 * Base80 provides ~5% more density than base64 (6.32 vs 6.00 bits/char)
 * but is less standard. Use for maximum compression in hash fragments.
 */
export function base80Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  // Convert bytes to big integer
  let n = 0n
  for (const byte of bytes) {
    n = (n << 8n) | BigInt(byte)
  }

  if (n === 0n) {
    // Preserve leading zero bytes
    return BASE80_CHARS[0].repeat(bytes.length)
  }

  // Convert to base80
  let result = ''
  while (n > 0n) {
    result = BASE80_CHARS[Number(n % 80n)] + result
    n = n / 80n
  }

  // Preserve leading zero bytes
  for (const byte of bytes) {
    if (byte === 0) result = BASE80_CHARS[0] + result
    else break
  }

  return result
}

/**
 * Decode a base80 string to Uint8Array
 */
export function base80Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0)

  // Convert from base80 to big integer
  let n = 0n
  for (const char of str) {
    const idx = BASE80_LOOKUP.get(char)
    if (idx === undefined) throw new Error(`Invalid base80 char: ${char}`)
    n = n * 80n + BigInt(idx)
  }

  // Convert to bytes
  const bytes: number[] = []
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn))
    n = n >> 8n
  }

  // Restore leading zero bytes
  for (const char of str) {
    if (char === BASE80_CHARS[0]) bytes.unshift(0)
    else break
  }

  return new Uint8Array(bytes)
}

/**
 * Encoding type for binary params
 */
export type BinaryEncoding = 'base64' | 'base80'

/**
 * Options for binary param creation
 */
export interface BinaryParamOptions<T> {
  /**
   * Convert value to bytes
   */
  toBytes: (value: T) => Uint8Array

  /**
   * Convert bytes to value
   */
  fromBytes: (bytes: Uint8Array) => T

  /**
   * Encoding to use (default: 'base64')
   */
  encoding?: BinaryEncoding
}

import type { Param } from './index.js'

/**
 * Create a param that encodes/decodes via binary representation
 *
 * @example
 * ```ts
 * const shapesParam = binaryParam<Shape[]>({
 *   toBytes: (shapes) => encodeShapesToBytes(shapes),
 *   fromBytes: (bytes) => decodeBytesToShapes(bytes),
 *   encoding: 'base64',
 * })
 * ```
 */
export function binaryParam<T>(options: BinaryParamOptions<T>): Param<T | null> {
  const { toBytes, fromBytes, encoding = 'base64' } = options
  const encode = encoding === 'base80' ? base80Encode : base64Encode
  const decode = encoding === 'base80' ? base80Decode : base64Decode

  return {
    encode: (value) => {
      if (value === null) return undefined
      const bytes = toBytes(value)
      if (bytes.length === 0) return undefined
      return encode(bytes)
    },
    decode: (encoded) => {
      if (encoded === undefined || encoded === '') return null
      try {
        const bytes = decode(encoded)
        return fromBytes(bytes)
      } catch {
        return null
      }
    },
  }
}

/**
 * Create a base64-encoded binary param
 * Shorthand for binaryParam with encoding: 'base64'
 */
export function base64Param<T>(
  toBytes: (value: T) => Uint8Array,
  fromBytes: (bytes: Uint8Array) => T
): Param<T | null> {
  return binaryParam({ toBytes, fromBytes, encoding: 'base64' })
}

/**
 * Create a base80-encoded binary param
 * Shorthand for binaryParam with encoding: 'base80'
 */
export function base80Param<T>(
  toBytes: (value: T) => Uint8Array,
  fromBytes: (bytes: Uint8Array) => T
): Param<T | null> {
  return binaryParam({ toBytes, fromBytes, encoding: 'base80' })
}

// Re-export the alphabets for custom implementations
export { BASE64_CHARS, BASE80_CHARS }
