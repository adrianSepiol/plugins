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
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import { formatValue } from '@perses-dev/components';
import { produce } from 'immer';
import { WeathermapSpec } from '../../model';

interface EdgeThicknessSettingsProps {
  value: WeathermapSpec;
  onChange: (value: WeathermapSpec) => void;
}

export function EdgeThicknessSettings({ value, onChange }: EdgeThicknessSettingsProps): ReactElement {
  const thresholdSteps = value.thresholds?.steps ?? [];

  return (
    <>
      <TextField
        label="Default stroke width"
        size="small"
        type="number"
        inputProps={{ min: 1, step: 1 }}
        InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
        value={value.edgeDefaultStrokeWidth ?? ''}
        onChange={(event) => {
          const parsed = parseFloat(event.target.value);
          onChange({
            ...value,
            edgeDefaultStrokeWidth: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
          });
        }}
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
                onChange={(event) => {
                  const parsed = parseFloat(event.target.value);
                  const width = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
                  onChange(
                    produce(value, (draft) => {
                      draft.edgeThresholdWidths ??= [];
                      while (draft.edgeThresholdWidths.length <= i) {
                        draft.edgeThresholdWidths.push({
                          value: thresholdSteps[draft.edgeThresholdWidths.length]?.value ?? 0,
                          strokeWidth: 2,
                        });
                      }
                      if (width !== undefined) {
                        draft.edgeThresholdWidths[i] = {
                          value: thresholdSteps[i]?.value ?? 0,
                          strokeWidth: width,
                        };
                      } else {
                        draft.edgeThresholdWidths.splice(i, 1);
                      }
                    })
                  );
                }}
                sx={{ width: 100 }}
              />
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}
