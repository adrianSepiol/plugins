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
import type { Token } from './lexer';
import { tokenize } from './lexer';

function tok(kind: Token['kind'], text: string, offset: number): Token {
  return { kind, text, offset };
}

describe('tokenize', () => {
  it('handles an empty string', () => {
    expect(tokenize('').tokens).toEqual([tok('end', '', 0)]);
  });

  it('tokenizes a simple expression', () => {
    expect(tokenize('$1 + 2').tokens).toEqual([
      tok('reference', '$1', 0),
      tok('op', '+', 3),
      tok('number', '2', 5),
      tok('end', '', 6),
    ]);
  });

  it('tokenizes integers, decimals and exponents', () => {
    const { tokens } = tokenize('1 3.14 2e5');
    expect(tokens).toEqual([
      tok('number', '1', 0),
      tok('number', '3.14', 2),
      tok('number', '2e5', 7),
      tok('end', '', 10),
    ]);
  });

  it('tokenizes identifiers followed by (', () => {
    const { tokens } = tokenize('abs(');
    expect(tokens.slice(0, 2)).toEqual([tok('ident', 'abs', 0), tok('(', '(', 3)]);
  });

  it('tokenizes all long operators before short ones', () => {
    const { tokens } = tokenize('** == != <= >= && ||');
    expect(tokens.map((t) => t.text)).toEqual(['**', '==', '!=', '<=', '>=', '&&', '||', '']);
  });

  it('records correct offsets', () => {
    const { tokens } = tokenize('1+2');
    expect(tokens[0]?.offset).toBe(0);
    expect(tokens[1]?.offset).toBe(1);
    expect(tokens[2]?.offset).toBe(2);
  });

  it('throws on $0 (references are 1-based)', () => {
    expect(() => tokenize('$0')).toThrow(ExpressionError);
    try {
      tokenize('$0');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.offset).toBe(0);
    }
  });

  it('throws on bare $ with no digits', () => {
    expect(() => tokenize('$')).toThrow(ExpressionError);
  });

  it('throws on ${ (named references not yet supported)', () => {
    expect(() => tokenize('${foo}')).toThrow(ExpressionError);
    try {
      tokenize('${foo}');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.message).toMatch(/named references/);
    }
  });

  it('throws on an unknown character', () => {
    expect(() => tokenize('@')).toThrow(ExpressionError);
    try {
      tokenize('@');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.offset).toBe(0);
    }
  });

  it('skips whitespace', () => {
    const { tokens } = tokenize('  1  ');
    expect(tokens).toEqual([tok('number', '1', 2), tok('end', '', 5)]);
  });

  it('throws on a bare exponent (1e without digits)', () => {
    expect(() => tokenize('1e')).toThrow(ExpressionError);
    try {
      tokenize('1e');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.message).toMatch(/exponent/);
    }
  });

  it('throws on 1e+ (exponent with sign but no digits)', () => {
    expect(() => tokenize('1e+')).toThrow(ExpressionError);
  });

  it('end is typed by construction and matches the last token', () => {
    const { tokens, end } = tokenize('1 + 2');
    expect(end).toBe(tokens[tokens.length - 1]);
    expect(end.kind).toBe('end');
  });
});
