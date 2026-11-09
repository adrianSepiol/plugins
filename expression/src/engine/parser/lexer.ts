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

export type TokenKind =
  | 'number'
  | 'reference' // $N
  | 'ident'
  | 'op'
  | '('
  | ')'
  | ','
  | 'end';

export interface Token {
  kind: TokenKind;
  text: string;
  offset: number;
}

/** Longest operators first to match greedily. */
const OPERATOR_PATTERNS = ['**', '==', '!=', '<=', '>=', '&&', '||', '+', '-', '*', '/', '%', '<', '>', '!'];

// Sticky regexes for linear-time tokenization.
const RE_WHITESPACE = /\s+/y;
const RE_NUMBER = /(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
const RE_DIGITS = /\d+/y;
const RE_IDENT = /[a-zA-Z_][a-zA-Z0-9_]*/y;

export interface TokenizeResult {
  tokens: Token[];
  /** The 'end' sentinel appended after all real tokens. */
  end: Token;
}

export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    // skip whitespace
    RE_WHITESPACE.lastIndex = i;
    const wsMatch = RE_WHITESPACE.exec(source);
    if (wsMatch) {
      i += wsMatch[0].length;
      continue;
    }

    const offset = i;

    // number: integer, decimal, optional exponent
    RE_NUMBER.lastIndex = i;
    const numMatch = RE_NUMBER.exec(source);
    if (numMatch) {
      const consumed = numMatch[0].length;
      const afterNum = source.charAt(i + consumed);
      if ((afterNum === 'e' || afterNum === 'E') && !numMatch[2]) {
        throw new ExpressionError({
          code: 'syntax',
          message: `malformed number: exponent requires digits after 'e' (e.g. 1e3)`,
          offset: i,
          length: consumed + 1,
        });
      }
      tokens.push({ kind: 'number', text: numMatch[0], offset });
      i += numMatch[0].length;
      continue;
    }

    // reference: $N
    if (source.charAt(i) === '$') {
      if (source.charAt(i + 1) === '{') {
        throw new ExpressionError({
          code: 'syntax',
          message: 'named references are not supported yet',
          offset: i,
          length: 2,
        });
      }
      RE_DIGITS.lastIndex = i + 1;
      const refMatch = RE_DIGITS.exec(source);
      if (!refMatch) {
        throw new ExpressionError({
          code: 'syntax',
          message: 'expected a query index after $, e.g. $1',
          offset: i,
          length: 1,
        });
      }
      const digits = refMatch[0];
      const n = parseInt(digits, 10);
      if (n === 0) {
        throw new ExpressionError({
          code: 'syntax',
          message: 'query references are 1-based: use $1, $2, ...',
          offset: i,
          length: 1 + digits.length,
        });
      }
      tokens.push({ kind: 'reference', text: source.slice(i, i + 1 + digits.length), offset });
      i += 1 + digits.length;
      continue;
    }

    // identifier
    RE_IDENT.lastIndex = i;
    const identMatch = RE_IDENT.exec(source);
    if (identMatch) {
      tokens.push({ kind: 'ident', text: identMatch[0], offset });
      i += identMatch[0].length;
      continue;
    }

    if (source.charAt(i) === '(') {
      tokens.push({ kind: '(', text: '(', offset });
      i++;
      continue;
    }
    if (source.charAt(i) === ')') {
      tokens.push({ kind: ')', text: ')', offset });
      i++;
      continue;
    }
    if (source.charAt(i) === ',') {
      tokens.push({ kind: ',', text: ',', offset });
      i++;
      continue;
    }

    // operators (longest first)
    let matched = false;
    for (const op of OPERATOR_PATTERNS) {
      if (source.startsWith(op, i)) {
        tokens.push({ kind: 'op', text: op, offset });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // unknown character
    throw new ExpressionError({
      code: 'syntax',
      message: `unexpected character: ${JSON.stringify(source.charAt(i))}`,
      offset: i,
      length: 1,
    });
  }

  const end: Token = { kind: 'end', text: '', offset: source.length };
  tokens.push(end);
  return { tokens, end };
}
