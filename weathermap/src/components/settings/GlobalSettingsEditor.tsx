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
  FormatControlsProps,
  OptionsEditorGrid,
  OptionsEditorColumn,
  OptionsEditorGroup,
  ThresholdsEditor,
  ThresholdsEditorProps,
  formatValue,
} from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { ReactElement, useReducer, useRef } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { produce } from 'immer';
import { EdgeSpec, NodeSpec, WeathermapOptions } from '../../types/weathermap-types';
import { editorReducer, INITIAL_EDITOR_STATE } from '../../utils/editorReducer';
import { DEFAULT_NODE_SIZE } from '../node/NodeRenderer';
import { EditorCanvas } from '../editor/EditorCanvas';
import { NodePropertiesPanel } from '../editor/NodePropertiesPanel';
import { EdgePropertiesPanel } from '../editor/EdgePropertiesPanel';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

type GlobalSettingsEditorProps = OptionsEditorProps<WeathermapOptions>;

const _gseRenderCount = { n: 0 };

export function GlobalSettingsEditor(props: GlobalSettingsEditorProps): ReactElement {
  const { onChange, value } = props;

  _gseRenderCount.n += 1;
  console.log(`[GlobalSettingsEditor] render #${_gseRenderCount.n} ts:${Date.now()}`);

  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);
  const { selectedIds } = state;

  const viewCenterRef = useRef<() => { x: number; y: number }>(() => ({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }));

  const nodes = value.nodes ?? [];
  const edges = value.edges ?? [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((ed) => [ed.id, ed]));
  const [firstSelectedId] = selectedIds;
  const selectedNode = selectedIds.size === 1 && firstSelectedId ? (nodeById.get(firstSelectedId) ?? null) : null;
  const selectedEdge = selectedIds.size === 1 && firstSelectedId ? (edgeById.get(firstSelectedId) ?? null) : null;

  const handleThresholdsChange: ThresholdsEditorProps['onChange'] = (thresholds) => {
    onChange({ ...value, thresholds });
  };

  const handleFormatChange: FormatControlsProps['onChange'] = (format) => {
    onChange({ ...value, format });
  };

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
    const center = viewCenterRef.current();
    onChange(
      produce(value, (draft) => {
        (draft.nodes ??= []).push({
          id,
          x: center.x,
          y: center.y,
          size: DEFAULT_NODE_SIZE,
          kind: 'icon',
        });
      })
    );
    dispatch({ type: 'SELECT_NODES', ids: new Set([id]) });
  }

  const thresholdSteps = value.thresholds?.steps ?? [];

  function handleDefaultStrokeWidthChange(raw: string) {
    const parsed = parseFloat(raw);
    onChange({ ...value, edgeDefaultStrokeWidth: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined });
  }

  function handleStepStrokeWidthChange(stepIndex: number, raw: string) {
    const parsed = parseFloat(raw);
    const width = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    onChange(
      produce(value, (draft) => {
        draft.edgeThresholdWidths ??= [];
        while (draft.edgeThresholdWidths.length <= stepIndex) {
          draft.edgeThresholdWidths.push({
            value: thresholdSteps[draft.edgeThresholdWidths.length]?.value ?? 0,
            strokeWidth: 2,
          });
        }
        if (width !== undefined) {
          draft.edgeThresholdWidths[stepIndex] = {
            value: thresholdSteps[stepIndex]?.value ?? 0,
            strokeWidth: width,
          };
        } else {
          draft.edgeThresholdWidths.splice(stepIndex, 1);
        }
      })
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Legend">
            <FormControlLabel
              control={
                <Switch
                  checked={value.legend !== undefined}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      legend: e.target.checked ? { position: value.legend?.position ?? 'bottom' } : undefined,
                    })
                  }
                />
              }
              label="Show legend"
            />
            {value.legend !== undefined && (
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Position</InputLabel>
                <Select
                  label="Position"
                  value={value.legend.position ?? 'bottom'}
                  onChange={(e) => onChange({ ...value, legend: { position: e.target.value as 'bottom' | 'right' } })}
                >
                  <MenuItem value="bottom">Bottom</MenuItem>
                  <MenuItem value="right">Right</MenuItem>
                </Select>
              </FormControl>
            )}
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Background">
            <TextField
              label="Image URL"
              size="small"
              fullWidth
              value={value.backgroundImage ?? ''}
              onChange={(e) => onChange({ ...value, backgroundImage: e.target.value || undefined })}
              placeholder="https://example.com/network-map.png"
              sx={{ mb: 1 }}
            />
            {value.backgroundImage && (
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Fit</InputLabel>
                <Select
                  label="Fit"
                  value={value.backgroundImageFit ?? 'contain'}
                  onChange={(e) => onChange({ ...value, backgroundImageFit: e.target.value as 'contain' | 'stretch' })}
                >
                  <MenuItem value="contain">Contain</MenuItem>
                  <MenuItem value="stretch">Stretch to panel</MenuItem>
                </Select>
              </FormControl>
            )}
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Format">
            <FormatControls value={value.format ?? { unit: 'decimal' }} onChange={handleFormatChange} />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <ThresholdsEditor hideDefault thresholds={value.thresholds} onChange={handleThresholdsChange} />
          <OptionsEditorGroup title="Edge thickness">
            <TextField
              label="Default stroke width"
              size="small"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
              value={value.edgeDefaultStrokeWidth ?? ''}
              onChange={(e) => handleDefaultStrokeWidthChange(e.target.value)}
              placeholder="2"
              sx={{ mb: 1, width: 180 }}
            />
            {thresholdSteps.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Per-threshold widths
                </Typography>
                {thresholdSteps.map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: 70, color: 'text.secondary' }}>
                      ≥ {formatValue(step.value, value.format)}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
                      value={value.edgeThresholdWidths?.[i]?.strokeWidth ?? ''}
                      onChange={(e) => handleStepStrokeWidthChange(i, e.target.value)}
                      sx={{ width: 100 }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>
      </OptionsEditorGrid>

      <OptionsEditorGroup title="Items">
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <EditorCanvas value={value} onChange={onChange} state={state} dispatch={dispatch} viewCenterRef={viewCenterRef} />

          <Divider orientation="vertical" flexItem />
          <Box sx={{ width: `calc(100% - ${CANVAS_WIDTH}px)` }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Item</InputLabel>
                <Select
                  label="Item"
                  value={selectedNode?.id ?? selectedEdge?.id ?? ''}
                  MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
                  onChange={(e) => {
                    const id = e.target.value;
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
                onClick={() => {
                  onChange(
                    produce(value, (draft) => {
                      draft.nodes = (draft.nodes ?? []).filter((n) => !selectedIds.has(n.id));
                      draft.edges = (draft.edges ?? []).filter(
                        (ed) => !selectedIds.has(ed.id) && !selectedIds.has(ed.source) && !selectedIds.has(ed.target)
                      );
                    })
                  );
                  dispatch({ type: 'CLEAR_SELECTION' });
                }}
              >
                Delete
              </Button>
            </Box>
            {selectedNode && <NodePropertiesPanel node={selectedNode} onChange={onNodePropertiesChange} />}
            {selectedEdge && (
              <EdgePropertiesPanel edge={selectedEdge} nodes={nodes} onChange={onEdgePropertiesChange} />
            )}
          </Box>
        </Box>
      </OptionsEditorGroup>
    </Box>
  );
}
