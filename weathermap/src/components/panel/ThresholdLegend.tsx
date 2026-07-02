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
import { ThresholdOptions } from '@perses-dev/core';
import { FormatOptions, formatValue } from '@perses-dev/components';

const SWATCH_SIZE = 12;
const ROW_HEIGHT = 18;
const LABEL_OFFSET = SWATCH_SIZE + 6;
const PADDING = 8;
const FONT_SIZE = 11;

interface ThresholdLegendProps {
  thresholds: ThresholdOptions;
  format: FormatOptions | undefined;
  paletteColors: string[];
  /** Pixel position of the legend box top-left corner */
  x: number;
  y: number;
}

export function ThresholdLegend({ thresholds, format, paletteColors, x, y }: ThresholdLegendProps): ReactElement {
  const defaultColor = thresholds.defaultColor ?? paletteColors[0] ?? '#4caf50';
  const steps = thresholds.steps ?? [];

  // Build rows bottom-to-top: default (no lower bound), then each step ascending.
  // Display them top-to-bottom so highest value is first (most alarming at top).
  const rows: Array<{ color: string; label: string }> = [
    ...steps.map((step, i) => ({
      color: step.color ?? paletteColors[i] ?? defaultColor,
      label: `≥ ${formatValue(step.value, format)}`,
    })),
    { color: defaultColor, label: 'default' },
  ].reverse();

  const boxWidth = 110;
  const boxHeight = rows.length * ROW_HEIGHT + PADDING * 2;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={boxWidth}
        height={boxHeight}
        fill="var(--mui-palette-background-paper, #1e1e1e)"
        fillOpacity={0.9}
        stroke="var(--mui-palette-divider, #444)"
        strokeWidth={1}
        rx={4}
      />
      {rows.map((row, i) => {
        const ry = y + PADDING + i * ROW_HEIGHT + (ROW_HEIGHT - SWATCH_SIZE) / 2;
        return (
          <g key={i}>
            <rect x={x + PADDING} y={ry} width={SWATCH_SIZE} height={SWATCH_SIZE} fill={row.color} rx={2} />
            <text
              x={x + PADDING + LABEL_OFFSET}
              y={ry + SWATCH_SIZE - 2}
              fontSize={FONT_SIZE}
              fill="var(--mui-palette-text-primary, #e0e0e0)"
              style={{ userSelect: 'none' }}
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
