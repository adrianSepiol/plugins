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
import { Autocomplete, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import { NodeSpec } from '../../model';
import { ICON_NAMES } from '../../utils/icons';
import { IconPreview } from './IconPreview';

interface NodePropertiesPanelProps {
  node: NodeSpec;
  onChange: (updated: NodeSpec) => void;
}

export function NodePropertiesPanel({ node, onChange }: NodePropertiesPanelProps): ReactElement {
  const { queryDefinitions } = useDataQueriesContext();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = Array.from({ length: queryCount }, (_, i) => i);
  const shape = node.kind;

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Node properties</Typography>

      <Stack direction="row" spacing={1}>
        <TextField
          label="X"
          size="small"
          type="number"
          value={node.x}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) {
              onChange({ ...node, x: v });
            }
          }}
          sx={{ width: 80 }}
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          value={node.y}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) {
              onChange({ ...node, y: v });
            }
          }}
          sx={{ width: 80 }}
        />
        <TextField
          label="Size"
          size="small"
          type="number"
          value={node.size}
          inputProps={{ min: 8 }}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 8) {
              onChange({ ...node, size: v });
            }
          }}
          sx={{ width: 80 }}
        />
      </Stack>

      <TextField
        select
        label="Shape"
        size="small"
        value={shape}
        onChange={(e) => onChange({ ...node, kind: e.target.value as NodeSpec['kind'] })}
      >
        <MenuItem value="rectangle">Rectangle</MenuItem>
        <MenuItem value="icon">Icon</MenuItem>
        <MenuItem value="text">Text</MenuItem>
      </TextField>

      {shape !== 'text' && (
        <Autocomplete
          options={ICON_NAMES}
          value={node.icon ?? null}
          onChange={(_, newIcon) => onChange({ ...node, icon: newIcon ?? undefined })}
          renderInput={(params) => <TextField {...params} label="Icon" size="small" />}
          renderOption={(props, name) => (
            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconPreview name={name} />
              <Typography variant="body2">{name}</Typography>
            </Box>
          )}
          isOptionEqualToValue={(option, value) => option === value}
          clearOnEscape
          size="small"
        />
      )}

      <TextField
        label="Link URL"
        size="small"
        value={node.link ?? ''}
        onChange={(e) => onChange({ ...node, link: e.target.value || undefined })}
        helperText="Navigate to this URL on click. Use ${varName} for dashboard variables."
      />

      <TextField
        label="Label"
        size="small"
        value={node.label ?? ''}
        onChange={(e) => onChange({ ...node, label: e.target.value || undefined })}
        helperText="Use {{label_name}} or {{value}} to interpolate query data"
      />

      <Stack direction="row" spacing={1}>
        <TextField
          select
          label="Label position"
          size="small"
          value={node.labelPosition ?? 'below'}
          onChange={(e) => onChange({ ...node, labelPosition: e.target.value as NodeSpec['labelPosition'] })}
          sx={{ flex: 1 }}
        >
          <MenuItem value="below">Below</MenuItem>
          <MenuItem value="above">Above</MenuItem>
          <MenuItem value="left">Left</MenuItem>
          <MenuItem value="right">Right</MenuItem>
          <MenuItem value="center">Center</MenuItem>
        </TextField>
        <TextField
          label="Label padding"
          size="small"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
          value={node.labelPadding ?? ''}
          placeholder="12"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange({ ...node, labelPadding: !isNaN(v) && v >= 0 ? v : undefined });
          }}
          sx={{ width: 100 }}
        />
      </Stack>

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
            {queryNames[qi] ?? `#${qi + 1}`}
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
