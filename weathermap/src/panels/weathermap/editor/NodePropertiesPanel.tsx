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
import { Box, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import { useQueryCountContext } from '@perses-dev/plugin-system';
import { NodeSpec } from '../weathermap-types';
import { ICON_PATHS } from '../icons';
import { IconPreview } from './IconPreview';

const ICON_NAMES = Object.keys(ICON_PATHS);

interface NodePropertiesPanelProps {
  node: NodeSpec;
  onChange: (updated: NodeSpec) => void;
}

export function NodePropertiesPanel({ node, onChange }: NodePropertiesPanelProps): ReactElement {
  const queryCount = useQueryCountContext();
  const queryIndexes = Array.from({ length: queryCount }, (_, i) => i);
  const kind = node.kind ?? 'rectangle';

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Node properties</Typography>

      <TextField
        select
        label="Kind"
        size="small"
        value={kind}
        onChange={(e) => onChange({ ...node, kind: e.target.value as NodeSpec['kind'] })}
      >
        <MenuItem value="rectangle">Rectangle</MenuItem>
        <MenuItem value="icon">Icon</MenuItem>
        <MenuItem value="text">Text</MenuItem>
      </TextField>

      {kind !== 'text' && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Icon
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={node.icon ?? null}
            onChange={(_, newIcon) => onChange({ ...node, icon: newIcon ?? undefined })}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {ICON_NAMES.map((name) => (
              <Tooltip key={name} title={name}>
                <ToggleButton value={name} aria-label={name}>
                  <IconPreview name={name} />
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      <TextField
        label="Label"
        size="small"
        value={node.label ?? ''}
        onChange={(e) => onChange({ ...node, label: e.target.value || undefined })}
        helperText="Use {{label_name}} or {{value}} to interpolate query data"
      />

      <TextField
        select
        label="Query"
        size="small"
        value={node.queryIndex ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...node, queryIndex: v === '' ? undefined : Number(v) });
        }}
        sx={{ minWidth: 120 }}
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

      {node.queryIndex !== undefined && (
        <>
          <TextField
            select
            label="Color mode"
            size="small"
            value={node.colorMode ?? ''}
            onChange={(e) => {
              const v = e.target.value as '' | 'threshold' | 'fixed';
              onChange({ ...node, colorMode: v === '' ? undefined : v });
            }}
          >
            <MenuItem value="">
              <em>None (default)</em>
            </MenuItem>
            <MenuItem value="threshold">Threshold</MenuItem>
            <MenuItem value="fixed">Fixed</MenuItem>
          </TextField>

          {node.colorMode === 'fixed' && (
            <OptionsColorPicker
              label="Color"
              color={node.color ?? '#1976d2'}
              onColorChange={(color) => onChange({ ...node, color })}
              onClear={() => onChange({ ...node, color: undefined })}
            />
          )}
        </>
      )}
    </Stack>
  );
}
