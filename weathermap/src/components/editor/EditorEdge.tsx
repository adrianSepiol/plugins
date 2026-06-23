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
import { edgeEndpoints, midpoint, offsetLine, shortenLine } from '../../utils/edgeUtils';
import { EditorTheme } from '../../utils/editorTheme';

const BIDIR_GAP = 2;

interface EditorEdgeProps {
  edge: EdgeSpec;
  nodeById: Map<string, NodeSpec>;
  isSelected: boolean;
  isDragging: boolean;
  markerUrl: string;
  arrowShorten: number;
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
  markerUrl,
  arrowShorten,
  k,
  theme,
  onEdgeClick,
  onEndpointPointerDown,
}: EditorEdgeProps): ReactElement | null {
  const pts = edgeEndpoints(edge, nodeById);
  if (!pts) {
    return null;
  }
  const lineOffset = 4 / k;
  const srcAnchor: AnchorPoint = edge.sourceAnchor ?? 'n';
  const tgtAnchor: AnchorPoint = edge.targetAnchor ?? 'n';

  const edgeStyle = isSelected ? theme.edgeSelected : theme.edge;

  if (edge.bidirectional) {
    const mid = midpoint(pts);
    const gapPx = BIDIR_GAP / k;

    const fwdHalf = offsetLine({ x1: pts.x1, y1: pts.y1, x2: mid.x, y2: mid.y }, lineOffset);
    const fwdShortened = shortenLine(fwdHalf, arrowShorten + gapPx / 2);

    const bwdHalfRaw = offsetLine({ x1: pts.x2, y1: pts.y2, x2: mid.x, y2: mid.y }, -lineOffset);
    const bwdShortened = shortenLine(bwdHalfRaw, arrowShorten + gapPx / 2);

    return (
      <g>
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
        <line
          x1={fwdShortened.x1}
          y1={fwdShortened.y1}
          x2={fwdShortened.x2}
          y2={fwdShortened.y2}
          {...edgeStyle}
          markerEnd={markerUrl}
          style={{ pointerEvents: 'none' }}
        />
        <line
          x1={bwdShortened.x1}
          y1={bwdShortened.y1}
          x2={bwdShortened.x2}
          y2={bwdShortened.y2}
          {...edgeStyle}
          markerEnd={markerUrl}
          style={{ pointerEvents: 'none' }}
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

  const shortened = shortenLine(pts, arrowShorten);

  return (
    <g>
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
      <line
        x1={shortened.x1}
        y1={shortened.y1}
        x2={shortened.x2}
        y2={shortened.y2}
        {...edgeStyle}
        markerEnd={markerUrl}
        style={{ pointerEvents: 'none' }}
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
