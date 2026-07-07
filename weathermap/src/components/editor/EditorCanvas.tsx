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

import { KeyboardEvent, PointerEvent, ReactElement, useLayoutEffect, useRef } from 'react';
import { produce } from 'immer';
import { AnchorPoint } from '../../model';
import { nodeBBox } from '../../utils/resizeUtils';
import { useZoom } from '../../hooks/useZoom';
import { useZoomContext, ZoomProvider } from '../../contexts/ZoomContext';
import { useNodeMove } from '../../hooks/useNodeMove';
import { useEdgeConnect } from '../../hooks/useEdgeConnect';
import { useResize } from '../../hooks/useResize';
import { useRectSelect } from '../../hooks/useRectSelect';
import { useEditorContext } from '../../contexts/EditorContext';
import { useSpecContext } from '../../contexts/SpecContext';
import { EditorEdge } from './EditorEdge';
import { EditorNode } from './EditorNode';
import { SelectionBoundingBox } from './SelectionBoundingBox';
import { DragEdgeLine } from './DragEdgeLine';
import { SelectionRectOverlay } from './SelectionRectOverlay';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const NS_PREFIX = 'wm-arrow-editor';

function isActivePointerMove(event: PointerEvent): boolean {
  return event.buttons !== 0;
}

interface EditorCanvasSvgProps {
  svgRef: (node: SVGSVGElement | null) => void;
}

function EditorCanvasSvg({ svgRef }: EditorCanvasSvgProps): ReactElement {
  const { value, onChange, nodes, edges, nodeById } = useSpecContext();
  const { state, dispatch } = useEditorContext();
  const { transform, toCanvasPoint, fitView } = useZoomContext();

  const edgeById = new Map(edges.map((e) => [e.id, e]));

  const { startMove, applyMove } = useNodeMove(value, onChange, state.selectedIds, transform);
  const { startEdgeDrag, startEndpointDrag, updateEdgeDrag, commitEdgeDrag } =
    useEdgeConnect(value, onChange, nodes, nodeById, edgeById, toCanvasPoint);
  const { startResize, applyResize, commitResize } =
    useResize(value, onChange, state.selectedIds, toCanvasPoint);
  const { startSelection, updateSelection, commitSelection } =
    useRectSelect(nodes, edges, toCanvasPoint);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const didFitRef = useRef(false);
  useLayoutEffect(() => {
    if (didFitRef.current || nodesRef.current.length === 0) {
      return;
    }
    const bbox = nodeBBox(nodesRef.current);
    if (bbox) {
      fitView(bbox, CANVAS_WIDTH, CANVAS_HEIGHT);
      didFitRef.current = true;
    }
  }, [fitView]);

  const { mode, selectedIds, hoveredId } = state;
  const selectionRect = mode.type === 'selecting' ? mode.rect : null;
  const dragEdge = mode.type === 'dragging-edge' ? mode.dragEdge : null;
  const multiResizeDrag = mode.type === 'resizing' ? mode.multiResizeDrag : null;

  const selectedNodes = nodes.filter((n) => selectedIds.has(n.id));
  const selectedFloatingEdges = edges
    .filter((ed) => selectedIds.has(ed.id) && ed.x2 !== undefined && ed.y2 !== undefined)
    .map((ed) => ({ ...ed, x2: ed.x2!, y2: ed.y2! }));
  const selectionBoundingBox =
    mode.type === 'idle' && selectedNodes.length >= 1
      ? nodeBBox(
          selectedNodes,
          selectedFloatingEdges.map((ed) => ({ x: ed.x2, y: ed.y2 }))
        )
      : null;

  function onSvgPointerMove(event: PointerEvent<SVGSVGElement>): void {
    switch (mode.type) {
      case 'resizing':
        if (isActivePointerMove(event)) {
          applyResize(event, mode.multiResizeDrag);
        }
        break;
      case 'dragging-edge':
        if (isActivePointerMove(event)) {
          dispatch(updateEdgeDrag(event, mode.dragEdge));
        }
        break;
      case 'selecting':
        if (isActivePointerMove(event)) {
          dispatch(updateSelection(event));
        }
        break;
    }
  }

  function onSvgPointerUp(event: PointerEvent<SVGSVGElement>): void {
    switch (mode.type) {
      case 'resizing':
        dispatch(commitResize());
        break;
      case 'dragging-edge':
        dispatch(commitEdgeDrag(event, mode.dragEdge));
        break;
      case 'selecting':
        dispatch(commitSelection(mode.rect));
        break;
    }
  }

  function onSvgPointerDown(event: PointerEvent<SVGSVGElement>): void {
    if (mode.type !== 'idle') {
      return;
    }
    const action = startSelection(event);
    if (action) {
      dispatch(action);
    }
  }

  function onEdgeClick(event: PointerEvent<SVGLineElement>, edgeId: string): void {
    event.stopPropagation();
    dispatch({ type: 'SELECT_NODES', ids: new Set([edgeId]) });
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>): void {
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
      ref={svgRef}
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
      onDoubleClick={() => {
        const bbox = nodeBBox(nodes);
        if (bbox) {
          fitView(bbox, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <g transform={transform.toString()}>
        {nodes.map((node) => (
          <EditorNode
            key={node.id}
            node={node}
            isHovered={hoveredId === node.id}
            isSelected={selectedIds.has(node.id)}
            snapTarget={dragEdge?.snapTargetId === node.id}
            isDragging={dragEdge !== null}
            onPointerDown={(event) => {
              const action = startMove(event, node.id);
              if (action) {
                dispatch(action);
              }
            }}
            onPointerMove={(event) => applyMove(event, node.id)}
            onMouseEnter={() => {
              if (!dragEdge) {
                dispatch({ type: 'HOVER_NODE', id: node.id });
              }
            }}
            onMouseLeave={() => dispatch({ type: 'UNHOVER_NODE', id: node.id })}
            onCrossDragStart={(anchor: AnchorPoint, x: number, y: number) => {
              dispatch(startEdgeDrag(node.id, anchor, x, y));
            }}
          />
        ))}

        {edges.map((edge) => (
          <EditorEdge
            key={edge.id}
            edge={edge}
            nodeById={nodeById}
            isSelected={!selectionBoundingBox && selectedIds.has(edge.id)}
            isDragging={dragEdge !== null}
            nsPrefix={NS_PREFIX}
            k={transform.k}
            onEdgeClick={(event) => onEdgeClick(event, edge.id)}
            onEndpointPointerDown={(event, end, fixedX, fixedY, fixedNodeId, fixedAnchor) => {
              const action = startEndpointDrag(event, edge.id, end, fixedX, fixedY, fixedNodeId, fixedAnchor);
              if (action) {
                dispatch(action);
              }
            }}
          />
        ))}

        {selectionBoundingBox && (
          <SelectionBoundingBox
            bbox={selectionBoundingBox}
            isResizing={multiResizeDrag !== null}
            onResizeHandlePointerDown={(event, handleId) => {
              const action = startResize(event, handleId);
              if (action) {
                dispatch(action);
              }
            }}
          />
        )}

        {dragEdge && <DragEdgeLine dragEdge={dragEdge} k={transform.k} nsPrefix={NS_PREFIX} />}

        {selectionRect && <SelectionRectOverlay rect={selectionRect} />}
      </g>
    </svg>
  );
}

export function EditorCanvas(): ReactElement {
  const { svgRef, toCanvasPoint, transform, fitView } = useZoom();

  return (
    <ZoomProvider value={{ toCanvasPoint, transform, fitView }}>
      <EditorCanvasSvg svgRef={svgRef} />
    </ZoomProvider>
  );
}
