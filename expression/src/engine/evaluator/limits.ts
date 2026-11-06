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

import type { ErrorCode } from '../expression-error';
import { ExpressionError } from '../expression-error';
import type { Limits } from '../types';

export type { Limits };

export const DEFAULT_LIMITS: Readonly<Limits> = Object.freeze({
  maxSeries: 1000,
  maxPointsPerSeries: 11000,
  maxSamples: 5_000_000,
});

export class SampleBudget {
  private total = 0;
  private readonly limits: Limits;

  constructor(limits: Limits) {
    this.limits = limits;
  }

  charge(n: number): void {
    this.total += n;
    if (this.total > this.limits.maxSamples) {
      throw new ExpressionError({
        code: 'limit_exceeded',
        message: `exceeded maxSamples (${this.limits.maxSamples})`,
      });
    }
  }

  overLimit(code: ErrorCode, message: string): never {
    throw new ExpressionError({ code, message });
  }
}
