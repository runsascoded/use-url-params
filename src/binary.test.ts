import { describe, it, expect } from 'vitest'
import {
  base64Encode,
  base64Decode,
  base80Encode,
  base80Decode,
  binaryParam,
  base64Param,
  base80Param,
  BASE64_CHARS,
  BASE80_CHARS,
} from './binary'

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

describe('base80', () => {
  describe('encode/decode roundtrip', () => {
    it('handles empty array', () => {
      const bytes = new Uint8Array([])
      const encoded = base80Encode(bytes)
      expect(encoded).toBe('')
      expect(base80Decode(encoded)).toEqual(bytes)
    })

    it('handles single byte', () => {
      const bytes = new Uint8Array([0x41])
      const encoded = base80Encode(bytes)
      expect(base80Decode(encoded)).toEqual(bytes)
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
        const encoded = base80Encode(bytes)
        expect(base80Decode(encoded)).toEqual(bytes)
      }
    })

    it('handles random bytes', () => {
      const bytes = new Uint8Array(100)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
      const encoded = base80Encode(bytes)
      expect(base80Decode(encoded)).toEqual(bytes)
    })

    it('preserves leading zeros', () => {
      const bytes = new Uint8Array([0, 0, 0x41])
      const encoded = base80Encode(bytes)
      const decoded = base80Decode(encoded)
      expect(decoded).toEqual(bytes)
    })
  })

  describe('URL safety', () => {
    it('does not contain & (param delimiter)', () => {
      expect(BASE80_CHARS).not.toContain('&')
    })

    it('alphabet has 80 chars', () => {
      expect(BASE80_CHARS.length).toBe(80)
      expect(new Set(BASE80_CHARS).size).toBe(80)
    })
  })

  describe('density comparison', () => {
    it('base80 is more compact than base64', () => {
      const bytes = new Uint8Array(100)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }

      const b64 = base64Encode(bytes)
      const b80 = base80Encode(bytes)

      // Base80 should be shorter
      expect(b80.length).toBeLessThan(b64.length)

      // Theoretical: base64 = 4/3 expansion, base80 ≈ 8/log2(80) ≈ 1.26 expansion
      // So base80 should be about 5% shorter
    })
  })
})

describe('binaryParam', () => {
  // Simple test: encode/decode array of numbers as raw bytes
  const numbersParam = binaryParam<number[]>({
    toBytes: (nums) => new Uint8Array(nums),
    fromBytes: (bytes) => Array.from(bytes),
    encoding: 'base64',
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

  it('returns null for invalid base64', () => {
    // base80Decode will throw for invalid chars not in its alphabet
    const b80Param = binaryParam<number[]>({
      toBytes: (nums) => new Uint8Array(nums),
      fromBytes: (bytes) => Array.from(bytes),
      encoding: 'base80',
    })
    // '#' is not in base80 alphabet
    expect(b80Param.decode('#invalid')).toBeNull()
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

describe('base80Param', () => {
  it('creates param with base80 encoding', () => {
    const param = base80Param<number[]>(
      (nums) => new Uint8Array(nums),
      (bytes) => Array.from(bytes)
    )
    const encoded = param.encode([1, 2, 3])
    const decoded = param.decode(encoded!)
    expect(decoded).toEqual([1, 2, 3])
  })
})
