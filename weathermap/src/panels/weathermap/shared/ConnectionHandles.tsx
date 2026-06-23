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
import { NodeSpec, AnchorPoint } from '../weathermap-types';
import { ANCHOR_KEYS, anchorPosition } from '../edgeUtils';

const CROSS_HALF = 6;

interface ConnectionHandlesProps {
  node: NodeSpec;
  k: number;
  onDragStart: (anchor: AnchorPoint, x: number, y: number) => void;
}

export function ConnectionHandles({ node, k, onDragStart }: ConnectionHandlesProps): ReactElement {
  const armLen = CROSS_HALF / k;
  return (
    <>
      {ANCHOR_KEYS.map((anchor) => {
        const pos = anchorPosition(node, anchor);
        return (
          <g
            key={anchor}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: 'crosshair' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onDragStart(anchor, pos.x, pos.y);
            }}
          >
            <circle r={armLen * 2} fill="transparent" />
            <line x1={-armLen} y1={0} x2={armLen} y2={0} stroke="#2196f3" strokeWidth={1.5 / k} />
            <line x1={0} y1={-armLen} x2={0} y2={armLen} stroke="#2196f3" strokeWidth={1.5 / k} />
            <circle r={2 / k} fill="#2196f3" />
          </g>
        );
      })}
    </>
  );
}
