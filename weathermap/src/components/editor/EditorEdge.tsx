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

import { PointerEvent, ReactElement } from 'react';
import { AnchorPoint, EdgeSpec, NodeSpec } from '../../types/weathermap-types';
import { edgeEndpoints } from '../../utils/edgeUtils';
import { EditorTheme } from '../../utils/editorTheme';
import { EdgeLines, LineStyle } from '../node/EdgeLines';

interface EditorEdgeProps {
  edge: EdgeSpec;
  nodeById: Map<string, NodeSpec>;
  isSelected: boolean;
  isDragging: boolean;
  nsPrefix: string;
  k: number;
  theme: EditorTheme;
  onEdgeClick: (event: PointerEvent<SVGLineElement>) => void;
  onEndpointPointerDown: (
    event: PointerEvent<SVGCircleElement>,
    end: 'source' | 'target',
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint
  ) => void;
}

export function EditorEdge({
  edge,
  nodeById,
  isSelected,
  isDragging,
  nsPrefix,
  k,
  theme,
  onEdgeClick,
  onEndpointPointerDown,
}: EditorEdgeProps): ReactElement | null {
  const pts = edgeEndpoints(edge, nodeById);
  if (!pts) {
    return null;
  }
  const srcAnchor: AnchorPoint = edge.sourceAnchor ?? 'n';
  const tgtAnchor: AnchorPoint = edge.targetAnchor ?? 'n';

  const rawStyle = isSelected ? theme.edgeSelected : theme.edge;
  const lineStyle: LineStyle = {
    stroke: (rawStyle.stroke as string) ?? 'currentColor',
    strokeWidth: (rawStyle.strokeWidth as number) ?? 1,
    strokeOpacity: rawStyle.strokeOpacity as number | undefined,
    fillOpacity: theme.arrowOpacity,
  };

  return (
    <g>
      {/* transparent full-span hit target */}
      <line
        x1={pts.x1}
        y1={pts.y1}
        x2={pts.x2}
        y2={pts.y2}
        stroke="transparent"
        {...theme.edgeHit}
        style={{ cursor: 'pointer' }}
        onPointerDown={onEdgeClick}
      />
      <EdgeLines
        pts={pts}
        bidirectional={edge.bidirectional ?? false}
        nsPrefix={nsPrefix}
        k={k}
        fwdStyle={lineStyle}
        lineProps={{ style: { pointerEvents: 'none' } }}
      />
      {isSelected && !isDragging && (
        <>
          <circle
            cx={pts.x1}
            cy={pts.y1}
            {...theme.edgeHandle}
            style={{ cursor: 'grab' }}
            onPointerDown={(event) =>
              onEndpointPointerDown(event, 'source', pts.x2, pts.y2, edge.target || edge.source, tgtAnchor)
            }
          />
          <circle
            cx={pts.x2}
            cy={pts.y2}
            {...theme.edgeHandle}
            style={{ cursor: 'grab' }}
            onPointerDown={(event) => onEndpointPointerDown(event, 'target', pts.x1, pts.y1, edge.source, srcAnchor)}
          />
        </>
      )}
    </g>
  );
}
