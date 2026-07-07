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

import { ReactElement } from 'react';
import { NodeSpec } from '../../model';
import { RectangleNode } from './RectangleNode';
import { IconNode } from './IconNode';
import { TextNode } from './TextNode';

export const DEFAULT_NODE_SIZE = 48;
export { CORNER_RADIUS_RATIO } from './RectangleNode';

interface NodeRendererProps {
  node: NodeSpec;
  groupProps?: React.SVGProps<SVGGElement>;
  rectProps?: React.SVGProps<SVGRectElement>;
  labelOverride?: string;
  fillOverride?: string;
}

export function NodeRenderer({
  node,
  groupProps,
  rectProps,
  labelOverride,
  fillOverride,
}: NodeRendererProps): ReactElement {
  const shape = node.kind;
  const half = node.size / 2;
  const displayLabel = labelOverride ?? node.label;

  return (
    <g transform={`translate(${node.x},${node.y})`} {...groupProps}>
      {shape === 'rectangle' && (
        <RectangleNode
          node={node}
          nodeSize={node.size}
          half={half}
          displayLabel={displayLabel}
          fillOverride={fillOverride}
          rectProps={rectProps}
        />
      )}
      {shape === 'icon' && (
        <IconNode
          node={node}
          nodeSize={node.size}
          half={half}
          displayLabel={displayLabel}
          fillOverride={fillOverride}
          rectProps={rectProps}
        />
      )}
      {shape === 'text' && (
        <TextNode nodeSize={node.size} displayLabel={displayLabel} fillOverride={fillOverride} rectProps={rectProps} />
      )}
    </g>
  );
}
