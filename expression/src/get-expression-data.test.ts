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

import type { TimeSeriesData } from "@perses-dev/spec";

import { getExpressionInputs } from "./expression-query-types";
import { ExpressionQuery } from "./ExpressionQuery";
import type { ExpressionQueryContext } from "./get-expression-data";
import {
  buildEvaluateRequest,
  EXPRESSION_EVALUATE_PATH,
  getExpressionData,
} from "./get-expression-data";

const dataA: TimeSeriesData = { series: [{ name: "a", values: [[0, 1]] }] };
const dataB: TimeSeriesData = { series: [{ name: "b", values: [[0, 2]] }] };

function context(
  inputs?: Record<string, TimeSeriesData>,
): ExpressionQueryContext {
  return {
    timeRange: { start: new Date(1000), end: new Date(61000) },
    suggestedStepMs: 15000,
    mode: "range",
    refId: "C",
    inputs,
    variableState: {},
    datasourceStore: {} as ExpressionQueryContext["datasourceStore"],
  };
}

describe("getExpressionInputs", () => {
  it("should extract the refIds of a math expression", () => {
    expect(
      getExpressionInputs({
        type: "math",
        expression: "$A / ${my query} * 100 + $A + $B_2",
      }),
    ).toEqual(["A", "my query", "B_2"]);
  });

  it("should be used as query dependencies", () => {
    expect(
      ExpressionQuery.dependsOn?.(
        { type: "math", expression: "$A + $B" },
        context(),
      ),
    ).toEqual({
      queries: ["A", "B"],
    });
  });
});

describe("buildEvaluateRequest", () => {
  it("should send only the inputs used by the expression", () => {
    const request = buildEvaluateRequest(
      { type: "math", expression: "$A * 2" },
      context({ A: dataA, B: dataB }),
    );
    expect(request).toEqual({
      refId: "C",
      start: 1000,
      end: 61000,
      stepMs: 15000,
      mode: "range",
      inputs: { A: dataA },
      spec: { type: "math", expression: "$A * 2" },
    });
  });

  it("should fail when an input is missing", () => {
    expect(() =>
      buildEvaluateRequest(
        { type: "math", expression: "$Z + 1" },
        context({ A: dataA }),
      ),
    ).toThrow("The query Z used by the expression is not available");
  });
});

describe("getExpressionData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should evaluate the expression on the Perses server", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ series: [{ name: "a", values: [[0, 2]] }] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const result = await getExpressionData(
      { type: "math", expression: "$A * 2" },
      context({ A: dataA }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      EXPRESSION_EVALUATE_PATH,
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.inputs).toEqual({ A: dataA });
    expect(result.series).toEqual([{ name: "a", values: [[0, 2]] }]);
    expect(result.metadata?.executedQueryString).toBe("$A * 2");
  });

  it("should not call the server for an empty math expression", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(
      await getExpressionData({ type: "math", expression: " " }, context()),
    ).toEqual({ series: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should report the error returned by the server", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid math expression" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      getExpressionData(
        { type: "math", expression: "$A +" },
        context({ A: dataA }),
      ),
    ).rejects.toThrow("invalid math expression");
  });
});
