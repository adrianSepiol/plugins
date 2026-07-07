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
import { NodeSpec, WeathermapSpec } from '../model';
import { EditorAction, MultiResizeDrag, ResizeHandleId } from '../utils/editorReducer';
import { HANDLE_POSITIONS, handlePosition, nodeBBox, OPPOSITE_HANDLE } from '../utils/resizeUtils';

const MIN_NODE_SIZE = 8;

interface UseResizeResult {
  startResize: (event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId) => EditorAction | null;
  applyResize: (event: PointerEvent<SVGSVGElement>, multiResizeDrag: MultiResizeDrag) => void;
  commitResize: () => EditorAction;
}

export function useResize(
  value: WeathermapSpec,
  onChange: (v: WeathermapSpec) => void,
  selectedIds: Set<string>,
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => { x: number; y: number }
): UseResizeResult {
  const selectedNodes = (value.nodes ?? []).filter((n) => selectedIds.has(n.id));
  const selectedFloatingEdges = (value.edges ?? [])
    .filter((ed) => selectedIds.has(ed.id) && ed.x2 !== undefined && ed.y2 !== undefined)
    .map((ed) => ({ ...ed, x2: ed.x2!, y2: ed.y2! }));

  function applyResize(event: PointerEvent<SVGSVGElement>, multiResizeDrag: MultiResizeDrag): void {
    const point = toCanvasPoint(event);
    const { handleId, fixedX, fixedY, origBBox, origNodes, origEdges } = multiResizeDrag;

    const origWidth = origBBox.maxX - origBBox.minX;
    const origHeight = origBBox.maxY - origBBox.minY;
    if (origWidth === 0 || origHeight === 0) {
      return;
    }

    const [tx, ty] = HANDLE_POSITIONS[handleId];
    const newMinX = tx === 0 ? point.x : fixedX;
    const newMaxX = tx === 1 ? point.x : fixedX;
    const newMinY = ty === 0 ? point.y : fixedY;
    const newMaxY = ty === 1 ? point.y : fixedY;

    const finalMinX = tx === 0.5 ? origBBox.minX : Math.min(newMinX, newMaxX);
    const finalMaxX = tx === 0.5 ? origBBox.maxX : Math.max(newMinX, newMaxX);
    const finalMinY = ty === 0.5 ? origBBox.minY : Math.min(newMinY, newMaxY);
    const finalMaxY = ty === 0.5 ? origBBox.maxY : Math.max(newMinY, newMaxY);

    const scaleX = (finalMaxX - finalMinX) / origWidth;
    const scaleY = (finalMaxY - finalMinY) / origHeight;

    onChange(
      produce(value, (draft) => {
        origNodes.forEach(({ id, x, y, size }) => {
          const node = (draft.nodes ?? []).find((n) => n.id === id);
          if (!node) {
            return;
          }
          const relX = (x - origBBox.minX) / origWidth;
          const relY = (y - origBBox.minY) / origHeight;
          node.x = finalMinX + relX * (finalMaxX - finalMinX);
          node.y = finalMinY + relY * (finalMaxY - finalMinY);
          node.size = Math.max(MIN_NODE_SIZE, size * Math.max(scaleX, scaleY));
        });
        origEdges.forEach(({ id, x2, y2 }) => {
          const edge = (draft.edges ?? []).find((ed) => ed.id === id);
          if (!edge) {
            return;
          }
          const relX = (x2 - origBBox.minX) / origWidth;
          const relY = (y2 - origBBox.minY) / origHeight;
          edge.x2 = finalMinX + relX * (finalMaxX - finalMinX);
          edge.y2 = finalMinY + relY * (finalMaxY - finalMinY);
        });
      })
    );
  }

  function commitResize(): EditorAction {
    return { type: 'RESIZE_END' };
  }

  function startResize(event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId): EditorAction | null {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const freeEndpoints = selectedFloatingEdges.map((ed) => ({ x: ed.x2 as number, y: ed.y2 as number }));
    const selectionBounds = nodeBBox(selectedNodes as NodeSpec[], freeEndpoints);
    if (!selectionBounds) {
      return null;
    }
    const fixed = handlePosition(selectionBounds, OPPOSITE_HANDLE[handleId]);
    return {
      type: 'RESIZE_START',
      handleId,
      fixedX: fixed.x,
      fixedY: fixed.y,
      origBBox: selectionBounds,
      origNodes: selectedNodes.map((n) => ({ id: n.id, x: n.x, y: n.y, size: n.size })),
      origEdges: selectedFloatingEdges.map((ed) => ({ id: ed.id, x2: ed.x2 as number, y2: ed.y2 as number })),
    };
  }

  return { startResize, applyResize, commitResize };
}
