# Expression Query Plugin

A `TimeSeriesQuery` plugin computing a time series query from the **other time series queries of the panel**, whatever
their datasource (Prometheus, Loki, ClickHouse, Splunk...). It is the Perses equivalent of the Grafana
[expression queries](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/expression-queries/).

The other queries are referenced by their **refId**: the name of the query when it is set, otherwise its position among
the time series queries of the panel (`A` for the first one, `B` for the second one...).

The evaluation is done by the Perses server (`POST /api/v1/expressions/evaluate`), from the results already fetched by the
other queries. Every input is aligned on the step of the panel before being combined.

## Operations

Only the `math` type is available for now. Other types (e.g. Reduce, Resample, Threshold) can be added later: the spec
has a `type` field for that purpose.

| Type   | Description                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `math` | Free-form formula, e.g. `$A / $B * 100`, `abs($A - $B) > 10`. Series are matched on their labels (`__name__` ignored). |

Math operators: `+ - * / % ** == != < <= > >= && || !`.
Math functions: `abs`, `ceil`, `floor`, `round`, `log`, `log10`, `exp`, `sqrt`, `is_null`, `is_nan`, `is_inf`, `is_number`.

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
  - kind: TimeSeriesQuery
    spec:
      plugin:
        kind: ExpressionQuery
        spec:
          type: math
          expression: $A / $B * 100
```

## Development

```bash
npm install
npm run dev
```
