# use-prms

[![npm version](https://img.shields.io/npm/v/use-prms)](https://www.npmjs.com/package/use-prms)
[![license](https://img.shields.io/npm/l/use-prms)](https://github.com/runsascoded/use-prms/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/use-prms)](https://bundlephobia.com/package/use-prms)

Type-safe URL-parameter (query and hash) management with minimal, human-readable encoding and decoding.

<!-- `toc` -->
- [Features](#features)
- [Installation](#install)
- [Quick Start](#quick-start)
- [Built-in Param Types](#param-types)
- [Custom Params](#custom)
- [Batch Updates](#batch)
- [URL Encoding](#encoding)
- [Framework-Agnostic Core](#core)
- [Hash Params](#hash)
- [API Reference](#api)
- [Examples](#examples)
- [License](#license)

## Features <a id="features"></a>

- 🎯 **Type-safe**: Full TypeScript support with generic `Param<T>` interface
- 📦 **Tiny URLs**: Smart encoding - omit defaults, use short keys, `+` for spaces
- ⚛️ **React hooks**: `useUrlParam()` and `useUrlParams()` for seamless integration
- 🔧 **Framework-agnostic**: Core utilities work anywhere, React hooks are optional
- 🌳 **Tree-shakeable**: ESM + CJS builds with TypeScript declarations
- 0️⃣ **Zero dependencies**: Except React (peer dependency, optional)
- 🔁 **Multi-value params**: Support for repeated keys like `?tag=a&tag=b`
- #️⃣ **Hash params**: Use hash fragment (`#key=value`) instead of query string

## Installation <a id="install"></a>

```bash
npm install use-prms
```
Or:
```bash
pnpm add use-prms
```

## Quick Start <a id="quick-start"></a>

```typescript
import { useUrlParam, boolParam, stringParam, intParam } from 'use-prms'

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

## Built-in Param Types <a id="param-types"></a>

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
import { useMultiUrlParam, multiStringParam, multiIntParam } from 'use-prms'

const [tags, setTags] = useMultiUrlParam('tag', multiStringParam())
// ?tag=foo&tag=bar&tag=baz → ["foo", "bar", "baz"]

const [ids, setIds] = useMultiUrlParam('id', multiIntParam())
// ?id=1&id=2&id=3 → [1, 2, 3]

// Also available: multiFloatParam()
```

### Compact Code Mapping
```typescript
// Single value with short codes
const [metric, setMetric] = useUrlParam('y', codeParam('Rides', {
  Rides: 'r',
  Minutes: 'm',
}))
// ?y=m → "Minutes", omitted for default "Rides"

// Multi-value with short codes (omits when all selected)
const [regions, setRegions] = useUrlParam('r', codesParam(
  ['NYC', 'JC', 'HOB'],
  { NYC: 'n', JC: 'j', HOB: 'h' }
))
// ?r=nj → ["NYC", "JC"], omitted when all three selected
```

### Pagination
```typescript
const [page, setPage] = useUrlParam('p', paginationParam(20))
// Encodes offset + pageSize compactly using + as delimiter:
// { offset: 0, pageSize: 20 } → (omitted)
// { offset: 0, pageSize: 50 } → ?p=+50
// { offset: 100, pageSize: 20 } → ?p=100
// { offset: 100, pageSize: 50 } → ?p=100+50
```

## Custom Params <a id="custom"></a>

Create your own param encoders/decoders:

```typescript
import type { Param } from 'use-prms'

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

## Batch Updates <a id="batch"></a>

Use `useUrlParams()` to update multiple parameters atomically:

```typescript
import { useUrlParams, intParam, boolParam } from 'use-prms'

const { values, setValues } = useUrlParams({
  page: intParam(1),
  size: intParam(20),
  grid: boolParam
})

// Update multiple params at once (single history entry)
setValues({ page: 2, size: 50 })
```

## URL Encoding <a id="encoding"></a>

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

## Framework-Agnostic Core <a id="core"></a>

Use the core utilities without React:

```typescript
import { boolParam, serializeMultiParams, parseMultiParams } from 'use-prms'

// Encode
const params = { z: [boolParam.encode(true) ?? ''], d: ['gym'] }
const search = serializeMultiParams(params)  // "z&d=gym"

// Decode
const parsed = parseMultiParams(window.location.search)
const zoom = boolParam.decode(parsed.z?.[0])  // true
```

## Hash Params <a id="hash"></a>

Use hash fragment (`#key=value`) instead of query string (`?key=value`):

```typescript
// Just change the import path
import { useUrlParam, boolParam } from 'use-prms/hash'

const [zoom, setZoom] = useUrlParam('z', boolParam)
// URL: https://example.com/#z (instead of ?z)
```

Same API, different URL location. Useful when query strings conflict with server routing or you want params to survive page reloads without server involvement.

## API Reference <a id="api"></a>

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

### Built-in Param Types

| Param | Type | Description |
|-------|------|-------------|
| `boolParam` | `Param<boolean>` | `?key` = true, absent = false |
| `stringParam(init?)` | `Param<string \| undefined>` | Optional string |
| `defStringParam(init)` | `Param<string>` | Required string with default |
| `intParam(init)` | `Param<number>` | Integer with default |
| `floatParam(init)` | `Param<number>` | Float with default |
| `optIntParam` | `Param<number \| null>` | Optional integer |
| `enumParam(init, values)` | `Param<T>` | Validated enum |
| `stringsParam(init?, delim?)` | `Param<string[]>` | Delimiter-separated strings |
| `numberArrayParam(init?)` | `Param<number[]>` | Comma-separated numbers |
| `codeParam(init, codeMap)` | `Param<T>` | Enum with short URL codes |
| `codesParam(allValues, codeMap, sep?)` | `Param<T[]>` | Multi-value with short codes |
| `paginationParam(defaultSize, validSizes?)` | `Param<Pagination>` | Offset + page size |

### Built-in MultiParam Types

| Param | Type | Description |
|-------|------|-------------|
| `multiStringParam(init?)` | `MultiParam<string[]>` | Repeated string params |
| `multiIntParam(init?)` | `MultiParam<number[]>` | Repeated integer params |
| `multiFloatParam(init?)` | `MultiParam<number[]>` | Repeated float params |

### Core Utilities

- `serializeParams(params)`: Convert params object to URL query string *(deprecated, use `serializeMultiParams`)*
- `parseParams(source)`: Parse URL string or URLSearchParams to object *(deprecated, use `parseMultiParams`)*
- `serializeMultiParams(params)`: Convert multi-value params to URL query string
- `parseMultiParams(source)`: Parse URL to multi-value params object
- `getCurrentParams()`: Get current URL params (browser only)
- `updateUrl(params, push?)`: Update URL without reloading (browser only)

## Examples <a id="examples"></a>

Projects using `use-prms`:

- **[awair.runsascoded.com]** – Air quality dashboard ([GitHub][awair-gh], [usage][awair-search])

  Example: [`?d=+br&y=thZ&t=-3d`][awair-example]
  - `d=+br`: devices (leading space = "include default")
  - `y=thZ`: Y-axes config
  - `t=-3d`: time range

- **[ctbk.dev]** – Citi Bike trip data explorer ([GitHub][ctbk-gh], [usage][ctbk-search])

- **[kbd.rbw.sh]** – Keyboard shortcut manager demo site ([GitHub][use-kbd-gh], [usage][use-kbd-search])

[awair.runsascoded.com]: https://awair.runsascoded.com
[awair-gh]: https://github.com/runsascoded/awair
[awair-search]: https://github.com/search?q=repo%3Arunsascoded%2Fawair+use-prms&type=code
[awair-example]: https://awair.runsascoded.com/?d=+br&y=thZ&t=-3d

[ctbk.dev]: https://ctbk.dev
[ctbk-gh]: https://github.com/hudcostreets/ctbk.dev
[ctbk-search]: https://github.com/search?q=repo%3Ahudcostreets%2Fctbk.dev+use-prms&type=code

[kbd.rbw.sh]: https://kbd.rbw.sh
[use-kbd-gh]: https://github.com/runsascoded/use-kbd
[use-kbd-search]: https://github.com/search?q=repo%3Arunsascoded%2Fuse-kbd+use-prms&type=code

## License <a id="license"></a>

MIT
