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

import {
  FormatControls,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
} from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { WeathermapSpec } from '../../model';
import { useEditorContext } from '../../contexts/EditorContext';
import { useSpecContext } from '../../contexts/SpecContext';
import { WeathermapEditor } from '../editor/WeathermapEditor';
import { EditorCanvas } from '../editor/EditorCanvas';
import { NodePropertiesPanel } from '../editor/NodePropertiesPanel';
import { EdgePropertiesPanel } from '../editor/EdgePropertiesPanel';
import { LegendSettings } from './LegendSettings';
import { BackgroundSettings } from './BackgroundSettings';
import { EdgeThicknessSettings } from './EdgeThicknessSettings';

const CANVAS_WIDTH = 600;

type GlobalSettingsEditorProps = OptionsEditorProps<WeathermapSpec>;

export function GlobalSettingsEditor({ value, onChange }: GlobalSettingsEditorProps): ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Legend">
            <LegendSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Background">
            <BackgroundSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Format">
            <FormatControls
              value={value.format ?? { unit: 'decimal' }}
              onChange={(format) => onChange({ ...value, format })}
            />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <ThresholdsEditor
            hideDefault
            thresholds={value.thresholds}
            onChange={(thresholds) => onChange({ ...value, thresholds })}
          />
          <OptionsEditorGroup title="Edge thickness">
            <EdgeThicknessSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
      </OptionsEditorGrid>

      <OptionsEditorGroup title="Items">
        <WeathermapEditor value={value} onChange={onChange}>
          <EditorItemsPanel canvasWidth={CANVAS_WIDTH} />
        </WeathermapEditor>
      </OptionsEditorGroup>
    </Box>
  );
}

function EditorItemsPanel({ canvasWidth }: { canvasWidth: number }): ReactElement {
  const { nodes, edges, nodeById, edgeById, addNode, deleteSelected, onNodePropertiesChange, onEdgePropertiesChange } =
    useSpecContext();
  const { state, dispatch } = useEditorContext();
  const { selectedIds } = state;
  const [firstSelectedId] = selectedIds;
  const selectedNode = selectedIds.size === 1 && firstSelectedId ? (nodeById.get(firstSelectedId) ?? null) : null;
  const selectedEdge = selectedIds.size === 1 && firstSelectedId ? (edgeById.get(firstSelectedId) ?? null) : null;

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <EditorCanvas />

      <Divider orientation="vertical" flexItem />
      <Box sx={{ width: `calc(100% - ${canvasWidth}px)` }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Item</InputLabel>
            <Select
              label="Item"
              value={selectedNode?.id ?? selectedEdge?.id ?? ''}
              MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
              onChange={(event) => {
                const id = event.target.value;
                dispatch({ type: 'SELECT_NODES', ids: id ? new Set([id]) : new Set() });
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {nodes.map((n) => (
                <MenuItem key={n.id} value={n.id}>
                  {n.label ?? n.id}
                </MenuItem>
              ))}
              {edges.map((ed) => (
                <MenuItem key={ed.id} value={ed.id}>
                  {ed.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={addNode}>
            Add
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            disabled={selectedIds.size === 0}
            onClick={deleteSelected}
          >
            Delete
          </Button>
        </Box>
        {selectedNode && <NodePropertiesPanel node={selectedNode} onChange={onNodePropertiesChange} />}
        {selectedEdge && <EdgePropertiesPanel edge={selectedEdge} nodes={nodes} onChange={onEdgePropertiesChange} />}
      </Box>
    </Box>
  );
}
