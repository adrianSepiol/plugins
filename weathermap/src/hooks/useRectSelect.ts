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
import { EdgeSpec, NodeSpec } from '../model';
import { computeSelectionFromRect } from '../utils/selectionUtils';
import { EditorAction, SelectionRect } from '../utils/editorReducer';

function isPanGesture(event: PointerEvent): boolean {
  return event.button === 1;
}

function isCanvasBackground(event: PointerEvent<SVGSVGElement>): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }
  return !event.target.closest('rect') && !event.target.closest('[data-cross]');
}

interface UseRectSelectResult {
  startSelection: (event: PointerEvent<SVGSVGElement>) => EditorAction | null;
  updateSelection: (event: PointerEvent<SVGSVGElement>) => EditorAction;
  commitSelection: (selectionRect: SelectionRect) => EditorAction;
}

export function useRectSelect(
  nodes: NodeSpec[],
  edges: EdgeSpec[],
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => { x: number; y: number }
): UseRectSelectResult {
  function startSelection(event: PointerEvent<SVGSVGElement>): EditorAction | null {
    if (isPanGesture(event)) {
      return null;
    }
    if (!isCanvasBackground(event)) {
      return null;
    }
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt = toCanvasPoint(event);
    return { type: 'SELECTION_RECT_START', x: pt.x, y: pt.y };
  }

  function updateSelection(event: PointerEvent<SVGSVGElement>): EditorAction {
    const point = toCanvasPoint(event);
    return { type: 'SELECTION_RECT_UPDATE', x: point.x, y: point.y };
  }

  function commitSelection(selectionRect: SelectionRect): EditorAction {
    const hit = computeSelectionFromRect(selectionRect, nodes, edges);
    return { type: 'SELECTION_RECT_COMMIT', selectedIds: hit };
  }

  return { startSelection, updateSelection, commitSelection };
}
