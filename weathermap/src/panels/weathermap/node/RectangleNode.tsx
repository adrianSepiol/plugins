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
import { NodeSpec } from '../weathermap-types';
import { ICON_PATHS } from '../icons';

export const ICON_FILL_RATIO = 0.6;
export const CORNER_RADIUS_RATIO = 0.2;
const DEFAULT_RECT_COLOR = '#1976d2';

export interface RectangleNodeProps {
  node: NodeSpec;
  nodeSize: number;
  half: number;
  displayLabel: string | undefined;
  fillOverride: string | undefined;
  rectProps?: React.SVGProps<SVGRectElement>;
}

export function RectangleNode({
  node,
  nodeSize,
  half,
  displayLabel,
  fillOverride,
  rectProps,
}: RectangleNodeProps): ReactElement {
  const iconSize = nodeSize * ICON_FILL_RATIO;
  const iconScale = iconSize / 24;
  const cornerRadius = nodeSize * CORNER_RADIUS_RATIO;
  const labelOffset = half + 12;
  const iconPath = node.icon ? ICON_PATHS[node.icon] : undefined;
  const fill = fillOverride ?? DEFAULT_RECT_COLOR;

  return (
    <>
      <rect
        x={-half}
        y={-half}
        width={nodeSize}
        height={nodeSize}
        rx={cornerRadius}
        ry={cornerRadius}
        fill={fill}
        stroke="white"
        strokeWidth={2}
        {...rectProps}
      />
      {iconPath && (
        <g
          transform={`translate(${-iconSize / 2},${-iconSize / 2}) scale(${iconScale})`}
          style={{ pointerEvents: 'none' }}
        >
          <path d={iconPath} fill="white" />
        </g>
      )}
      {displayLabel && (
        <text
          y={labelOffset}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="currentColor"
          fontSize={12}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayLabel}
        </text>
      )}
    </>
  );
}
