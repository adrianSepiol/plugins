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

const DEFAULT_TEXT_COLOR = 'currentColor';

export interface TextNodeProps {
  nodeSize: number;
  displayLabel: string | undefined;
  fillOverride: string | undefined;
  rectProps?: React.SVGProps<SVGRectElement>;
}

export function TextNode({ nodeSize, displayLabel, fillOverride, rectProps }: TextNodeProps): ReactElement {
  const half = nodeSize / 2;
  const fontSize = Math.max(10, nodeSize * 0.35);
  const textColor = fillOverride ?? DEFAULT_TEXT_COLOR;

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
      {displayLabel && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontSize={fontSize}
          fontWeight="500"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayLabel}
        </text>
      )}
    </>
  );
}
