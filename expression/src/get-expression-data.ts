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

import { fetchJson } from "@perses-dev/client";
import type { TimeSeriesQueryContext } from "@perses-dev/plugin-system";
import type { TimeSeriesData } from "@perses-dev/spec";

import type { ExpressionQuerySpec } from "./expression-query-types";
import { getExpressionInputs } from "./expression-query-types";

export const EXPRESSION_EVALUATE_PATH = "/api/v1/expressions/evaluate";

/**
 * The context given by the plugin-system to the queries depending on other queries.
 * It is declared here as well, so the plugin also compiles against plugin-system versions that don't expose it yet.
 */
export type ExpressionQueryContext = TimeSeriesQueryContext & {
  refId?: string;
  inputs?: Record<string, TimeSeriesData>;
};

/**
 * Body of the expression evaluation endpoint of the Perses server.
 */
export interface EvaluateExpressionRequest {
  refId?: string;
  start: number;
  end: number;
  stepMs?: number;
  mode?: "range" | "instant";
  inputs: Record<string, TimeSeriesData>;
  spec: ExpressionQuerySpec;
}

function getApiPrefix(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const config = (
    window as unknown as { PERSES_APP_CONFIG?: { api_prefix?: string } }
  ).PERSES_APP_CONFIG;
  return config?.api_prefix ?? "";
}

export function buildEvaluateRequest(
  spec: ExpressionQuerySpec,
  ctx: ExpressionQueryContext,
): EvaluateExpressionRequest {
  const inputs: Record<string, TimeSeriesData> = {};
  for (const refId of getExpressionInputs(spec)) {
    const data = ctx.inputs?.[refId];
    if (data === undefined) {
      throw new Error(
        `The query ${refId} used by the expression is not available`,
      );
    }
    inputs[refId] = data;
  }
  return {
    refId: ctx.refId,
    start: ctx.timeRange.start.getTime(),
    end: ctx.timeRange.end.getTime(),
    stepMs: ctx.suggestedStepMs,
    mode: ctx.mode,
    inputs,
    spec,
  };
}

/**
 * Evaluates the expression on the Perses server. The inputs are the results of the other time series queries of the
 * panel, already fetched by their own plugin: the evaluation doesn't depend on any datasource.
 */
export async function getExpressionData(
  spec: ExpressionQuerySpec,
  context: TimeSeriesQueryContext,
  abortSignal?: AbortSignal,
): Promise<TimeSeriesData> {
  const ctx = context as ExpressionQueryContext;
  if (spec.type === "math" && !spec.expression?.trim()) {
    return { series: [] };
  }
  const request = buildEvaluateRequest(spec, ctx);
  const data = await fetchJson<TimeSeriesData>(
    `${getApiPrefix()}${EXPRESSION_EVALUATE_PATH}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: abortSignal,
    },
  );
  return {
    ...data,
    timeRange: ctx.timeRange,
    metadata: { ...data.metadata, executedQueryString: spec.expression },
  };
}
