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

import { PointerEvent } from 'react';
import { produce } from 'immer';
import { AnchorPoint, EdgeSpec, NodeSpec, WeathermapSpec } from '../model';
import { anchorPosition, edgeEndpoints, pointInsideNode, snapTarget } from '../utils/edgeUtils';
import { DragEdge, EditorAction } from '../utils/editorReducer';

const SNAP_RADIUS = 20;

interface UseEdgeConnectResult {
  startEdgeDrag: (nodeId: string, anchor: AnchorPoint, x: number, y: number) => EditorAction;
  startEndpointDrag: (
    event: PointerEvent<SVGCircleElement>,
    edgeId: string,
    end: 'source' | 'target',
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint
  ) => EditorAction | null;
  updateEdgeDrag: (event: PointerEvent<SVGSVGElement>, dragEdge: DragEdge) => EditorAction;
  commitEdgeDrag: (event: PointerEvent<SVGSVGElement>, dragEdge: DragEdge) => EditorAction;
}

export function useEdgeConnect(
  value: WeathermapSpec,
  onChange: (v: WeathermapSpec) => void,
  nodes: NodeSpec[],
  nodeById: Map<string, NodeSpec>,
  edgeById: Map<string, EdgeSpec>,
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => { x: number; y: number }
): UseEdgeConnectResult {
  function startEdgeDrag(nodeId: string, anchor: AnchorPoint, x: number, y: number): EditorAction {
    return {
      type: 'DRAG_EDGE_START',
      dragEdge: { sourceId: nodeId, sourceAnchor: anchor, x1: x, y1: y, x2: x, y2: y },
    };
  }

  function startEndpointDrag(
    event: PointerEvent<SVGCircleElement>,
    edgeId: string,
    end: 'source' | 'target',
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint
  ): EditorAction | null {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const edge = edgeById.get(edgeId);
    if (!edge) {
      return null;
    }
    const pts = edgeEndpoints(edge, nodeById);
    if (!pts) {
      return null;
    }
    const movingX = end === 'target' ? pts.x2 : pts.x1;
    const movingY = end === 'target' ? pts.y2 : pts.y1;
    return {
      type: 'DRAG_EDGE_START',
      dragEdge: {
        sourceId: fixedNodeId,
        sourceAnchor: fixedAnchor,
        x1: fixedX,
        y1: fixedY,
        x2: movingX,
        y2: movingY,
        editingEdgeId: edgeId,
        editingEnd: end,
      },
    };
  }

  function updateEdgeDrag(event: PointerEvent<SVGSVGElement>, dragEdge: DragEdge): EditorAction {
    const point = toCanvasPoint(event);
    const snap = snapTarget(nodes, point, dragEdge.sourceId, SNAP_RADIUS);
    return {
      type: 'DRAG_EDGE_UPDATE',
      x2: snap ? anchorPosition(snap.node, snap.anchor).x : point.x,
      y2: snap ? anchorPosition(snap.node, snap.anchor).y : point.y,
      snapTargetId: snap?.node.id,
      snapTargetAnchor: snap?.anchor,
    };
  }

  function commitEdgeDrag(event: PointerEvent<SVGSVGElement>, dragEdge: DragEdge): EditorAction {
    const pt = toCanvasPoint(event);
    const snap = snapTarget(nodes, pt, dragEdge.sourceId, SNAP_RADIUS);

    if (dragEdge.editingEdgeId !== undefined && dragEdge.editingEnd !== undefined) {
      const edgeId = dragEdge.editingEdgeId;
      const end = dragEdge.editingEnd;
      onChange(
        produce(value, (draft) => {
          const edge = (draft.edges ?? []).find((ed) => ed.id === edgeId);
          if (!edge) {
            return;
          }
          if (end === 'target') {
            if (snap) {
              edge.target = snap.node.id;
              edge.targetAnchor = snap.anchor;
              edge.x2 = undefined;
              edge.y2 = undefined;
            } else {
              edge.target = '';
              edge.targetAnchor = undefined;
              edge.x2 = pt.x;
              edge.y2 = pt.y;
            }
          } else {
            if (snap) {
              edge.source = snap.node.id;
              edge.sourceAnchor = snap.anchor;
            } else {
              if (edge.target) {
                // Swap source/target when dragging the source end to a free position:
                // the existing target becomes the new source, and the endpoint goes free.
                const oldTarget = edge.target;
                const oldTargetAnchor = edge.targetAnchor;
                edge.target = edge.source;
                edge.targetAnchor = edge.sourceAnchor;
                edge.source = oldTarget;
                edge.sourceAnchor = oldTargetAnchor;
                edge.x2 = pt.x;
                edge.y2 = pt.y;
                edge.target = '';
                edge.targetAnchor = undefined;
              } else {
                edge.x2 = pt.x;
                edge.y2 = pt.y;
              }
            }
          }
        })
      );
    } else {
      const sourceNode = nodeById.get(dragEdge.sourceId);
      const tooClose = !snap && sourceNode && pointInsideNode(sourceNode, pt, SNAP_RADIUS);
      if (!tooClose) {
        const id = `edge-${Date.now()}`;
        const newEdge = snap
          ? {
              id,
              source: dragEdge.sourceId,
              target: snap.node.id,
              sourceAnchor: dragEdge.sourceAnchor,
              targetAnchor: snap.anchor,
            }
          : { id, source: dragEdge.sourceId, target: '', sourceAnchor: dragEdge.sourceAnchor, x2: pt.x, y2: pt.y };
        onChange(
          produce(value, (draft) => {
            (draft.edges ??= []).push(newEdge);
          })
        );
      }
    }
    return { type: 'DRAG_EDGE_END' };
  }

  return { startEdgeDrag, startEndpointDrag, updateEdgeDrag, commitEdgeDrag };
}
