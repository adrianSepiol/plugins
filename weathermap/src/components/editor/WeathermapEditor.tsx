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

import { ReactElement, useReducer } from 'react';
import { Box, Button, Divider } from '@mui/material';
import { produce } from 'immer';
import { EdgeSpec, NodeSpec, WeathermapOptionsEditorProps } from '../../types/weathermap-types';
import { editorReducer, INITIAL_EDITOR_STATE } from '../../utils/editorReducer';
import { DEFAULT_NODE_SIZE } from '../node/NodeRenderer';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { EdgePropertiesPanel } from './EdgePropertiesPanel';
import { EditorCanvas } from './EditorCanvas';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export function WeathermapEditor({ value, onChange }: WeathermapOptionsEditorProps): ReactElement {
  const nodes = value.nodes ?? [];
  const edges = value.edges ?? [];

  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);
  const { selectedIds } = state;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((ed) => [ed.id, ed]));
  const [firstSelectedId] = selectedIds;
  const selectedNode = selectedIds.size === 1 && firstSelectedId ? (nodeById.get(firstSelectedId) ?? null) : null;
  const selectedEdge = selectedIds.size === 1 && firstSelectedId ? (edgeById.get(firstSelectedId) ?? null) : null;

  function onNodePropertiesChange(updated: NodeSpec) {
    onChange(
      produce(value, (draft) => {
        const idx = (draft.nodes ?? []).findIndex((n) => n.id === updated.id);
        if (idx !== -1 && draft.nodes) {
          draft.nodes[idx] = updated;
        }
      })
    );
  }

  function onEdgePropertiesChange(updated: EdgeSpec) {
    onChange(
      produce(value, (draft) => {
        const idx = (draft.edges ?? []).findIndex((ed) => ed.id === updated.id);
        if (idx !== -1 && draft.edges) {
          draft.edges[idx] = updated;
        }
      })
    );
  }

  function addNode() {
    const id = `node-${Date.now()}`;
    onChange(
      produce(value, (draft) => {
        (draft.nodes ??= []).push({
          id,
          x: CANVAS_WIDTH / 2,
          y: CANVAS_HEIGHT / 2,
          size: DEFAULT_NODE_SIZE,
          kind: 'icon',
        });
      })
    );
    dispatch({ type: 'SELECT_NODES', ids: new Set([id]) });
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box>
        <EditorCanvas value={value} onChange={onChange} state={state} dispatch={dispatch} />
        <Button variant="outlined" size="small" onClick={addNode} sx={{ mt: 1 }}>
          Add Node
        </Button>
      </Box>

      {(selectedNode || selectedEdge) && (
        <>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ minWidth: 220 }}>
            {selectedNode && <NodePropertiesPanel node={selectedNode} onChange={onNodePropertiesChange} />}
            {selectedEdge && (
              <EdgePropertiesPanel edge={selectedEdge} nodes={nodes} onChange={onEdgePropertiesChange} />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
