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
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { WeathermapSpec } from '../../model';

interface BackgroundSettingsProps {
  value: WeathermapSpec;
  onChange: (value: WeathermapSpec) => void;
}

export function BackgroundSettings({ value, onChange }: BackgroundSettingsProps): ReactElement {
  return (
    <>
      <TextField
        label="Image URL"
        size="small"
        fullWidth
        value={value.backgroundImage ?? ''}
        onChange={(event) => onChange({ ...value, backgroundImage: event.target.value || undefined })}
        placeholder="https://example.com/network-map.png"
        sx={{ mb: 1 }}
      />
      {value.backgroundImage && (
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Fit</InputLabel>
          <Select
            label="Fit"
            value={value.backgroundImageFit ?? 'contain'}
            onChange={(event) =>
              onChange({ ...value, backgroundImageFit: event.target.value as 'contain' | 'stretch' })
            }
          >
            <MenuItem value="contain">Contain</MenuItem>
            <MenuItem value="stretch">Stretch to panel</MenuItem>
          </Select>
        </FormControl>
      )}
    </>
  );
}
