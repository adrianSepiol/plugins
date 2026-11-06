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
import type { BinaryOp, ExpressionNode, UnaryOp } from './expression-tree';
import type { Token } from './lexer';
import { tokenize } from './lexer';

const MAX_SOURCE_LENGTH = 4096;
const MAX_DEPTH = 64;

// Pratt precedence levels (higher = tighter binding).
// Keyed by BinaryOp so accessing PREC[op] is typed without a cast.
const PREC: Record<BinaryOp, number> = {
  '||': 10,
  '&&': 20,
  '==': 30,
  '!=': 30,
  '<': 30,
  '<=': 30,
  '>': 30,
  '>=': 30,
  '+': 40,
  '-': 40,
  '*': 50,
  '/': 50,
  '%': 50,
  '**': 70, // higher than unary minus (60), so -2**2 = -(2**2)
};

// ** is right-associative, all others left-associative
function isRightAssoc(op: BinaryOp): boolean {
  return op === '**';
}

function isBinaryOp(text: string): text is BinaryOp {
  return Object.hasOwn(PREC, text);
}

const UNARY_OPS = new Set<string>(['-', '+', '!']);
function isUnaryOp(text: string): text is UnaryOp {
  return UNARY_OPS.has(text);
}

// ── Per-call parse state ───────────────────────────────────────────────────

interface ParseState {
  tokens: Token[];
  pos: number;
  depth: number;
  source: string;
  /** Sentinel returned when pos is past the last real token. Always the lexer's 'end' token. */
  end: Token;
}

function peek(state: ParseState): Token {
  return state.tokens[state.pos] ?? state.end;
}

function consume(state: ParseState): Token {
  const t = state.tokens[state.pos] ?? state.end;
  if (state.pos < state.tokens.length) state.pos++;
  return t;
}

function expect(state: ParseState, kind: Token['kind'], text?: string): Token {
  const t = consume(state);
  if (t.kind !== kind || (text !== undefined && t.text !== text)) {
    const expected = text ? JSON.stringify(text) : kind;
    throw new ExpressionError({
      code: 'syntax',
      message: `expected ${expected} but got ${JSON.stringify(t.text)}`,
      offset: t.offset,
      length: t.text.length || 1,
    });
  }
  return t;
}

function nextBinaryOp(state: ParseState, minPrec: number): { op: BinaryOp; prec: number } | undefined {
  const t = peek(state);
  if (t.kind !== 'op' || !isBinaryOp(t.text)) return undefined;
  const prec = PREC[t.text];
  if (prec <= minPrec) return undefined;
  return { op: t.text, prec };
}

function parseExpr(state: ParseState, minPrec: number): ExpressionNode {
  state.depth++;
  if (state.depth > MAX_DEPTH) {
    const t = peek(state);
    throw new ExpressionError({
      code: 'syntax',
      message: `expression is too deeply nested (max depth ${MAX_DEPTH})`,
      offset: t.offset,
      length: 1,
    });
  }

  let left = parsePrimary(state);

  let next = nextBinaryOp(state, minPrec);
  while (next !== undefined) {
    consume(state);
    const { op, prec } = next;
    const nextPrec = isRightAssoc(op) ? prec - 1 : prec;
    const right = parseExpr(state, nextPrec);
    const offset = left.offset;
    const length = right.offset + right.length - offset;
    left = { kind: 'binary', op, left, right, offset, length };
    next = nextBinaryOp(state, minPrec);
  }

  state.depth--;
  return left;
}

function parsePrimary(state: ParseState): ExpressionNode {
  const t = peek(state);

  // unary operators: - ! +
  // Unary operand parses at prec 60: ** (70) binds first, so -2**2 = -(2**2).
  if (t.kind === 'op' && isUnaryOp(t.text)) {
    consume(state);
    const op: UnaryOp = t.text;
    const operand = parseExpr(state, 60);
    const offset = t.offset;
    const length = operand.offset + operand.length - offset;
    return { kind: 'unary', op, operand, offset, length };
  }

  // parenthesized expression — same node kind, span widened to include the parentheses
  if (t.kind === '(') {
    consume(state);
    const inner = parseExpr(state, 0);
    const close = expect(state, ')');
    return { ...inner, offset: t.offset, length: close.offset + 1 - t.offset };
  }

  // number literal
  if (t.kind === 'number') {
    consume(state);
    return { kind: 'number', value: parseFloat(t.text), offset: t.offset, length: t.text.length };
  }

  // reference: $N
  if (t.kind === 'reference') {
    consume(state);
    const n = parseInt(t.text.slice(1), 10);
    if (!Number.isSafeInteger(n)) {
      throw new ExpressionError({
        code: 'syntax',
        message: `query reference index ${t.text} is too large`,
        offset: t.offset,
        length: t.text.length,
      });
    }
    const index = n - 1; // convert 1-based to 0-based
    return { kind: 'reference', ref: { type: 'index', index }, offset: t.offset, length: t.text.length };
  }

  // function call: ident ( args )
  if (t.kind === 'ident') {
    consume(state);
    const nameOffset = t.offset;
    const next = peek(state);
    if (next.kind !== '(') {
      throw new ExpressionError({
        code: 'syntax',
        message: `identifier ${JSON.stringify(t.text)} must be followed by ( for a function call`,
        offset: t.offset,
        length: t.text.length,
      });
    }
    consume(state); // consume '('
    const args: ExpressionNode[] = [];
    if (peek(state).kind !== ')') {
      args.push(parseExpr(state, 0));
      while (peek(state).kind === ',') {
        consume(state);
        args.push(parseExpr(state, 0));
      }
    }
    const close = expect(state, ')');
    const length = close.offset + 1 - nameOffset;
    return { kind: 'call', name: t.text, args, offset: nameOffset, length };
  }

  // end of input or unexpected token
  if (t.kind === 'end') {
    throw new ExpressionError({
      code: 'syntax',
      message: 'unexpected end of expression',
      offset: state.source.length,
      length: 0,
    });
  }

  throw new ExpressionError({
    code: 'syntax',
    message: `unexpected token ${JSON.stringify(t.text)}`,
    offset: t.offset,
    length: t.text.length || 1,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Callable type for the expression parser. */
export type Parser = (source: string) => ExpressionNode;

/** Parse source into an expression tree. Throws ExpressionError on syntax errors. */
export const parse: Parser = (source: string): ExpressionNode => {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new ExpressionError({
      code: 'syntax',
      message: `expression is too long (max ${MAX_SOURCE_LENGTH} characters)`,
      offset: 0,
      length: source.length,
    });
  }
  const tokens = tokenize(source);
  // tokenize always appends an 'end' token as the last element
  const state: ParseState = {
    source,
    tokens,
    pos: 0,
    depth: 0,
    end: tokens[tokens.length - 1] as Token,
  };
  const node = parseExpr(state, 0);
  const end = peek(state);
  if (end.kind !== 'end') {
    throw new ExpressionError({
      code: 'syntax',
      message: `unexpected token ${JSON.stringify(end.text)} at offset ${end.offset}`,
      offset: end.offset,
      length: end.text.length || 1,
    });
  }
  return node;
};

export function collectReferences(node: ExpressionNode): number[] {
  const refs = new Set<number>();
  function walk(n: ExpressionNode): void {
    switch (n.kind) {
      case 'number':
        break;
      case 'reference':
        if (n.ref.type === 'index') {
          refs.add(n.ref.index);
        }
        break;
      case 'unary':
        walk(n.operand);
        break;
      case 'binary':
        walk(n.left);
        walk(n.right);
        break;
      case 'call':
        for (const arg of n.args) {
          walk(arg);
        }
        break;
    }
  }
  walk(node);
  return Array.from(refs).toSorted((a, b) => a - b);
}
