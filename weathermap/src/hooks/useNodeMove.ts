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
import { ZoomTransform } from 'd3-zoom';
import { produce } from 'immer';
import { WeathermapSpec } from '../model';
import { EditorAction } from '../utils/editorReducer';

interface UseNodeMoveResult {
  startMove: (event: PointerEvent<SVGRectElement>, id: string) => EditorAction | null;
  applyMove: (event: PointerEvent<SVGRectElement>, id: string) => void;
}

export function useNodeMove(
  value: WeathermapSpec,
  onChange: (v: WeathermapSpec) => void,
  selectedIds: Set<string>,
  transform: ZoomTransform
): UseNodeMoveResult {
  function startMove(event: PointerEvent<SVGRectElement>, id: string): EditorAction | null {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!selectedIds.has(id)) {
      return { type: 'SELECT_NODES', ids: new Set([id]) };
    }
    return null;
  }

  function applyMove(event: PointerEvent<SVGRectElement>, id: string): void {
    const isDraggingSelectedNode = event.buttons !== 0 && selectedIds.has(id);
    if (!isDraggingSelectedNode) {
      return;
    }
    const dx = event.movementX / transform.k;
    const dy = event.movementY / transform.k;
    onChange(
      produce(value, (draft) => {
        (draft.nodes ?? []).forEach((n) => {
          if (selectedIds.has(n.id)) {
            n.x += dx;
            n.y += dy;
          }
        });
        (draft.edges ?? []).forEach((edge) => {
          if (selectedIds.has(edge.id) && edge.x2 && edge.y2) {
            edge.x2 += dx;
            edge.y2 += dy;
          }
        });
      })
    );
  }

  return { startMove, applyMove };
}
