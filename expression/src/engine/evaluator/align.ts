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
import type { SampleBudget } from './limits';
import type { Sample, Series } from './values';
import { freezeLabels } from './values';

export interface AlignRequest {
  /** Pre-built shared grid (timestamps in ms). */
  grid: number[];
  /** Effective step already computed by the caller, used for lookback only. */
  effectiveStepMs: number;
  mode?: 'range' | 'instant';
  input: TimeSeriesData;
  budget: SampleBudget;
  signal?: AbortSignal;
}

export interface AlignedInput {
  series: Series[];
}

function medianInterval(sorted: Array<[number, number | null]>): number | null {
  if (sorted.length < 2) return null;
  const diffs: number[] = [];
  let prev: number | undefined;
  for (const [ts] of sorted) {
    if (prev !== undefined) diffs.push(ts - prev);
    prev = ts;
  }
  return diffs.toSorted((a, b) => a - b)[Math.floor(diffs.length / 2)] ?? null;
}

export interface SharedGridRequest {
  startMs: number;
  endMs: number;
  requestStepMs?: number;
  mode?: 'range' | 'instant';
  inputs: TimeSeriesData[];
  maxPointsPerSeries: number;
}

export interface SharedGrid {
  grid: number[];
  effectiveStepMs: number;
}

export function buildSharedGrid(req: SharedGridRequest): SharedGrid {
  const { startMs, endMs, mode = 'range', maxPointsPerSeries } = req;

  if (mode === 'instant') {
    return { grid: [endMs], effectiveStepMs: req.requestStepMs ?? endMs - startMs };
  }

  // effective step: max of request step and all input steps
  let stepMs = req.requestStepMs ?? 0;
  for (const input of req.inputs) {
    if (input.stepMs) {
      stepMs = Math.max(stepMs, input.stepMs);
    }
  }
  if (stepMs <= 0) {
    stepMs = Math.max(1, Math.round((endMs - startMs) / 1000));
  }

  // find the earliest timestamp across all inputs for snapping
  let inputStartMs: number | null = null;
  for (const input of req.inputs) {
    for (const s of input.series) {
      for (const [ts] of s.values) {
        if (inputStartMs === null || ts < inputStartMs) {
          inputStartMs = ts;
        }
      }
    }
  }

  // snap start back if earliest input sample is within one step before start
  let gridStart = startMs;
  if (inputStartMs !== null && inputStartMs < startMs && startMs - inputStartMs <= stepMs) {
    gridStart = inputStartMs;
  }

  // check grid size before allocating to avoid OOM
  const projectedPoints = Math.floor((endMs - gridStart) / stepMs) + 1;
  if (projectedPoints > maxPointsPerSeries) {
    throw new ExpressionError({
      code: 'limit_exceeded',
      message: `grid would have ${projectedPoints} points, max is ${maxPointsPerSeries}`,
    });
  }

  const grid = buildGrid(gridStart, endMs, stepMs);
  return { grid, effectiveStepMs: stepMs };
}

export function buildGrid(gridStart: number, endMs: number, stepMs: number): number[] {
  const grid: number[] = [];
  for (let t = gridStart; t <= endMs; t += stepMs) {
    grid.push(t);
  }
  return grid;
}

export function alignInput(req: AlignRequest): AlignedInput {
  const { grid, effectiveStepMs, mode = 'range', input, budget, signal } = req;

  const lookbackMs = mode === 'instant' ? 5 * 60 * 1000 : effectiveStepMs;

  const alignedSeries: Series[] = [];
  for (const s of input.series) {
    if (signal?.aborted) {
      throw new ExpressionError({ code: 'aborted', message: 'evaluation was aborted' });
    }

    // drop __name__ from labels
    const rawLabels: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.labels ?? {})) {
      if (k !== '__name__') {
        rawLabels[k] = v;
      }
    }
    const { labels, key } = freezeLabels(rawLabels);

    // sort samples by timestamp only if needed (datasource output is usually already sorted)
    let sorted = s.values as Array<[number, number | null]>;
    let needsSort = false;
    for (let si = 1; si < sorted.length; si++) {
      if ((sorted[si - 1] as [number, number | null])[0] > (sorted[si] as [number, number | null])[0]) {
        needsSort = true;
        break;
      }
    }
    if (needsSort) {
      sorted = sorted.slice().sort(([a], [b]) => a - b);
    }

    const seriesLookback = Math.max(lookbackMs, input.stepMs ?? 0, medianInterval(sorted) ?? 0);

    const values: Sample[] = [];
    // forward pointer: j is the index of the last sample ≤ gridPoint
    let j = 0;
    for (const gridPoint of grid) {
      budget.charge(1);
      // advance pointer while next sample is still ≤ gridPoint
      let next = sorted[j + 1];
      while (next !== undefined && next[0] <= gridPoint) {
        j++;
        next = sorted[j + 1];
      }
      const entry = sorted[j];
      let found: Sample = null;
      if (entry !== undefined && entry[0] <= gridPoint && gridPoint - entry[0] <= seriesLookback) {
        found = entry[1];
      }
      values.push(found);
    }

    alignedSeries.push({ name: s.name, labels, key, values });
  }

  return { series: alignedSeries };
}
