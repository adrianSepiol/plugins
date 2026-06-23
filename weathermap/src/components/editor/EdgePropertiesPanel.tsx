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

import { ReactElement } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { AnchorPoint, EdgeSpec, NodeSpec } from '../../types/weathermap-types';

const ANCHOR_OPTIONS: AnchorPoint[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

interface EdgePropertiesPanelProps {
  edge: EdgeSpec;
  nodes: NodeSpec[];
  onChange: (updated: EdgeSpec) => void;
}

export function EdgePropertiesPanel({ edge, nodes, onChange }: EdgePropertiesPanelProps): ReactElement {
  const hasFreeTarget = edge.target === '';

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
    </Stack>
  );
}
