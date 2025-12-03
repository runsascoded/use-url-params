# @rdub/use-url-params

Type-safe URL query parameter management with minimal, human-readable encoding.

## Features

- 🎯 **Type-safe**: Full TypeScript support with generic `Param<T>` interface
- 📦 **Tiny URLs**: Smart encoding - omit defaults, use short keys, `+` for spaces
- ⚛️ **React hooks**: `useUrlParam()` and `useUrlParams()` for seamless integration
- 🔧 **Framework-agnostic**: Core utilities work anywhere, React hooks are optional
- 🌳 **Tree-shakeable**: ESM + CJS builds with TypeScript declarations
- 0️⃣ **Zero dependencies**: Except React (peer dependency, optional)
- 🔁 **Multi-value params**: Support for repeated keys like `?tag=a&tag=b`
- #️⃣ **Hash params**: Use hash fragment (`#key=value`) instead of query string

## Installation

```bash
npm install @rdub/use-url-params
# or
pnpm add @rdub/use-url-params
```

## Quick Start

```typescript
import { useUrlParam, boolParam, stringParam, intParam } from '@rdub/use-url-params'

function MyComponent() {
  const [zoom, setZoom] = useUrlParam('z', boolParam)
  const [device, setDevice] = useUrlParam('d', stringParam())
  const [count, setCount] = useUrlParam('n', intParam(10))

  // URL: ?z&d=gym&n=5
  // zoom = true, device = "gym", count = 5

  return (
    <div>
      <button onClick={() => setZoom(!zoom)}>Toggle Zoom</button>
      <input value={device ?? ''} onChange={e => setDevice(e.target.value)} />
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  )
}
```

## Built-in Param Types

### Boolean
```typescript
const [enabled, setEnabled] = useUrlParam('e', boolParam)
// ?e → true
// (absent) → false
```

### Strings
```typescript
const [name, setName] = useUrlParam('n', stringParam())           // optional
const [mode, setMode] = useUrlParam('m', defStringParam('auto'))  // with default
// ?n=foo → "foo"
// (absent) → undefined / "auto"
```

### Numbers
```typescript
const [count, setCount] = useUrlParam('c', intParam(0))
const [ratio, setRatio] = useUrlParam('r', floatParam(1.0))
const [id, setId] = useUrlParam('id', optIntParam)  // number | null
// ?c=5&r=1.5&id=123 → 5, 1.5, 123
// (absent) → 0, 1.0, null
```

### Enums
```typescript
const [theme, setTheme] = useUrlParam(
  't',
  enumParam('light', ['light', 'dark', 'auto'] as const)
)
// ?t=dark → "dark"
// ?t=invalid → "light" (warns in console)
```

### Arrays (delimiter-separated)
```typescript
const [tags, setTags] = useUrlParam('tags', stringsParam([], ','))
const [ids, setIds] = useUrlParam('ids', numberArrayParam([]))
// ?tags=foo,bar,baz → ["foo", "bar", "baz"]
// ?ids=1,2,3 → [1, 2, 3]
```

### Multi-value Arrays (repeated keys)
```typescript
import { useMultiUrlParam, multiStringParam } from '@rdub/use-url-params'

const [tags, setTags] = useMultiUrlParam('tag', multiStringParam())
// ?tag=foo&tag=bar&tag=baz → ["foo", "bar", "baz"]
```

## Custom Params

Create your own param encoders/decoders:

```typescript
import type { Param } from '@rdub/use-url-params'

// Example: Compact date encoding (YYMMDD)
const dateParam: Param<Date> = {
  encode: (date) => {
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yy}${mm}${dd}`
  },
  decode: (str) => {
    if (!str || str.length !== 6) return new Date()
    const yy = parseInt('20' + str.slice(0, 2), 10)
    const mm = parseInt(str.slice(2, 4), 10) - 1
    const dd = parseInt(str.slice(4, 6), 10)
    return new Date(yy, mm, dd)
  }
}

const [date, setDate] = useUrlParam('d', dateParam)
// ?d=251123 → Date(2025, 10, 23)
```

## Batch Updates

Use `useUrlParams()` to update multiple parameters atomically:

```typescript
import { useUrlParams, intParam, boolParam } from '@rdub/use-url-params'

const { values, setValues } = useUrlParams({
  page: intParam(1),
  size: intParam(20),
  grid: boolParam
})

// Update multiple params at once (single history entry)
setValues({ page: 2, size: 50 })
```

## URL Encoding

- **Spaces**: Encoded as `+` (standard form-urlencoded)
- **Defaults**: Omitted from URL (keeps URLs minimal)
- **Booleans**: Present = true (`?z`), absent = false
- **Empty values**: Valueless params (`?key` without `=`)

Example:
```typescript
const [devices, setDevices] = useUrlParam('d', stringsParam([], ' '))
setDevices(['gym', 'bedroom'])
// URL: ?d=gym+bedroom
```

## Framework-Agnostic Core

Use the core utilities without React:

```typescript
import { boolParam, serializeParams, parseParams } from '@rdub/use-url-params'

// Encode
const params = { z: boolParam.encode(true), d: 'gym' }
const search = serializeParams(params)  // "z&d=gym"

// Decode
const parsed = parseParams(window.location.search)
const zoom = boolParam.decode(parsed.z)  // true
```

## Hash Params

Use hash fragment (`#key=value`) instead of query string (`?key=value`):

```typescript
// Just change the import path
import { useUrlParam, boolParam } from '@rdub/use-url-params/hash'

const [zoom, setZoom] = useUrlParam('z', boolParam)
// URL: https://example.com/#z (instead of ?z)
```

Same API, different URL location. Useful when query strings conflict with server routing or you want params to survive page reloads without server involvement.

## API Reference

### `useUrlParam<T>(key: string, param: Param<T>, push?: boolean)`

React hook for managing a single URL parameter.

- `key`: Query parameter key
- `param`: Param encoder/decoder
- `push`: Use pushState (true) or replaceState (false, default)
- Returns: `[value: T, setValue: (value: T) => void]`

### `useUrlParams<P>(params: P, push?: boolean)`

React hook for managing multiple URL parameters together.

- `params`: Object mapping keys to Param types
- `push`: Use pushState (true) or replaceState (false, default)
- Returns: `{ values, setValues }`

### `useMultiUrlParam<T>(key: string, param: MultiParam<T>, push?: boolean)`

React hook for managing a multi-value URL parameter (repeated keys).

- `key`: Query parameter key
- `param`: MultiParam encoder/decoder
- `push`: Use pushState (true) or replaceState (false, default)
- Returns: `[value: T, setValue: (value: T) => void]`

### `Param<T>`

Bidirectional encoder/decoder interface:

```typescript
type Param<T> = {
  encode: (value: T) => string | undefined
  decode: (encoded: string | undefined) => T
}
```

### `MultiParam<T>`

Multi-value encoder/decoder interface:

```typescript
type MultiParam<T> = {
  encode: (value: T) => string[]
  decode: (encoded: string[]) => T
}
```

### Core Utilities

- `serializeParams(params)`: Convert params object to URL query string
- `parseParams(source)`: Parse URL string or URLSearchParams to object
- `getCurrentParams()`: Get current URL params (browser only)
- `updateUrl(params, push?)`: Update URL without reloading (browser only)

## Examples

Projects using `@rdub/use-url-params`:

- [runsascoded/awair] – Air quality dashboard with URL-persisted chart settings

  Example: [`awair.runsascoded.com/?d=+br&y=thZ&t=-3d`][awair-example]
  - `d=+br`: show default device + "bedroom" (`+` encodes space, leading space means "include default")
  - `y=thZ`: left axis = temp (`t`), right axis = humidity (`h`), Y-axes don't start from zero (`Z`)
  - `t=-3d`: time range = last 3 days

[runsascoded/awair]: https://github.com/runsascoded/awair
[awair-example]: https://awair.runsascoded.com/?d=+br&y=thZ&t=-3d

## License

MIT
