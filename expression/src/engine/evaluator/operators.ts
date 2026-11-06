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

import { ExpressionError } from '../expression-error';
import type { BinaryOp, UnaryOp } from '../parser/expression-tree';
import type { SampleBudget } from './limits';
import type { Sample, Series, SeriesSet, Value } from './values';

// ── per-sample arithmetic ──────────────────────────────────────────────────

function applyBinaryToSamples(op: BinaryOp, a: Sample, b: Sample): Sample {
  if (a === null || b === null) return null;
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    case '%':
      return a % b;
    case '**':
      return a ** b;
    case '==':
      return a === b ? 1 : 0;
    case '!=':
      return a !== b ? 1 : 0;
    case '<':
      return a < b ? 1 : 0;
    case '<=':
      return a <= b ? 1 : 0;
    case '>':
      return a > b ? 1 : 0;
    case '>=':
      return a >= b ? 1 : 0;
    case '&&':
      return a !== 0 && b !== 0 ? 1 : 0;
    case '||':
      return a !== 0 || b !== 0 ? 1 : 0;
  }
}

function applyUnaryToSample(op: UnaryOp, a: Sample): Sample {
  if (a === null) return null;
  switch (op) {
    case '-':
      return -a;
    case '+':
      return a;
    case '!':
      return a === 0 ? 1 : 0;
  }
}

// ── unary ──────────────────────────────────────────────────────────────────

export function applyUnary(op: UnaryOp, val: Value, budget: SampleBudget): Value {
  if (val.kind === 'scalar') {
    return { kind: 'scalar', value: applyUnaryToSample(op, val.value) };
  }
  const pointCount = val.series.length * val.grid.length;
  budget.charge(pointCount);
  return {
    kind: 'series',
    grid: val.grid,
    series: val.series.map((s) => ({
      ...s,
      values: s.values.map((v) => applyUnaryToSample(op, v)),
    })),
  };
}

// ── binary ─────────────────────────────────────────────────────────────────

export function applyBinary(op: BinaryOp, left: Value, right: Value, budget: SampleBudget): Value {
  // scalar: return scalar×scalar, or broadcast onto right if it's a series
  if (left.kind === 'scalar') {
    if (right.kind === 'scalar') {
      return { kind: 'scalar', value: applyBinaryToSamples(op, left.value, right.value) };
    }
    const pointCount = right.series.length * right.grid.length;
    budget.charge(pointCount);
    return {
      kind: 'series',
      grid: right.grid,
      series: right.series.map((s) => ({
        ...s,
        values: s.values.map((v) => applyBinaryToSamples(op, left.value, v)),
      })),
    };
  }

  // right is scalar: broadcast onto left
  if (right.kind === 'scalar') {
    const pointCount = left.series.length * left.grid.length;
    budget.charge(pointCount);
    return {
      kind: 'series',
      grid: left.grid,
      series: left.series.map((s) => ({
        ...s,
        values: s.values.map((v) => applyBinaryToSamples(op, v, right.value)),
      })),
    };
  }

  // both sides are SeriesSet
  return strictMatch(op, left, right, budget);
}

function strictMatch(op: BinaryOp, left: SeriesSet, right: SeriesSet, budget: SampleBudget): SeriesSet {
  // grids must be identical (guaranteed by shared-grid design; check defensively)
  if (left.grid.length !== right.grid.length) {
    throw new ExpressionError({
      code: 'no_match',
      message: `series operands have different grid lengths (${left.grid.length} vs ${right.grid.length}); this is a bug`,
    });
  }

  // build key→series maps, checking for duplicates
  const leftMap = new Map<string, Series>();
  for (const s of left.series) {
    if (leftMap.has(s.key)) {
      throw new ExpressionError({ code: 'no_match', message: 'duplicate label set on left side of binary operation' });
    }
    leftMap.set(s.key, s);
  }
  const rightMap = new Map<string, Series>();
  for (const s of right.series) {
    if (rightMap.has(s.key)) {
      throw new ExpressionError({ code: 'no_match', message: 'duplicate label set on right side of binary operation' });
    }
    rightMap.set(s.key, s);
  }

  const pairs: Array<{ leftSeries: Series; rightSeries: Series }> = [];
  for (const [key, ls] of leftMap) {
    const rs = rightMap.get(key);
    if (rs) {
      pairs.push({ leftSeries: ls, rightSeries: rs });
    }
  }

  const l = left.series[0];
  const r = right.series[0];
  if (pairs.length === 0 && l && r) {
    throw new ExpressionError({
      code: 'no_match',
      message: `no series with matching labels; left example: ${l.key}, right example: ${r.key}`,
    });
  }

  budget.charge(pairs.length * left.grid.length);
  return {
    kind: 'series',
    grid: left.grid,
    series: pairs.map(({ leftSeries, rightSeries }) => ({
      name: leftSeries.name,
      labels: leftSeries.labels,
      key: leftSeries.key,
      values: leftSeries.values.map((v, i) => applyBinaryToSamples(op, v, rightSeries.values[i] ?? null)),
    })),
  };
}
