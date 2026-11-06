// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { TimeSeriesData } from '@perses-dev/spec';

import { ExpressionError } from '../expression-error';
import { evaluateExpression } from '../index';
import type { EvaluationRequest } from '../types';
import { DEFAULT_LIMITS } from './limits';

function ts(values: Array<[number, number | null]>, labels: Record<string, string> = {}): TimeSeriesData {
  return {
    series: [{ name: 'x', labels, values }],
  };
}

function twoSeries(tag: string): TimeSeriesData {
  return {
    series: [
      { name: 'a', labels: { job: tag, instance: '0' }, values: [[0, 1]] as Array<[number, number]> },
      { name: 'b', labels: { job: tag, instance: '1' }, values: [[0, 2]] as Array<[number, number]> },
    ],
  };
}

function req(
  expr: string,
  inputs: Record<number, TimeSeriesData>,
  overrides: Partial<EvaluationRequest> = {},
): EvaluationRequest {
  return {
    expression: expr,
    inputs,
    startMs: 0,
    endMs: 60000,
    stepMs: 15000,
    mode: 'range',
    ...overrides,
  };
}

describe('evaluateExpression', () => {
  it('evaluates a scalar expression', () => {
    const result = evaluateExpression(req('2 + 3', {}));
    expect(result.series[0]?.name).toBe('expression');
    // 5 at every grid point
    for (const [, v] of result.series[0]?.values ?? []) {
      expect(v).toBe(5);
    }
  });

  it('evaluates $1 * 2 on a series', () => {
    const result = evaluateExpression(
      req('$1 * 2', {
        0: ts([
          [0, 1],
          [15000, 2],
          [30000, 3],
          [45000, 4],
        ]),
      }),
    );
    // grid: [0, 15000, 30000, 45000, 60000]; 60000 picks up 45000 within lookback(15000)
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([2, 4, 6, 8, 8]);
  });

  it('evaluates $1 / $2 on two series with equal labels', () => {
    const labels = { job: 'app' };
    const result = evaluateExpression(
      req('$1 / $2', {
        0: ts(
          [
            [0, 10],
            [15000, 20],
            [30000, 30],
            [45000, 40],
          ],
          labels,
        ),
        1: ts(
          [
            [0, 2],
            [15000, 4],
            [30000, 6],
            [45000, 8],
          ],
          labels,
        ),
      }),
    );
    // grid has 5 points, last picks up the 45000 sample
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([5, 5, 5, 5, 5]);
  });

  it('names series as {k="v"} when they have labels', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]], { instance: 'host1' }),
      }),
    );
    expect(result.series[0]?.name).toBe('{instance="host1"}');
  });

  it('uses original name when series has no labels', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]]),
      }),
    );
    expect(result.series[0]?.name).toBe('x');
  });

  it('throws unknown_reference for a missing input', () => {
    expect(() => evaluateExpression(req('$5 + 1', {}))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$5 + 1', {}));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('unknown_reference');
    }
  });

  it('throws syntax error for a bad expression', () => {
    expect(() => evaluateExpression(req('$1 + ', { 0: ts([[0, 1]]) }))).toThrow(ExpressionError);
  });

  it('throws unknown_function for an unknown function', () => {
    expect(() => evaluateExpression(req('bogus($1)', { 0: ts([[0, 1]]) }))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('bogus($1)', { 0: ts([[0, 1]]) }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('unknown_function');
    }
  });

  it('respects an AbortSignal', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => evaluateExpression(req('$1 + $1', { 0: ts([[0, 1]]) }), controller.signal)).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + $1', { 0: ts([[0, 1]]) }), controller.signal);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('aborted');
    }
  });

  it('throws limit_exceeded when maxSeries is exceeded', () => {
    const manySeriesInput: TimeSeriesData = {
      series: Array.from({ length: 5 }, (_, i) => ({
        name: `s${i}`,
        labels: { instance: String(i) },
        values: [[0, i]] as Array<[number, number]>,
      })),
    };
    expect(() => evaluateExpression(req('$1 + 0', { 0: manySeriesInput }, { limits: { maxSeries: 3 } }))).toThrow(
      ExpressionError,
    );
    try {
      evaluateExpression(req('$1 + 0', { 0: manySeriesInput }, { limits: { maxSeries: 3 } }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('sets timeRange, stepMs and metadata on the result', () => {
    const result = evaluateExpression(req('1 + 1', {}));
    expect(result.timeRange).toEqual({ start: new Date(0), end: new Date(60000) });
    expect(result.stepMs).toBe(15000);
  });

  it('applies abs() correctly', () => {
    const result = evaluateExpression(
      req('abs($1)', {
        0: ts([
          [0, -5],
          [15000, 3],
        ]),
      }),
    );
    expect(result.series[0]?.values[0]?.[1]).toBe(5);
    expect(result.series[0]?.values[1]?.[1]).toBe(3);
  });

  it('does not call DEFAULT_LIMITS.maxSeries when using custom limits', () => {
    const result = evaluateExpression(
      req(
        '$1 + 0',
        {
          0: ts([[0, 1]], { job: 'a' }),
        },
        { limits: { maxSeries: DEFAULT_LIMITS.maxSeries } },
      ),
    );
    expect(result.series.length).toBe(1);
  });

  it('aligns two inputs with different stepMs onto the same grid', () => {
    // $1 has step=15000, $2 has step=30000 → shared step=30000, grid=[0,30000,60000]
    const input1: TimeSeriesData = {
      stepMs: 15000,
      series: [
        {
          name: 'a',
          labels: { job: 'x' },
          values: [
            [0, 10],
            [15000, 20],
            [30000, 30],
            [45000, 40],
            [60000, 50],
          ],
        },
      ],
    };
    const input2: TimeSeriesData = {
      stepMs: 30000,
      series: [
        {
          name: 'b',
          labels: { job: 'x' },
          values: [
            [0, 5],
            [30000, 10],
            [60000, 15],
          ],
        },
      ],
    };
    const result = evaluateExpression(req('$1 / $2', { 0: input1, 1: input2 }));
    // grid=[0,30000,60000], $1 at 0→10, 30000→30, 60000→50; $2 at 0→5, 30000→10, 60000→15
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([2, 3, 10 / 3]);
  });

  it('output stepMs reflects the effective step when an input step is larger', () => {
    const input: TimeSeriesData = { stepMs: 60000, series: [{ name: 'x', labels: {}, values: [[0, 1]] }] };
    const result = evaluateExpression(req('$1 * 1', { 0: input }, { stepMs: 15000 }));
    expect(result.stepMs).toBe(60000);
  });

  it('throws limit_exceeded when the grid exceeds maxPointsPerSeries', () => {
    // step=1ms, range=0..100000 → 100001 points, limit=10
    const input: TimeSeriesData = { series: [{ name: 'x', labels: {}, values: [[0, 1]] }] };
    expect(() =>
      evaluateExpression(
        req('$1', { 0: input }, { startMs: 0, endMs: 100000, stepMs: 1, limits: { maxPointsPerSeries: 10 } }),
      ),
    ).toThrow(ExpressionError);
    try {
      evaluateExpression(
        req('$1', { 0: input }, { startMs: 0, endMs: 100000, stepMs: 1, limits: { maxPointsPerSeries: 10 } }),
      );
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('throws limit_exceeded when maxSamples would be exceeded during operations', () => {
    // 1 series × 5 grid points, budget limit=3 → charged 5 during align, already over
    const input: TimeSeriesData = {
      series: [
        {
          name: 'x',
          labels: {},
          values: [
            [0, 1],
            [15000, 2],
            [30000, 3],
            [45000, 4],
            [60000, 5],
          ],
        },
      ],
    };
    expect(() => evaluateExpression(req('$1 + 1', { 0: input }, { limits: { maxSamples: 3 } }))).toThrow(
      ExpressionError,
    );
  });

  it('aborts during alignment when signal is already aborted', () => {
    const controller = new AbortController();
    // Pre-abort, so the signal fires during the per-series alignment loop
    controller.abort();
    const manySeriesInput: TimeSeriesData = {
      series: [
        { name: 's0', labels: { job: 'a' }, values: [[0, 1]] },
        { name: 's1', labels: { job: 'b' }, values: [[0, 2]] },
      ],
    };
    expect(() => evaluateExpression(req('$1 * 1', { 0: manySeriesInput }), controller.signal)).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 * 1', { 0: manySeriesInput }), controller.signal);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('aborted');
    }
  });

  it('escapes double-quotes in label values in the series name', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]], { label: 'val"ue' }),
      }),
    );
    expect(result.series[0]?.name).toBe('{label="val\\"ue"}');
  });

  it('throws limit_exceeded when maxSeries is exceeded across two inputs combined', () => {
    // $1 has 2 series, $2 has 2 series → total 4 > limit 3
    expect(() =>
      evaluateExpression(req('$1 + $2', { 0: twoSeries('a'), 1: twoSeries('b') }, { limits: { maxSeries: 3 } })),
    ).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + $2', { 0: twoSeries('a'), 1: twoSeries('b') }, { limits: { maxSeries: 3 } }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('uses median interval for lookback: irregular samples still resolve within gap', () => {
    // samples at 0, 10000, 30000 → median interval 15000
    // grid step=5000; grid point 25000; last sample ≤ 25000 is at 10000; gap=15000=median → found
    const input: TimeSeriesData = {
      series: [
        {
          name: 'x',
          labels: {},
          values: [
            [0, 0],
            [10000, 1],
            [30000, 2],
          ],
        },
      ],
    };
    const result = evaluateExpression(req('$1', { 0: input }, { startMs: 0, endMs: 30000, stepMs: 5000 }));
    const idx = result.series[0]?.values.findIndex(([t]) => t === 25000) ?? -1;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(result.series[0]?.values[idx]?.[1]).toBe(1);
  });

  it('produces no_match when __name__ collision strips labels to duplicates', () => {
    // {__name__="a", job="x"} and {__name__="b", job="x"} → both become {job="x"} → duplicate → no_match
    const input: TimeSeriesData = {
      series: [
        { name: 'a', labels: { __name__: 'a', job: 'x' }, values: [[0, 1]] as Array<[number, number]> },
        { name: 'b', labels: { __name__: 'b', job: 'x' }, values: [[0, 2]] as Array<[number, number]> },
      ],
    };
    expect(() => evaluateExpression(req('$1 + $1', { 0: input }))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + $1', { 0: input }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('no_match');
    }
  });

  it('instant mode: grid is [endMs], stepMs is requestStepMs', () => {
    const input: TimeSeriesData = { series: [{ name: 'x', labels: {}, values: [[55000, 7]] }] };
    const result = evaluateExpression(
      req('$1', { 0: input }, { startMs: 0, endMs: 60000, stepMs: 15000, mode: 'instant' }),
    );
    expect(result.series[0]?.values).toHaveLength(1);
    expect(result.series[0]?.values[0]?.[0]).toBe(60000);
    expect(result.series[0]?.values[0]?.[1]).toBe(7);
    expect(result.stepMs).toBe(15000);
  });
});
