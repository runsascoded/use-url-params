import { describe, it, expect } from 'vitest'
import {
  base64Encode,
  base64Decode,
  binaryParam,
  base64Param,
  floatToBytes,
  bytesToFloat,
  BASE64_CHARS,
  ALPHABETS,
  validateAlphabet,
  resolveAlphabet,
} from './binary'
import { floatParam, BitBuffer } from './float'

describe('base64', () => {
  describe('encode/decode roundtrip', () => {
    it('handles empty array', () => {
      const bytes = new Uint8Array([])
      const encoded = base64Encode(bytes)
      expect(encoded).toBe('')
      expect(base64Decode(encoded)).toEqual(bytes)
    })

    it('handles single byte', () => {
      const bytes = new Uint8Array([0x41])
      const encoded = base64Encode(bytes)
      expect(base64Decode(encoded)).toEqual(bytes)
    })

    it('handles two bytes', () => {
      const bytes = new Uint8Array([0x41, 0x42])
      const encoded = base64Encode(bytes)
      expect(base64Decode(encoded)).toEqual(bytes)
    })

    it('handles three bytes (no padding needed)', () => {
      const bytes = new Uint8Array([0x41, 0x42, 0x43])
      const encoded = base64Encode(bytes)
      expect(encoded).toBe('QUJD') // Standard base64 for "ABC"
      expect(base64Decode(encoded)).toEqual(bytes)
    })

    it('handles various byte patterns', () => {
      const testCases = [
        [0x00],
        [0xff],
        [0x00, 0xff],
        [0xff, 0x00],
        [0x00, 0x00, 0x00],
        [0xff, 0xff, 0xff],
        [0x12, 0x34, 0x56, 0x78],
      ]

      for (const arr of testCases) {
        const bytes = new Uint8Array(arr)
        const encoded = base64Encode(bytes)
        expect(base64Decode(encoded)).toEqual(bytes)
      }
    })

    it('handles random bytes', () => {
      const bytes = new Uint8Array(100)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
      const encoded = base64Encode(bytes)
      expect(base64Decode(encoded)).toEqual(bytes)
    })
  })

  describe('URL safety', () => {
    it('uses URL-safe alphabet (no + or /)', () => {
      // Test bytes that would produce + and / in standard base64
      const bytes = new Uint8Array([0xfb, 0xef, 0xbe]) // Would be ++++ in std base64
      const encoded = base64Encode(bytes)
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
    })

    it('alphabet has 64 chars', () => {
      expect(BASE64_CHARS.length).toBe(64)
      expect(new Set(BASE64_CHARS).size).toBe(64)
    })
  })
})

describe('binaryParam', () => {
  // Simple test: encode/decode array of numbers as raw bytes
  const numbersParam = binaryParam<number[]>({
    toBytes: (nums) => new Uint8Array(nums),
    fromBytes: (bytes) => Array.from(bytes),
  })

  it('encodes value to base64', () => {
    const encoded = numbersParam.encode([65, 66, 67])
    expect(encoded).toBe('QUJD') // "ABC" in base64
  })

  it('decodes base64 to value', () => {
    const decoded = numbersParam.decode('QUJD')
    expect(decoded).toEqual([65, 66, 67])
  })

  it('returns undefined for null', () => {
    expect(numbersParam.encode(null)).toBeUndefined()
  })

  it('returns null for undefined/empty', () => {
    expect(numbersParam.decode(undefined)).toBeNull()
    expect(numbersParam.decode('')).toBeNull()
  })

  it('handles empty bytes gracefully', () => {
    // Empty bytes result in undefined encode
    expect(numbersParam.encode([])).toBeUndefined()
  })
})

describe('base64Param', () => {
  it('creates param with base64 encoding', () => {
    const param = base64Param<number[]>(
      (nums) => new Uint8Array(nums),
      (bytes) => Array.from(bytes)
    )
    const encoded = param.encode([1, 2, 3])
    const decoded = param.decode(encoded!)
    expect(decoded).toEqual([1, 2, 3])
  })
})

describe('floatToBytes/bytesToFloat', () => {
  it('roundtrips various floats', () => {
    const values = [0, 1, -1, Math.PI, Math.E, 0.001, -123.456, Infinity, -Infinity]
    for (const v of values) {
      const bytes = floatToBytes(v)
      expect(bytes.length).toBe(8) // 64 bits
      expect(bytesToFloat(bytes)).toBe(v)
    }
  })

  it('preserves NaN (though not bit-for-bit)', () => {
    const bytes = floatToBytes(NaN)
    expect(bytes.length).toBe(8)
    expect(Number.isNaN(bytesToFloat(bytes))).toBe(true)
  })

  it('produces 8 bytes', () => {
    expect(floatToBytes(Math.PI).length).toBe(8)
  })
})

describe('floatParam (lossless base64 default)', () => {
  const param = floatParam(0)

  it('encodes to 11 base64 chars', () => {
    const encoded = param.encode(Math.PI)
    expect(encoded).toBeDefined()
    expect(encoded!.length).toBe(11) // ceil(64/6) = 11
  })

  it('roundtrips exactly', () => {
    const values = [Math.PI, Math.E, 0.1 + 0.2, 123.456789012345]
    for (const v of values) {
      const encoded = param.encode(v)
      const decoded = param.decode(encoded)
      expect(decoded).toBe(v) // Exact equality, not toBeCloseTo
    }
  })

  it('encodes default as undefined', () => {
    expect(param.encode(0)).toBeUndefined()
  })

  it('decodes undefined as default', () => {
    expect(param.decode(undefined)).toBe(0)
    expect(param.decode('')).toBe(0)
  })

  it('produces URL-safe output', () => {
    const encoded = param.encode(Math.PI)!
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })
})

describe('alphabet', () => {
  describe('ALPHABETS presets', () => {
    it('has rfc4648 preset with 64 unique chars', () => {
      expect(ALPHABETS.rfc4648.length).toBe(64)
      expect(new Set(ALPHABETS.rfc4648).size).toBe(64)
    })

    it('has sortable preset with 64 unique chars', () => {
      expect(ALPHABETS.sortable.length).toBe(64)
      expect(new Set(ALPHABETS.sortable).size).toBe(64)
    })

    it('sortable alphabet is ASCII-ordered', () => {
      const chars = ALPHABETS.sortable.split('')
      const sorted = [...chars].sort()
      expect(chars).toEqual(sorted)
    })

    it('both alphabets are URL-safe', () => {
      for (const alphabet of Object.values(ALPHABETS)) {
        expect(alphabet).toMatch(/^[A-Za-z0-9\-_]+$/)
      }
    })
  })

  describe('validateAlphabet', () => {
    it('accepts valid 64-char alphabet', () => {
      expect(() => validateAlphabet(ALPHABETS.rfc4648)).not.toThrow()
      expect(() => validateAlphabet(ALPHABETS.sortable)).not.toThrow()
    })

    it('rejects alphabet with wrong length', () => {
      expect(() => validateAlphabet('abc')).toThrow(/exactly 64 characters/)
      expect(() => validateAlphabet(ALPHABETS.rfc4648 + 'X')).toThrow(/exactly 64 characters/)
    })

    it('rejects alphabet with duplicate characters', () => {
      // Replace last char with 'A' to create duplicate (first char is already 'A')
      const dup = ALPHABETS.rfc4648.slice(0, 63) + 'A'
      expect(() => validateAlphabet(dup)).toThrow(/Duplicate character/)
    })

    it('rejects alphabet with non-URL-safe characters', () => {
      const unsafe = ALPHABETS.rfc4648.slice(0, 63) + '+'
      expect(() => validateAlphabet(unsafe)).toThrow(/non-URL-safe/)
    })
  })

  describe('resolveAlphabet', () => {
    it('resolves preset names', () => {
      expect(resolveAlphabet('rfc4648')).toBe(ALPHABETS.rfc4648)
      expect(resolveAlphabet('sortable')).toBe(ALPHABETS.sortable)
    })

    it('passes through valid custom alphabet', () => {
      const custom = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
      expect(resolveAlphabet(custom)).toBe(custom)
    })

    it('throws for invalid custom alphabet', () => {
      expect(() => resolveAlphabet('invalid')).toThrow()
    })
  })

  describe('encoding with different alphabets', () => {
    const testBytes = new Uint8Array([0x00, 0x10, 0x83, 0x10, 0x51, 0x87, 0x20, 0x92, 0x8b])

    it('produces different output for different alphabets', () => {
      const rfc = base64Encode(testBytes, { alphabet: 'rfc4648' })
      const sortable = base64Encode(testBytes, { alphabet: 'sortable' })
      expect(rfc).not.toBe(sortable)
    })

    it('roundtrips with rfc4648', () => {
      const encoded = base64Encode(testBytes, { alphabet: 'rfc4648' })
      const decoded = base64Decode(encoded, { alphabet: 'rfc4648' })
      expect(decoded).toEqual(testBytes)
    })

    it('roundtrips with sortable', () => {
      const encoded = base64Encode(testBytes, { alphabet: 'sortable' })
      const decoded = base64Decode(encoded, { alphabet: 'sortable' })
      expect(decoded).toEqual(testBytes)
    })

    it('roundtrips with custom alphabet', () => {
      const custom = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
      const encoded = base64Encode(testBytes, { alphabet: custom })
      const decoded = base64Decode(encoded, { alphabet: custom })
      expect(decoded).toEqual(testBytes)
    })

    it('default alphabet is rfc4648', () => {
      const defaultEncoded = base64Encode(testBytes)
      const rfcEncoded = base64Encode(testBytes, { alphabet: 'rfc4648' })
      expect(defaultEncoded).toBe(rfcEncoded)
    })
  })

  describe('sortable alphabet sort stability', () => {
    it('lexicographic sort matches numeric sort for single values', () => {
      // Encode integers as fixed-width bytes and verify sort order is preserved
      const values = [0, 1, 100, 255, 256, 1000, 65535]
      const encoded = values.map(v => {
        // Encode as 2-byte big-endian
        const bytes = new Uint8Array([v >> 8, v & 0xff])
        return base64Encode(bytes, { alphabet: 'sortable' })
      })

      const sortedEncoded = [...encoded].sort()
      const decodedSorted = sortedEncoded.map(e => {
        const bytes = base64Decode(e, { alphabet: 'sortable' })
        return (bytes[0] << 8) | bytes[1]
      })

      expect(decodedSorted).toEqual(values)
    })

    it('rfc4648 does NOT preserve sort order', () => {
      const values = [0, 1, 100, 255, 256, 1000, 65535]
      const encoded = values.map(v => {
        const bytes = new Uint8Array([v >> 8, v & 0xff])
        return base64Encode(bytes, { alphabet: 'rfc4648' })
      })

      const sortedEncoded = [...encoded].sort()
      const decodedSorted = sortedEncoded.map(e => {
        const bytes = base64Decode(e, { alphabet: 'rfc4648' })
        return (bytes[0] << 8) | bytes[1]
      })

      // Should NOT equal original values when sorted lexicographically
      expect(decodedSorted).not.toEqual(values)
    })
  })

  describe('binaryParam with alphabet', () => {
    it('uses custom alphabet when specified', () => {
      const param = binaryParam<number[]>({
        toBytes: (nums) => new Uint8Array(nums),
        fromBytes: (bytes) => Array.from(bytes),
        alphabet: 'sortable',
      })

      const defaultParam = binaryParam<number[]>({
        toBytes: (nums) => new Uint8Array(nums),
        fromBytes: (bytes) => Array.from(bytes),
      })

      const value = [65, 66, 67]
      const sortableEncoded = param.encode(value)
      const defaultEncoded = defaultParam.encode(value)

      // Different alphabets produce different output
      expect(sortableEncoded).not.toBe(defaultEncoded)

      // Both roundtrip correctly
      expect(param.decode(sortableEncoded!)).toEqual(value)
      expect(defaultParam.decode(defaultEncoded!)).toEqual(value)
    })
  })

  describe('BitBuffer with alphabet', () => {
    it('toBase64 and fromBase64 accept alphabet option', () => {
      const buf = new BitBuffer()
      buf.encodeInt(42, 8)
      buf.encodeInt(123, 16)

      const sortable = buf.toBase64({ alphabet: 'sortable' })
      const rfc = buf.toBase64({ alphabet: 'rfc4648' })

      expect(sortable).not.toBe(rfc)

      // Roundtrip
      const decoded1 = BitBuffer.fromBase64(sortable, { alphabet: 'sortable' })
      decoded1.seek(0)
      expect(decoded1.decodeInt(8)).toBe(42)
      expect(decoded1.decodeInt(16)).toBe(123)

      const decoded2 = BitBuffer.fromBase64(rfc, { alphabet: 'rfc4648' })
      decoded2.seek(0)
      expect(decoded2.decodeInt(8)).toBe(42)
      expect(decoded2.decodeInt(16)).toBe(123)
    })
  })

  describe('floatParam with alphabet', () => {
    it('uses custom alphabet when specified', () => {
      const sortableParam = floatParam({ default: 0, alphabet: 'sortable' })
      const defaultParam = floatParam({ default: 0 })

      const value = Math.PI
      const sortableEncoded = sortableParam.encode(value)
      const defaultEncoded = defaultParam.encode(value)

      expect(sortableEncoded).not.toBe(defaultEncoded)

      // Both roundtrip correctly
      expect(sortableParam.decode(sortableEncoded)).toBe(value)
      expect(defaultParam.decode(defaultEncoded)).toBe(value)
    })
  })
})

describe('BitBuffer bit-aligned encoding', () => {
  it('encodes directly to base64 (6 bits per char)', () => {
    const buf = new BitBuffer()
    buf.encodeInt(0b111111, 6) // Single 6-bit value = 1 char
    expect(buf.toBase64().length).toBe(1)
  })

  it('78 bits produces 13 chars (not 14 from byte-aligned)', () => {
    const buf = new BitBuffer()
    buf.encodeInt(0, 78)
    // 78 bits → ceil(78/6) = 13 chars
    // Byte-aligned would be: ceil(78/8) = 10 bytes → ceil(10*8/6) = 14 chars
    expect(buf.toBase64().length).toBe(13)
  })

  it('50 bits produces 9 chars (not 10 from byte-aligned)', () => {
    const buf = new BitBuffer()
    buf.encodeInt(0, 50)
    // 50 bits → ceil(50/6) = 9 chars (with 4 padding bits)
    // Byte-aligned would be: ceil(50/8) = 7 bytes → ceil(7*8/6) = 10 chars
    expect(buf.toBase64().length).toBe(9)
  })

  it('roundtrips arbitrary bit counts', () => {
    for (const bitCount of [1, 5, 6, 7, 12, 13, 17, 23, 24, 25, 48, 50, 78, 100]) {
      const buf = new BitBuffer()
      const value = (1 << Math.min(bitCount, 30)) - 1 // Max value that fits
      buf.encodeInt(value, Math.min(bitCount, 30))
      if (bitCount > 30) {
        buf.encodeInt(0, bitCount - 30) // Pad remaining bits
      }

      const encoded = buf.toBase64()
      const decoded = BitBuffer.fromBase64(encoded)

      expect(decoded.decodeInt(Math.min(bitCount, 30))).toBe(value)
    }
  })

  it('roundtrips with different alphabets', () => {
    const buf = new BitBuffer()
    buf.encodeInt(12345, 20)
    buf.encodeInt(67890, 20)

    for (const alphabet of ['rfc4648', 'sortable'] as const) {
      const encoded = buf.toBase64({ alphabet })
      const decoded = BitBuffer.fromBase64(encoded, { alphabet })

      expect(decoded.decodeInt(20)).toBe(12345)
      expect(decoded.decodeInt(20)).toBe(67890)
    }
  })

  it('throws on invalid base64 character', () => {
    expect(() => BitBuffer.fromBase64('ABC+DEF')).toThrow(/Invalid base64 character/)
  })
})
