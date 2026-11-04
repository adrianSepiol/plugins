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

/**
 * The type of operation done by an expression. Only `math` is available for now.
 * To add a new type: extend this union and ExpressionQuerySpec, add it to EXPRESSION_TYPES, getExpressionInputs and
 * the editor, and add it to the CUE schema.
 */
export type ExpressionType = "math";

/**
 * Spec of the ExpressionQuery plugin. The fields used depend on the type of the expression.
 * Other queries of the panel are referenced by their refId: their name when it is set, otherwise A, B, C...
 */
export interface ExpressionQuerySpec {
  type: ExpressionType;
  /** math: e.g. "$A / $B * 100". Use ${my query} when the refId contains special characters. */
  expression?: string;
}

export const EXPRESSION_TYPES: Array<{
  value: ExpressionType;
  label: string;
  description: string;
}> = [
  {
    value: "math",
    label: "Math",
    description: "Free-form math formula on time series, e.g. $A / $B * 100",
  },
];

export function createInitialExpressionQuerySpec(): ExpressionQuerySpec {
  return { type: "math", expression: "" };
}

const VARIABLE_REGEX = /\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

/**
 * Returns the refIds of the queries used by the expression.
 */
export function getExpressionInputs(spec: ExpressionQuerySpec): string[] {
  switch (spec.type) {
    case "math": {
      const result = new Set<string>();
      for (const match of (spec.expression ?? "").matchAll(VARIABLE_REGEX)) {
        const refId = (match[1] ?? match[2] ?? "").trim();
        if (refId) {
          result.add(refId);
        }
      }
      return [...result];
    }
  }
  return [];
}
