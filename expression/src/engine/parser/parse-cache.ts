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

import type { ExpressionErrorInfo } from '../expression-error';
import { ExpressionError } from '../expression-error';
import { collectReferences } from './parser';
import type { ExpressionNode } from './expression-tree';
import type { Parser } from './parser';

export type CacheResult =
  | { ok: true; node: ExpressionNode; references: number[] }
  | { ok: false; error: ExpressionErrorInfo };

export type CachedParser = (source: string) => CacheResult;

/**
 * Wraps a Parser in a least-recently-used cache.
 * Failures are cached too, so a bad expression typed in the editor is not
 * re-parsed on every render.
 */
export function createParseCache(parser: Parser, maxEntries = 128): CachedParser {
  // Map preserves insertion order; we exploit that for O(1) LRU eviction:
  // on a hit, delete and re-insert the key; past maxEntries, evict the first key.
  const cache = new Map<string, CacheResult>();

  return function cachedParse(source: string): CacheResult {
    const hit = cache.get(source);
    if (hit !== undefined) {
      // move to most-recently-used position
      cache.delete(source);
      cache.set(source, hit);
      return hit;
    }

    let result: CacheResult;
    try {
      const node = parser(source);
      result = { ok: true, node, references: collectReferences(node) };
    } catch (err) {
      const error: ExpressionErrorInfo =
        err instanceof ExpressionError
          ? err.info
          : { code: 'syntax', message: String(err) };
      result = { ok: false, error };
    }

    if (cache.size >= maxEntries) {
      cache.delete(cache.keys().next().value as string);
    }
    cache.set(source, result);
    return result;
  };
}
