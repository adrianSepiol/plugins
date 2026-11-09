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

export type ArithmeticOp = '+' | '-' | '*' | '/' | '%' | '**';
export type CompareOp = '==' | '!=' | '<' | '<=' | '>' | '>=';
export type LogicalOp = '&&' | '||';
export type BinaryOp = ArithmeticOp | CompareOp | LogicalOp;
export type UnaryOp = '-' | '+' | '!';

interface NodeBase {
  readonly offset: number;
  readonly length: number;
}

export interface NumberNode extends NodeBase {
  readonly kind: 'number';
  readonly value: number;
}

export interface IndexRef {
  readonly type: 'index';
  readonly index: number; // 0-based
}

// Reserved for future use: named references like ${name}
export interface NameRef {
  readonly type: 'name';
  readonly name: string;
}

export type Ref = IndexRef | NameRef;

export interface ReferenceNode extends NodeBase {
  readonly kind: 'reference';
  readonly ref: Ref;
}

export interface UnaryNode extends NodeBase {
  readonly kind: 'unary';
  readonly op: UnaryOp;
  readonly operand: ExpressionNode;
}

export interface BinaryNode extends NodeBase {
  readonly kind: 'binary';
  readonly op: BinaryOp;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface CallNode extends NodeBase {
  readonly kind: 'call';
  readonly name: string;
  readonly args: readonly ExpressionNode[];
}

export type ExpressionNode = NumberNode | ReferenceNode | UnaryNode | BinaryNode | CallNode;

export function collectReferences(node: ExpressionNode): readonly number[] {
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
  return Object.freeze(Array.from(refs).toSorted((a, b) => a - b));
}
