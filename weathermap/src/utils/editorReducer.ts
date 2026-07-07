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

import { AnchorPoint } from '../model';

export interface SelectionRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface MultiResizeDrag {
  handleId: ResizeHandleId;
  fixedX: number;
  fixedY: number;
  origBBox: BoundingBox;
  origNodes: Array<{ id: string; x: number; y: number; size: number }>;
  origEdges: Array<{ id: string; x2: number; y2: number }>;
}

export interface DragEdge {
  sourceId: string;
  sourceAnchor: AnchorPoint;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  snapTargetId?: string;
  snapTargetAnchor?: AnchorPoint;
  editingEdgeId?: string;
  editingEnd?: 'source' | 'target';
}

export type EditorMode =
  | { type: 'idle' }
  | { type: 'selecting'; rect: SelectionRect }
  | { type: 'dragging-edge'; dragEdge: DragEdge }
  | { type: 'resizing'; multiResizeDrag: MultiResizeDrag };

export interface EditorState {
  mode: EditorMode;
  selectedIds: Set<string>;
  hoveredId: string | null;
}

export const INITIAL_EDITOR_STATE: EditorState = {
  mode: { type: 'idle' },
  selectedIds: new Set(),
  hoveredId: null,
};

export type EditorAction =
  | { type: 'SELECT_NODES'; ids: Set<string> }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'HOVER_NODE'; id: string }
  | { type: 'UNHOVER_NODE'; id: string }
  | { type: 'SELECTION_RECT_START'; x: number; y: number }
  | { type: 'SELECTION_RECT_UPDATE'; x: number; y: number }
  | { type: 'SELECTION_RECT_COMMIT'; selectedIds: Set<string> }
  | { type: 'SELECTION_RECT_CANCEL' }
  | { type: 'DRAG_EDGE_START'; dragEdge: DragEdge }
  | { type: 'DRAG_EDGE_UPDATE'; x2: number; y2: number; snapTargetId?: string; snapTargetAnchor?: AnchorPoint }
  | { type: 'DRAG_EDGE_END' }
  | {
      type: 'RESIZE_START';
      handleId: ResizeHandleId;
      fixedX: number;
      fixedY: number;
      origBBox: MultiResizeDrag['origBBox'];
      origNodes: MultiResizeDrag['origNodes'];
      origEdges: MultiResizeDrag['origEdges'];
    }
  | { type: 'RESIZE_END' };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SELECT_NODES': {
      return { ...state, selectedIds: action.ids };
    }
    case 'CLEAR_SELECTION': {
      return { ...state, selectedIds: new Set() };
    }
    case 'HOVER_NODE': {
      return { ...state, hoveredId: action.id };
    }
    case 'UNHOVER_NODE': {
      return { ...state, hoveredId: state.hoveredId === action.id ? null : state.hoveredId };
    }
    case 'SELECTION_RECT_START': {
      return {
        ...state,
        selectedIds: new Set(),
        mode: { type: 'selecting', rect: { x0: action.x, y0: action.y, x1: action.x, y1: action.y } },
      };
    }
    case 'SELECTION_RECT_UPDATE': {
      if (state.mode.type !== 'selecting') {
        return state;
      }
      return {
        ...state,
        mode: { type: 'selecting', rect: { ...state.mode.rect, x1: action.x, y1: action.y } },
      };
    }
    case 'SELECTION_RECT_COMMIT': {
      return {
        ...state,
        mode: { type: 'idle' },
        selectedIds: action.selectedIds,
      };
    }
    case 'SELECTION_RECT_CANCEL': {
      return { ...state, mode: { type: 'idle' }, selectedIds: new Set() };
    }
    case 'DRAG_EDGE_START': {
      return { ...state, mode: { type: 'dragging-edge', dragEdge: action.dragEdge }, hoveredId: null };
    }
    case 'DRAG_EDGE_UPDATE': {
      if (state.mode.type !== 'dragging-edge') {
        return state;
      }
      return {
        ...state,
        mode: {
          type: 'dragging-edge',
          dragEdge: {
            ...state.mode.dragEdge,
            x2: action.x2,
            y2: action.y2,
            snapTargetId: action.snapTargetId,
            snapTargetAnchor: action.snapTargetAnchor,
          },
        },
      };
    }
    case 'DRAG_EDGE_END': {
      return { ...state, mode: { type: 'idle' } };
    }
    case 'RESIZE_START': {
      return {
        ...state,
        mode: {
          type: 'resizing',
          multiResizeDrag: {
            handleId: action.handleId,
            fixedX: action.fixedX,
            fixedY: action.fixedY,
            origBBox: action.origBBox,
            origNodes: action.origNodes,
            origEdges: action.origEdges,
          },
        },
      };
    }
    case 'RESIZE_END': {
      return { ...state, mode: { type: 'idle' } };
    }
  }
}
