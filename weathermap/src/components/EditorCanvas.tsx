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

import React, { KeyboardEvent, PointerEvent, ReactElement } from 'react';
import { produce } from 'immer';
import { AnchorPoint, WeathermapOptions } from '../types/weathermap-types';
import { anchorPosition, snapTarget } from '../utils/edgeUtils';
import { nodeBBox } from '../utils/resizeUtils';
import { getEditorTheme } from '../utils/editorTheme';
import { EditorAction, EditorState } from '../utils/editorReducer';
import { computeSelectionFromRect } from '../utils/selectionUtils';
import { useZoom } from '../hooks/useZoom';
import { createResizeHandlers } from '../utils/resizeHandlers';
import { createEdgeHandlers } from '../utils/edgeHandlers';
import { EditorEdge } from './EditorEdge';
import { EditorNode } from './EditorNode';
import { SelectionBoundingBox } from './SelectionBoundingBox';
import { DragEdgeLine } from './DragEdgeLine';
import { SelectionRectOverlay } from './SelectionRectOverlay';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const SNAP_RADIUS = 20;
const ARROW_SHORTEN = 6;
const MARKER_ID = 'wm-arrow-node-editor';

// Returns true when the pointer event is a middle-mouse-button press, which
// d3-zoom exclusively uses for panning — canvas interactions should ignore it.
function isPanGesture(event: PointerEvent): boolean {
  return event.button === 1;
}

// Returns true when the pointer landed on a node rect or connection-handle cross
// rather than on the bare canvas background, so those elements can handle the
// event themselves without triggering a selection-rect drag.
function isCanvasBackground(event: PointerEvent<SVGSVGElement>): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }
  return !event.target.closest('rect') && !event.target.closest('[data-cross]');
}

interface EditorCanvasProps {
  value: WeathermapOptions;
  onChange: (v: WeathermapOptions) => void;
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export function EditorCanvas({ value, onChange, state, dispatch }: EditorCanvasProps): ReactElement {
  const { applyZoomBehaviour, transform, resetPan, toSvgPoint } = useZoom();
  const nodes = value.nodes ?? [];
  const edges = value.edges ?? [];

  const { mode, selectedIds, hoveredId } = state;
  const selectionRect = mode.type === 'selecting' ? mode.rect : null;
  const dragEdge = mode.type === 'dragging-edge' ? mode.dragEdge : null;
  const multiResizeDrag = mode.type === 'resizing' ? mode.multiResizeDrag : null;

  const selectedNodes = nodes.filter((n) => selectedIds.has(n.id));
  const selectedFloatingEdges = edges
    .filter((ed) => selectedIds.has(ed.id) && ed.x2 !== undefined && ed.y2 !== undefined)
    .map((ed) => ({ ...ed, x2: ed.x2!, y2: ed.y2! }));
  const selectionBoundingBox =
    mode.type === 'idle' && selectedIds.size >= 1
      ? nodeBBox(
          selectedNodes,
          selectedFloatingEdges.map((ed) => ({ x: ed.x2, y: ed.y2 }))
        )
      : null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((ed) => [ed.id, ed]));

  const theme = getEditorTheme(transform.k);
  const markerUrl = `url(#${MARKER_ID})`;
  const arrowShorten = ARROW_SHORTEN / transform.k;

  const { applyResize, onResizeHandlePointerDown } = createResizeHandlers({
    value,
    onChange,
    dispatch,
    selectedNodes,
    selectedFloatingEdges,
  });

  const { onCrossDragStart, commitEdgeDrag, onEdgeEndpointPointerDown } = createEdgeHandlers({
    value,
    onChange,
    dispatch,
    nodes,
    nodeById,
    edgeById,
    toSvgPoint,
  });

  function onNodePointerDown(event: PointerEvent<SVGRectElement>, id: string) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!selectedIds.has(id)) {
      dispatch({ type: 'SELECT_NODES', ids: new Set([id]) });
    }
  }

  function onNodePointerMove(event: PointerEvent<SVGRectElement>, id: string) {
    const isDraggingSelectedNode = event.buttons !== 0 && selectedIds.has(id);
    if (!isDraggingSelectedNode) {
      return;
    }
    // movementX/Y are in screen pixels; dividing by transform.k converts to canvas
    // coordinates so movement distance stays consistent regardless of zoom level.
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

  function onSvgPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (isPanGesture(event)) {
      return;
    }
    if (!isCanvasBackground(event)) {
      return;
    }
    if (mode.type !== 'idle') {
      return;
    }
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt = toSvgPoint(event);
    dispatch({ type: 'SELECTION_RECT_START', x: pt.x, y: pt.y });
  }

  function onSvgPointerMove(event: PointerEvent<SVGSVGElement>) {
    const isPointerActive = event.buttons !== 0;
    if (!isPointerActive) {
      return;
    }
    const point = toSvgPoint(event);

    switch (mode.type) {
      case 'resizing': {
        applyResize(point, mode.multiResizeDrag);
        return;
      }
      case 'dragging-edge': {
        const snap = snapTarget(nodes, point, mode.dragEdge.sourceId, SNAP_RADIUS);
        dispatch({
          type: 'DRAG_EDGE_UPDATE',
          x2: snap ? anchorPosition(snap.node, snap.anchor).x : point.x,
          y2: snap ? anchorPosition(snap.node, snap.anchor).y : point.y,
          snapTargetId: snap?.node.id,
          snapTargetAnchor: snap?.anchor,
        });
        return;
      }
      case 'selecting': {
        dispatch({ type: 'SELECTION_RECT_UPDATE', x: point.x, y: point.y });
        return;
      }
      case 'idle': {
        return;
      }
    }
  }

  function onSvgPointerUp(event: PointerEvent<SVGSVGElement>) {
    switch (mode.type) {
      case 'resizing': {
        dispatch({ type: 'RESIZE_END' });
        return;
      }
      case 'dragging-edge': {
        commitEdgeDrag(event, mode.dragEdge);
        dispatch({ type: 'DRAG_EDGE_END' });
        return;
      }
      case 'selecting': {
        const hit = computeSelectionFromRect(mode.rect, nodes, edges);
        dispatch({ type: 'SELECTION_RECT_COMMIT', selectedIds: hit });
        return;
      }
      case 'idle': {
        return;
      }
    }
  }

  function onEdgeClick(event: PointerEvent<SVGLineElement>, edgeId: string) {
    event.stopPropagation();
    dispatch({ type: 'SELECT_NODES', ids: new Set([edgeId]) });
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }
    if (selectedIds.size > 0) {
      onChange(
        produce(value, (draft) => {
          draft.nodes = (draft.nodes ?? []).filter((n) => !selectedIds.has(n.id));
          draft.edges = (draft.edges ?? []).filter(
            (ed) => !selectedIds.has(ed.id) && !selectedIds.has(ed.source) && !selectedIds.has(ed.target)
          );
        })
      );
      dispatch({ type: 'CLEAR_SELECTION' });
    }
  }

  return (
    <svg
      ref={applyZoomBehaviour}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      tabIndex={0}
      style={{
        display: 'block',
        cursor: dragEdge ? 'crosshair' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        outline: 'none',
      }}
      onDoubleClick={resetPan}
      onKeyDown={onKeyDown}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        <marker
          id={MARKER_ID}
          markerWidth={8 / transform.k}
          markerHeight={6 / transform.k}
          refX={7 / transform.k}
          refY={3 / transform.k}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M0,0 L0,${6 / transform.k} L${8 / transform.k},${3 / transform.k} z`}
            fill="currentColor"
            fillOpacity={theme.arrowOpacity}
          />
        </marker>
      </defs>

      <g transform={transform.toString()}>
        {edges.map((edge) => (
          <EditorEdge
            key={edge.id}
            edge={edge}
            nodeById={nodeById}
            isSelected={selectedIds.has(edge.id)}
            isDragging={dragEdge !== null}
            markerUrl={markerUrl}
            arrowShorten={arrowShorten}
            theme={theme}
            onEdgeClick={(event) => onEdgeClick(event, edge.id)}
            onEndpointPointerDown={(event, end, fixedX, fixedY, fixedNodeId, fixedAnchor) =>
              onEdgeEndpointPointerDown(event, edge.id, end, fixedX, fixedY, fixedNodeId, fixedAnchor)
            }
          />
        ))}

        {nodes.map((node) => (
          <EditorNode
            key={node.id}
            node={node}
            isHovered={hoveredId === node.id}
            isSelected={selectedIds.has(node.id)}
            snapTarget={dragEdge?.snapTargetId === node.id}
            isDragging={dragEdge !== null}
            k={transform.k}
            theme={theme}
            onPointerDown={(event) => onNodePointerDown(event, node.id)}
            onPointerMove={(event) => onNodePointerMove(event, node.id)}
            onMouseEnter={() => {
              if (!dragEdge) {
                dispatch({ type: 'HOVER_NODE', id: node.id });
              }
            }}
            onMouseLeave={() => dispatch({ type: 'UNHOVER_NODE', id: node.id })}
            onCrossDragStart={(anchor: AnchorPoint, x: number, y: number) => onCrossDragStart(node.id, anchor, x, y)}
          />
        ))}

        {selectionBoundingBox && (
          <SelectionBoundingBox
            bbox={selectionBoundingBox}
            isResizing={multiResizeDrag !== null}
            theme={theme}
            onResizeHandlePointerDown={onResizeHandlePointerDown}
          />
        )}

        {dragEdge && (
          <DragEdgeLine dragEdge={dragEdge} arrowShorten={arrowShorten} markerUrl={markerUrl} theme={theme} />
        )}

        {selectionRect && <SelectionRectOverlay rect={selectionRect} theme={theme} />}
      </g>
    </svg>
  );
}
