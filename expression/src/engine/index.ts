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

import { evaluateNode } from './evaluator/evaluate';
import { FUNCTION_NAMES } from './evaluator/functions';
import { DEFAULT_LIMITS } from './evaluator/limits';
import type { ErrorCode, ExpressionErrorInfo } from './expression-error';
import { ExpressionError } from './expression-error';
import { createParseCache } from './parser/parse-cache';
import { parse } from './parser/parser';
import type { EvaluationRequest, Limits } from './types';

export type { ErrorCode, ExpressionErrorInfo, EvaluationRequest, Limits };
export { ExpressionError, DEFAULT_LIMITS, FUNCTION_NAMES };

// ── Public result types ────────────────────────────────────────────────────

export type ParseResult = { ok: true; references: number[] } | { ok: false; error: ExpressionErrorInfo };

// Module-level LRU cache shared by parseExpression and evaluateExpression.
const cachedParse = createParseCache(parse);

// ── parseExpression ─────────────────────────────────────────────────────────

export function parseExpression(source: string): ParseResult {
  const result = cachedParse(source);
  if (result.ok) {
    return { ok: true, references: result.references };
  }
  return { ok: false, error: result.error };
}

// ── evaluateExpression ───────────────────────────────────────────────────────

export function evaluateExpression(request: EvaluationRequest, signal?: AbortSignal): TimeSeriesData {
  const result = cachedParse(request.expression);
  if (!result.ok) {
    throw new ExpressionError(result.error);
  }
  return evaluateNode(result.node, request, DEFAULT_LIMITS, signal);
}

// ── ExpressionEvaluator interface ────────────────────────────────────────────

export interface ExpressionEvaluator {
  evaluate(request: EvaluationRequest, signal?: AbortSignal): Promise<TimeSeriesData>;
}

// ── inThreadEvaluator ────────────────────────────────────────────────────────

export const inThreadEvaluator: ExpressionEvaluator = {
  evaluate(request: EvaluationRequest, signal?: AbortSignal): Promise<TimeSeriesData> {
    try {
      return Promise.resolve(evaluateExpression(request, signal));
    } catch (err) {
      return Promise.reject(err);
    }
  },
};
