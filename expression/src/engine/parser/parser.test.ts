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
import type { BinaryNode, CallNode, ExpressionNode, NumberNode, ReferenceNode, UnaryNode } from './expression-tree';
import { collectReferences, parse } from './parser';

function num(value: number, offset: number, length: number): NumberNode {
  return { kind: 'number', value, offset, length };
}

function ref(index: number, offset: number, length: number): ReferenceNode {
  return { kind: 'reference', ref: { type: 'index', index }, offset, length };
}

function unary(op: UnaryNode['op'], operand: ExpressionNode, offset: number, length: number): UnaryNode {
  return { kind: 'unary', op, operand, offset, length };
}

function binary(op: BinaryNode['op'], left: ExpressionNode, right: ExpressionNode): BinaryNode {
  const offset = left.offset;
  const length = right.offset + right.length - offset;
  return { kind: 'binary', op, left, right, offset, length };
}

function call(name: string, args: ExpressionNode[], offset: number, length: number): CallNode {
  return { kind: 'call', name, args, offset, length };
}

describe('parse', () => {
  it('parses a number literal', () => {
    expect(parse('42')).toEqual(num(42, 0, 2));
  });

  it('parses a reference $1 as 0-based index', () => {
    expect(parse('$1')).toEqual(ref(0, 0, 2));
    expect(parse('$3')).toEqual(ref(2, 0, 2));
  });

  it('parses a function call', () => {
    expect(parse('abs($1)')).toEqual(call('abs', [ref(0, 4, 2)], 0, 7));
  });

  it('parses a function call with two arguments', () => {
    const node = parse('round($1, 2)');
    expect(node.kind).toBe('call');
    expect((node as CallNode).args.length).toBe(2);
  });

  it('left-associativity: 1 + 2 + 3 = (1+2)+3', () => {
    // Expected tree: binary(+, binary(+, 1, 2), 3)
    expect(parse('1+2+3')).toEqual(binary('+', binary('+', num(1, 0, 1), num(2, 2, 1)), num(3, 4, 1)));
  });

  it('right-associativity: 2 ** 3 ** 2 = 2**(3**2)', () => {
    // Expected tree: binary(**, 2, binary(**, 3, 2))
    const node = parse('2 ** 3 ** 2') as BinaryNode;
    expect(node.op).toBe('**');
    expect(node.right.kind).toBe('binary');
    expect((node.right as BinaryNode).op).toBe('**');
  });

  it('-2 ** 2 is -(2**2) because unary minus is looser than **', () => {
    expect(parse('-2**2')).toEqual(unary('-', binary('**', num(2, 1, 1), num(2, 4, 1)), 0, 5));
  });

  it('* binds tighter than +', () => {
    // Expected tree: binary(+, 1, binary(*, 2, 3))
    expect(parse('1+2*3')).toEqual(binary('+', num(1, 0, 1), binary('*', num(2, 2, 1), num(3, 4, 1))));
  });

  it('parentheses override precedence', () => {
    const node = parse('(1 + 2) * 3') as BinaryNode;
    expect(node.op).toBe('*');
    expect(node.left.kind).toBe('binary');
  });

  it('records offsets for a binary node', () => {
    const node = parse('$1 + 42');
    expect(node.offset).toBe(0);
    expect(node.length).toBe(7);
  });

  it('throws syntax error for an incomplete expression', () => {
    expect(() => parse('$1 +')).toThrow(ExpressionError);
    try {
      parse('$1 +');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
    }
  });

  it('throws syntax error for a bare identifier', () => {
    expect(() => parse('foo')).toThrow(ExpressionError);
  });

  it('throws for a source longer than 4096 characters', () => {
    expect(() => parse('$1 + '.repeat(1000))).toThrow(ExpressionError);
  });

  it('throws when depth exceeds 64', () => {
    const expr = '('.repeat(65) + '1' + ')'.repeat(65);
    expect(() => parse(expr)).toThrow(ExpressionError);
  });

  it('is reentrant: calling after an error produces correct output', () => {
    expect(() => parse('$1 +')).toThrow(ExpressionError);
    expect(parse('$1 + $2')).toMatchObject({ kind: 'binary', op: '+' });
  });

  it('throws for a huge $N reference index that is not a safe integer', () => {
    expect(() => parse('$99999999999999999999')).toThrow(ExpressionError);
    try {
      parse('$99999999999999999999');
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.message).toMatch(/too large/);
    }
  });

  it('parses nested function calls', () => {
    const node = parse('abs(ceil($1))') as CallNode;
    expect(node.kind).toBe('call');
    expect(node.name).toBe('abs');
  });
});

describe('collectReferences', () => {
  it('returns sorted unique 0-based indexes', () => {
    const node = parse('$3 + $1 + $1');
    expect(collectReferences(node)).toEqual([0, 2]);
  });

  it('returns [] for an expression with no references', () => {
    expect(collectReferences(parse('1 + 2'))).toEqual([]);
  });
});
