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

import { ReactElement, SVGProps } from 'react';
import { NodeSpec } from '../types/weathermap-types';
import { ICON_PATHS } from '../utils/icons';

const DEFAULT_ICON_COLOR = '#1976d2';

export interface IconNodeProps {
  node: NodeSpec;
  nodeSize: number;
  half: number;
  displayLabel: string | undefined;
  fillOverride: string | undefined;
  rectProps?: SVGProps<SVGRectElement>;
}

export function IconNode({ node, nodeSize, half, displayLabel, fillOverride, rectProps }: IconNodeProps): ReactElement {
  const iconPath = node.icon ? ICON_PATHS[node.icon] : undefined;
  const iconScale = nodeSize / 24;
  const labelOffset = half + 12;
  const iconColor = fillOverride ?? DEFAULT_ICON_COLOR;

  return (
    <>
      <rect
        x={-half}
        y={-half}
        width={nodeSize}
        height={nodeSize}
        fill="transparent"
        stroke="transparent"
        strokeWidth={2}
        {...rectProps}
      />
      {iconPath ? (
        <g transform={`translate(${-half},${-half}) scale(${iconScale})`} style={{ pointerEvents: 'none' }}>
          <path d={iconPath} fill={iconColor} />
        </g>
      ) : (
        <circle r={half} fill={iconColor} style={{ pointerEvents: 'none' }} />
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
