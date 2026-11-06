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
import type { SampleBudget } from './limits';
import type { Sample, Value } from './values';

type SampleFn = (a: Sample) => Sample;

interface FunctionEntry {
  arity: number;
  apply: (...args: Sample[]) => Sample;
}

function mathFn(fn: (x: number) => number): SampleFn {
  return (a) => (a === null ? null : fn(a));
}

const REGISTRY: Record<string, FunctionEntry> = {
  abs: { arity: 1, apply: mathFn(Math.abs) },
  ceil: { arity: 1, apply: mathFn(Math.ceil) },
  floor: { arity: 1, apply: mathFn(Math.floor) },
  round: { arity: 1, apply: mathFn(Math.round) },
  log: { arity: 1, apply: mathFn(Math.log) },
  log10: { arity: 1, apply: mathFn(Math.log10) },
  exp: { arity: 1, apply: mathFn(Math.exp) },
  sqrt: { arity: 1, apply: mathFn(Math.sqrt) },
  is_null: { arity: 1, apply: (a) => (a === null ? 1 : 0) },
  is_nan: { arity: 1, apply: (a) => (a !== null && Number.isNaN(a) ? 1 : 0) },
  is_inf: { arity: 1, apply: (a) => (a !== null && !isFinite(a) && !Number.isNaN(a) ? 1 : 0) },
  is_number: { arity: 1, apply: (a) => (a !== null && isFinite(a) ? 1 : 0) },
};

export const FUNCTION_NAMES: readonly string[] = Object.freeze(Object.keys(REGISTRY));

export function applyFunction(
  name: string,
  args: Value[],
  callOffset: number,
  callLength: number,
  budget: SampleBudget,
): Value {
  const entry = REGISTRY[name];
  if (!entry) {
    throw new ExpressionError({
      code: 'unknown_function',
      message: `unknown function: ${name}. Known functions: ${FUNCTION_NAMES.join(', ')}`,
      offset: callOffset,
      length: callLength,
    });
  }
  const [arg] = args;
  if (args.length !== entry.arity || arg === undefined) {
    throw new ExpressionError({
      code: 'syntax',
      message: `${name}() takes ${entry.arity} argument(s), got ${args.length}`,
      offset: callOffset,
      length: callLength,
    });
  }

  // All current functions are unary and work per-sample
  if (arg.kind === 'scalar') {
    return { kind: 'scalar', value: entry.apply(arg.value) };
  }
  budget.charge(arg.series.length * arg.grid.length);
  return {
    kind: 'series',
    grid: arg.grid,
    series: arg.series.map((s) => ({ ...s, values: s.values.map((v) => entry.apply(v)) })),
  };
}
