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
import type { AlignRequest } from './align';
import { alignInput, buildGrid, buildSharedGrid } from './align';
import { DEFAULT_LIMITS, SampleBudget } from './limits';

function input(values: Array<[number, number | null]>, stepMs?: number): TimeSeriesData {
  return {
    stepMs,
    series: [{ name: 's', labels: {}, values }],
  };
}

const START = 1000;
const END = 61000;
const STEP = 15000;
// grid: [1000, 16000, 31000, 46000, 61000]
const DEFAULT_GRID = buildGrid(START, END, STEP);

function makeReq(grid: number[], effectiveStepMs: number, overrides: Partial<AlignRequest> = {}): AlignRequest {
  return {
    grid,
    effectiveStepMs,
    mode: 'range',
    input: input([
      [1000, 1],
      [16000, 2],
      [31000, 3],
      [46000, 4],
    ]),
    budget: new SampleBudget(DEFAULT_LIMITS),
    ...overrides,
  };
}

describe('buildGrid', () => {
  it('builds a range grid from start to end inclusive', () => {
    expect(buildGrid(0, 30000, 10000)).toEqual([0, 10000, 20000, 30000]);
  });

  it('builds a grid that does not overshoot end', () => {
    expect(buildGrid(0, 25000, 10000)).toEqual([0, 10000, 20000]);
  });
});

describe('buildSharedGrid', () => {
  it('uses max step across inputs', () => {
    const result = buildSharedGrid({
      startMs: 0,
      endMs: 60000,
      requestStepMs: 10000,
      mode: 'range',
      inputs: [
        { series: [], stepMs: 30000 },
        { series: [], stepMs: 15000 },
      ],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.effectiveStepMs).toBe(30000);
  });

  it('snaps grid to earliest sample across all inputs', () => {
    const result = buildSharedGrid({
      startMs: 1000,
      endMs: 61000,
      requestStepMs: 15000,
      mode: 'range',
      inputs: [
        input([
          [500, 1],
          [15500, 2],
        ]),
      ],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid[0]).toBe(500);
  });

  it('instant mode returns only [endMs]', () => {
    const result = buildSharedGrid({
      startMs: 0,
      endMs: 60000,
      requestStepMs: 15000,
      mode: 'instant',
      inputs: [],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid).toEqual([60000]);
  });

  it('throws limit_exceeded when projected points exceed maxPointsPerSeries', () => {
    expect(() =>
      buildSharedGrid({
        startMs: 0,
        endMs: 100000,
        requestStepMs: 1,
        mode: 'range',
        inputs: [],
        maxPointsPerSeries: 10,
      }),
    ).toThrow(ExpressionError);
    try {
      buildSharedGrid({
        startMs: 0,
        endMs: 100000,
        requestStepMs: 1,
        mode: 'range',
        inputs: [],
        maxPointsPerSeries: 10,
      });
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('throws limit_exceeded when snapping pushes projected count over the limit', () => {
    // startMs=1000, stepMs=500, inputStart=501 → snapped gridStart=501
    // projected = floor((3000 - 501) / 500) + 1 = floor(2499/500) + 1 = 4+1 = 5 > limit 4
    expect(() =>
      buildSharedGrid({
        startMs: 1000,
        endMs: 3000,
        requestStepMs: 500,
        mode: 'range',
        inputs: [input([[501, 1]])],
        maxPointsPerSeries: 4,
      }),
    ).toThrow(ExpressionError);
    try {
      buildSharedGrid({
        startMs: 1000,
        endMs: 3000,
        requestStepMs: 500,
        mode: 'range',
        inputs: [input([[501, 1]])],
        maxPointsPerSeries: 4,
      });
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });
});

describe('alignInput', () => {
  it('aligns samples to grid using lookback', () => {
    const result = alignInput(makeReq(DEFAULT_GRID, STEP));
    expect(result.series[0]?.values).toEqual([1, 2, 3, 4, 4]);
  });

  it('produces null when no sample is within lookback', () => {
    // step=30000, sample only at 1000; grid [1000, 31000, 61000, 91000]
    // at 61000: 61000-1000=60000 > lookback(30000) → null
    const grid = buildGrid(1000, 91000, 30000);
    const result = alignInput(
      makeReq(grid, 30000, {
        input: input([[1000, 99]]),
      }),
    );
    expect(result.series[0]?.values[0]).toBe(99); // 1000: sample at 1000
    expect(result.series[0]?.values[1]).toBe(99); // 31000: 31000-1000=30000 ≤ lookback
    expect(result.series[0]?.values[2]).toBeNull(); // 61000: 61000-1000=60000 > 30000
  });

  it('instant mode uses 5-minute lookback (not effectiveStepMs)', () => {
    // sample 60000ms before the grid point: within 5-min window
    const grid = [61000];
    const result = alignInput(
      makeReq(grid, STEP, {
        mode: 'instant',
        input: input([[1000, 42]]),
      }),
    );
    expect(result.series[0]?.values[0]).toBe(42);
  });

  it('drops __name__ label', () => {
    const result = alignInput(
      makeReq(DEFAULT_GRID, STEP, {
        input: {
          series: [{ name: 'n', labels: { __name__: 'foo', job: 'bar' }, values: [[1000, 1]] }],
        },
      }),
    );
    expect(Object.keys(result.series[0]?.labels ?? {})).not.toContain('__name__');
    expect(result.series[0]?.labels).toEqual({ job: 'bar' });
  });

  it('handles unsorted input by sorting before alignment', () => {
    const result = alignInput(
      makeReq(DEFAULT_GRID, STEP, {
        input: input([
          [46000, 4],
          [1000, 1],
          [31000, 3],
          [16000, 2],
        ]),
      }),
    );
    expect(result.series[0]?.values).toEqual([1, 2, 3, 4, 4]);
  });

  it('uses input stepMs for lookback when it is larger than the effective step', () => {
    // input.stepMs=60000, effective=15000 → lookback=60000
    // sample at 1000; grid points 1000, 16000, 31000, 46000, 61000
    // at 61000: 61000-1000=60000 ≤ lookback(60000) → found
    const result = alignInput(
      makeReq(DEFAULT_GRID, STEP, {
        input: { series: [{ name: 's', labels: {}, values: [[1000, 7]] }], stepMs: 60000 },
      }),
    );
    expect(result.series[0]?.values[4]).toBe(7); // 61000 still within lookback
  });

  it('uses median interval for lookback when it is larger than the effective step', () => {
    // irregular samples at 0, 10000, 30000 → intervals [10000, 20000], median=10000
    // but the irregular gap: at 0→0, 10000→1, 30000→2
    // grid at 25000; effective step = 5000; input.stepMs=undefined; median=15000
    // lookback = max(5000, 0, 15000) = 15000; 25000 - 10000 = 15000 ≤ 15000 → found (value=1)
    const grid = buildGrid(0, 30000, 5000);
    const result = alignInput(
      makeReq(grid, 5000, {
        input: input([
          [0, 0],
          [10000, 1],
          [30000, 2],
        ]),
      }),
    );
    // at 25000: last sample ≤ 25000 is at 10000; gap=15000; median=15000 → found
    const idx = grid.indexOf(25000);
    expect(result.series[0]?.values[idx]).toBe(1);
  });
});
