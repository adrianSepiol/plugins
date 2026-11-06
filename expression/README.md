# Expression Query Plugin

An `ExpressionQuery` plugin computing a time series from the **other time series queries of the panel**, whatever their
datasource (Prometheus, Loki, ClickHouse...).

The other queries are referenced by their 1-based position: `$1` for the first query, `$2` for the second, and so on.

The evaluation runs **entirely in the browser** — no server round-trip is needed. Every input is aligned on a common
time grid before being combined.

## Operations

Only `math` is available now. Other types (Reduce, Resample, Threshold) can be added later via the `type` field.

| Type   | Description |
| ------ | ----------- |
| `math` | Free-form math formula on the other queries, e.g. `$1 / $2 * 100`. Series with exactly equal label sets are combined. |

## Language

### Grammar and precedence

An expression is built from numbers, query references, function calls and operators.

Operator precedence from lowest to highest:

| Level | Operators          | Associativity |
| ----- | ------------------ | ------------- |
| 1     | `\|\|`             | left          |
| 2     | `&&`               | left          |
| 3     | `== != < <= > >=`  | left          |
| 4     | `+ -`              | left          |
| 5     | `* / %`            | left          |
| 6     | unary `- + !`      | (prefix)      |
| 7     | `**`               | **right**     |

Parentheses override precedence as usual.

Important: unary minus is **looser** than `**`, so `-2 ** 2` is `-(2 ** 2)` = `-4`, not `(-2) ** 2` = `4`.

### References

Queries are referenced by their **1-based position** in the panel's query list:

```
$1   first query
$2   second query
$3   third query
```

`$0` is an error. Named references like `${name}` are reserved for a future release.

### Numbers, null, NaN and Inf

Numeric literals: `42`, `3.14`, `1.5e3`. IEEE-754 rules apply throughout.

- `x / 0` = `Inf` (not an error).
- `0 / 0` = `NaN`.
- `null` propagates: any operation involving a `null` sample returns `null`.
- `NaN` and `Inf` are valid sample values; use `is_nan()` / `is_inf()` to test them.

### Functions

All functions take exactly one argument and operate sample-by-sample. Math functions pass `null` through unchanged.

| Function    | Description |
| ----------- | ----------- |
| `abs(x)`    | Absolute value |
| `ceil(x)`   | Round up to nearest integer |
| `floor(x)`  | Round down to nearest integer |
| `round(x)`  | Round to nearest integer |
| `log(x)`    | Natural logarithm |
| `log10(x)`  | Base-10 logarithm |
| `exp(x)`    | e^x |
| `sqrt(x)`   | Square root |
| `is_null(x)`   | 1 if null, else 0 |
| `is_nan(x)`    | 1 if NaN, else 0 (null → 0) |
| `is_inf(x)`    | 1 if ±Inf, else 0 (null → 0) |
| `is_number(x)` | 1 if finite and not null, else 0 |

### Alignment

Before any operation the inputs are placed on a common **time grid**.

**Step**: the largest of the request's `suggestedStepMs` and each input's own `stepMs`. If none is set, `(end − start) / 1000`, minimum 1 ms.

**Grid** (range mode): timestamps from `start` to `end`, spaced by `step`. The grid is snapped back to the
earliest sample timestamp across **all inputs** if it falls within one step before `start`.

**Lookback**: the larger of `step`, the input's `stepMs`, and the series' median sample interval. A grid point takes the **last sample at or before it** that falls within the lookback window; otherwise the point is `null`.

**Instant mode**: the grid is a single point `[end]`. The lookback is the larger of 5 minutes, the input's `stepMs`, and the series' median sample interval.

`__name__` is stripped from labels before matching.

### Strict matching

When combining two `SeriesSet` values (series × series), labels must be **exactly equal** after stripping `__name__`:

```
# works — both sides have {job="api"}
$1 / $2   (where both $1 and $2 have series with labels {job="api"})

# drops the "db" series — no pair on the right side
$1 + $2   where $1 has {job="api"} and {job="db"}, but $2 only has {job="api"}
     └─── output: only {job="api"} ───┘
```

Note: two metrics with the same non-`__name__` labels will collide after `__name__` is stripped, and will produce a
`no_match` (duplicate label set) error.

Errors:
- Both sides are non-empty with **zero pairs** → `no_match` (shows one example label set from each side).
- Either side has **duplicate label sets** → `no_match`.

Scalar × series and series × scalar always succeed (the scalar is broadcast to every point).

### Limits

| Limit              | Default       | Description |
| ------------------ | ------------- | ----------- |
| `maxSeries`        | 1 000         | Max total series across all referenced inputs |
| `maxPointsPerSeries` | 11 000      | Max grid points; checked before the grid is allocated |
| `maxSamples`       | 5 000 000     | Total sample-point budget charged across alignment and all operations |

Exceeding any limit raises `limit_exceeded`.

### Error codes

| Code                 | Cause |
| -------------------- | ----- |
| `syntax`             | Unparseable expression, bad character, `$0`, `${`, unclosed paren, depth > 64, length > 4096 |
| `unknown_function`   | Function name not in the registry |
| `unknown_reference`  | `$N` used but query N is not in `inputs` |
| `no_match`           | Series matching failed (disjoint labels or duplicate label set) |
| `limit_exceeded`     | A query limit was exceeded |
| `aborted`            | The `AbortSignal` was triggered |

## Example

```yaml
queries:
  - kind: TimeSeriesQuery
    spec:
      plugin:
        kind: PrometheusTimeSeriesQuery
        spec:
          query: sum by (job) (rate(http_requests_total{code=~"5.."}[5m]))
  - kind: TimeSeriesQuery
    spec:
      plugin:
        kind: PrometheusTimeSeriesQuery
        spec:
          query: sum by (job) (rate(http_requests_total[5m]))
  - kind: ExpressionQuery
    spec:
      plugin:
        kind: ExpressionQuery
        spec:
          type: math
          expression: $1 / $2 * 100
```

## Development

```bash
npm install
npm run dev
```
