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

import type { TimeSeriesData, TimeSeriesValueTuple } from '@perses-dev/spec';

import { ExpressionError } from '../expression-error';
import type { ExpressionNode } from '../parser/expression-tree';
import { collectReferences } from '../parser/parser';
import type { EvaluationRequest, Limits } from '../types';
import type { AlignRequest } from './align';
import { alignInput, buildSharedGrid } from './align';
import { applyFunction } from './functions';
import { SampleBudget } from './limits';
import { applyBinary, applyUnary } from './operators';
import type { Value } from './values';

interface EvaluationState {
  sharedGrid: number[];
  effectiveStepMs: number;
  mode: 'range' | 'instant';
  inputs: Map<number, TimeSeriesData>;
  budget: SampleBudget;
  alignedCache: Map<number, Value>;
  signal?: AbortSignal;
}

function checkAbort(state: EvaluationState): void {
  if (state.signal?.aborted) {
    throw new ExpressionError({ code: 'aborted', message: 'evaluation was aborted' });
  }
}

function resolve(index: number, state: EvaluationState): Value {
  const cached = state.alignedCache.get(index);
  if (cached) return cached;

  const input = state.inputs.get(index);
  if (!input) {
    throw new ExpressionError({ code: 'unknown_reference', message: `query $${index + 1} is not available` });
  }

  const req: AlignRequest = {
    grid: state.sharedGrid,
    effectiveStepMs: state.effectiveStepMs,
    mode: state.mode,
    input,
    budget: state.budget,
    signal: state.signal,
  };
  const aligned = alignInput(req);
  const value: Value = { kind: 'series', grid: state.sharedGrid, series: aligned.series };
  state.alignedCache.set(index, value);
  return value;
}

function walkNode(node: ExpressionNode, state: EvaluationState): Value {
  checkAbort(state);

  switch (node.kind) {
    case 'number':
      return { kind: 'scalar', value: node.value };

    case 'reference':
      if (node.ref.type === 'index') {
        return resolve(node.ref.index, state);
      }
      throw new ExpressionError({
        code: 'syntax',
        message: 'named references are not supported yet',
        offset: node.offset,
        length: node.length,
      });

    case 'unary':
      return applyUnary(node.op, walkNode(node.operand, state), state.budget);

    case 'binary': {
      const left = walkNode(node.left, state);
      checkAbort(state);
      const right = walkNode(node.right, state);
      return applyBinary(node.op, left, right, state.budget);
    }

    case 'call': {
      const args = node.args.map((a) => {
        checkAbort(state);
        return walkNode(a, state);
      });
      return applyFunction(node.name, args, node.offset, node.length, state.budget);
    }
  }
}

export function evaluateNode(
  node: ExpressionNode,
  request: EvaluationRequest,
  defaultLimits: Limits,
  signal?: AbortSignal,
): TimeSeriesData {
  const limits: Limits = {
    maxSeries: request.limits?.maxSeries ?? defaultLimits.maxSeries,
    maxPointsPerSeries: request.limits?.maxPointsPerSeries ?? defaultLimits.maxPointsPerSeries,
    maxSamples: request.limits?.maxSamples ?? defaultLimits.maxSamples,
  };

  const budget = new SampleBudget(limits);

  // collect referenced inputs into a Map, validating availability in the same pass
  const inputsMap = new Map<number, TimeSeriesData>();
  for (const i of collectReferences(node)) {
    const inp = request.inputs[i];
    if (inp === undefined) {
      throw new ExpressionError({ code: 'unknown_reference', message: `query $${i + 1} is not available` });
    }
    inputsMap.set(i, inp);
  }
  const referencedInputs = [...inputsMap.values()];

  // check total series count across all referenced inputs
  const totalSeries = referencedInputs.reduce((sum, inp) => sum + inp.series.length, 0);
  if (totalSeries > limits.maxSeries) {
    budget.overLimit('limit_exceeded', `inputs have more than ${limits.maxSeries} series in total`);
  }

  const { grid, effectiveStepMs } = buildSharedGrid({
    startMs: request.startMs,
    endMs: request.endMs,
    requestStepMs: request.stepMs,
    mode: request.mode ?? 'range',
    inputs: referencedInputs,
    maxPointsPerSeries: limits.maxPointsPerSeries,
  });

  const state: EvaluationState = {
    sharedGrid: grid,
    effectiveStepMs,
    mode: request.mode ?? 'range',
    inputs: inputsMap,
    budget,
    alignedCache: new Map(),
    signal,
  };

  const value = walkNode(node, state);

  if (value.kind === 'scalar') {
    return {
      timeRange: { start: new Date(request.startMs), end: new Date(request.endMs) },
      stepMs: effectiveStepMs,
      series: [
        {
          name: 'expression',
          values: grid.map((ts): TimeSeriesValueTuple => [ts, value.value]),
          labels: {},
        },
      ],
    };
  }

  return {
    timeRange: { start: new Date(request.startMs), end: new Date(request.endMs) },
    stepMs: effectiveStepMs,
    series: value.series.map((s) => {
      const labelEntries = Object.entries(s.labels);
      const name =
        labelEntries.length > 0
          ? '{' + labelEntries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(', ') + '}'
          : s.name || 'expression';
      return {
        name,
        labels: { ...s.labels },
        values: grid.map((ts, i): TimeSeriesValueTuple => [ts, s.values[i] ?? null]),
      };
    }),
  };
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
