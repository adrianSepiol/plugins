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

import { ReactElement, useMemo } from 'react';
import { Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import { AnchorPoint, EdgeSpec, NodeSpec } from '../../model';

const ANCHOR_OPTIONS: AnchorPoint[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

interface EdgePropertiesPanelProps {
  edge: EdgeSpec;
  nodes: NodeSpec[];
  onChange: (updated: EdgeSpec) => void;
}

export function EdgePropertiesPanel({ edge, nodes, onChange }: EdgePropertiesPanelProps): ReactElement {
  const hasFreeTarget = edge.target === '';
  const { queryDefinitions } = useDataQueriesContext();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = Array.from({ length: queryCount }, (_, i) => i);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Edge properties</Typography>

      <TextField
        select
        label="Source"
        size="small"
        value={edge.source}
        onChange={(e) => onChange({ ...edge, source: e.target.value })}
      >
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Source anchor"
        size="small"
        value={edge.sourceAnchor ?? 'n'}
        onChange={(e) => onChange({ ...edge, sourceAnchor: e.target.value as AnchorPoint })}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Target"
        size="small"
        value={edge.target}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') {
            onChange({ ...edge, target: '', targetAnchor: undefined, x2: undefined, y2: undefined });
          } else {
            onChange({ ...edge, target: v, x2: undefined, y2: undefined });
          }
        }}
      >
        <MenuItem value="">
          <em>None (free endpoint)</em>
        </MenuItem>
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Target anchor"
        size="small"
        value={edge.targetAnchor ?? 'n'}
        disabled={hasFreeTarget}
        onChange={(e) => onChange({ ...edge, targetAnchor: e.target.value as AnchorPoint })}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={edge.bidirectional ?? false}
            onChange={(e) => onChange({ ...edge, bidirectional: e.target.checked || undefined })}
          />
        }
        label="Bidirectional"
      />

      <TextField
        select
        label="Thickness mode"
        size="small"
        value={edge.thicknessMode ?? 'fixed'}
        onChange={(e) => onChange({ ...edge, thicknessMode: e.target.value as 'fixed' | 'threshold' })}
      >
        <MenuItem value="fixed">Fixed</MenuItem>
        <MenuItem value="threshold">Threshold</MenuItem>
      </TextField>

      {(edge.thicknessMode ?? 'fixed') === 'fixed' && (
        <TextField
          label="Stroke width"
          size="small"
          type="number"
          inputProps={{ min: 1, step: 1 }}
          value={edge.strokeWidth ?? ''}
          placeholder="default"
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ ...edge, strokeWidth: Number.isFinite(v) && v > 0 ? v : undefined });
          }}
        />
      )}

      <TextField
        select
        label="Source → target query"
        size="small"
        value={edge.sourceQueryIndex ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...edge, sourceQueryIndex: v === '' ? undefined : Number(v) });
        }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {queryIndexes.map((qi) => (
          <MenuItem key={qi} value={qi}>
            #{qi + 1}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Source label template"
        size="small"
        value={edge.sourceLabelTemplate ?? ''}
        onChange={(e) => onChange({ ...edge, sourceLabelTemplate: e.target.value || undefined })}
        helperText="Use {{value}} to show query result"
      />

      {edge.bidirectional && (
        <>
          <TextField
            select
            label="Target → source query"
            size="small"
            value={edge.targetQueryIndex ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...edge, targetQueryIndex: v === '' ? undefined : Number(v) });
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {queryIndexes.map((qi) => (
              <MenuItem key={qi} value={qi}>
                {queryNames[qi] ?? `#${qi + 1}`}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Target label template"
            size="small"
            value={edge.targetLabelTemplate ?? ''}
            onChange={(e) => onChange({ ...edge, targetLabelTemplate: e.target.value || undefined })}
            helperText="Use {{value}} to show query result"
          />
        </>
      )}
    </Stack>
  );
}
