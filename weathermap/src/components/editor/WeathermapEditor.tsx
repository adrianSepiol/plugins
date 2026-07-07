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

import React, { ReactElement, ReactNode, useReducer, useRef } from 'react';
import { produce } from 'immer';
import { EdgeSpec, NodeSpec, WeathermapSpec } from '../../model';
import { editorReducer, INITIAL_EDITOR_STATE } from '../../utils/editorReducer';
import { DEFAULT_NODE_SIZE } from '../shared/NodeRenderer';
import { EditorContext } from '../../contexts/EditorContext';
import { SpecContext } from '../../contexts/SpecContext';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

interface WeathermapEditorProps {
  value: WeathermapSpec;
  onChange: (v: WeathermapSpec) => void;
  children: ReactNode;
}

export function WeathermapEditor({ value, onChange, children }: WeathermapEditorProps): ReactElement {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);

  const nodes = value.nodes ?? [];
  const edges = value.edges ?? [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((ed) => [ed.id, ed]));

  // Exposed so EditorCanvas can compute the canvas-centre in current zoom space.
  // Written by EditorCanvas on each render; read by addNode.
  const viewCenterRef = useRef<() => { x: number; y: number }>(() => ({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }));

  function addNode(): void {
    const id = `node-${Date.now()}`;
    const center = viewCenterRef.current();
    onChange(
      produce(value, (draft) => {
        (draft.nodes ??= []).push({ id, x: center.x, y: center.y, size: DEFAULT_NODE_SIZE, kind: 'icon' });
      })
    );
    dispatch({ type: 'SELECT_NODES', ids: new Set([id]) });
  }

  function deleteSelected(): void {
    const { selectedIds } = state;
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

  function onNodePropertiesChange(updated: NodeSpec): void {
    onChange(
      produce(value, (draft) => {
        const idx = (draft.nodes ?? []).findIndex((n) => n.id === updated.id);
        if (idx !== -1 && draft.nodes) {
          draft.nodes[idx] = updated;
        }
      })
    );
  }

  function onEdgePropertiesChange(updated: EdgeSpec): void {
    onChange(
      produce(value, (draft) => {
        const idx = (draft.edges ?? []).findIndex((ed) => ed.id === updated.id);
        if (idx !== -1 && draft.edges) {
          draft.edges[idx] = updated;
        }
      })
    );
  }

  const specCtx = {
    value,
    onChange,
    nodes,
    edges,
    nodeById,
    edgeById,
    viewCenterRef,
    addNode,
    deleteSelected,
    onNodePropertiesChange,
    onEdgePropertiesChange,
  };

  const editorCtx = { state, dispatch };

  return (
    <SpecContext.Provider value={specCtx}>
      <EditorContext.Provider value={editorCtx}>{children}</EditorContext.Provider>
    </SpecContext.Provider>
  );
}
