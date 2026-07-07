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

import { ReactElement, useCallback } from 'react';
import { ThresholdOptions, TimeSeries } from '@perses-dev/core';
import { FormatOptions, formatValue } from '@perses-dev/components';
import { replaceVariablesInString, useAllVariableValues } from '@perses-dev/plugin-system';
import { useWeathermapTheme } from '../../hooks/useWeathermapTheme';
import { WeathermapSpec } from '../../model';
import { NodeRenderer } from '../shared/NodeRenderer';

function interpolateLabel(template: string, series: TimeSeries, format: FormatOptions | undefined): string {
  const lastValue = series.values.length > 0 ? series.values[series.values.length - 1]?.[1] : null;
  const labels: Record<string, string> = { ...series.labels };
  if (lastValue !== null && lastValue !== undefined) {
    labels['value'] = formatValue(lastValue, format);
  }
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_match, key: string) => labels[key.trim()] ?? '');
}

function colorFromThresholds(thresholdValue: number, thresholds: ThresholdOptions, paletteColors: string[], fallbackColor: string): string {
  const defaultColor = thresholds.defaultColor ?? paletteColors[0] ?? fallbackColor;
  if (!thresholds.steps?.length) {
    return defaultColor;
  }
  let result = defaultColor;
  for (let i = 0; i < thresholds.steps.length; i++) {
    const step = thresholds.steps[i];
    if (step && thresholdValue >= step.value) {
      result = step.color ?? paletteColors[i] ?? defaultColor;
    }
  }
  return result;
}

interface PanelNodeLayerProps {
  spec: WeathermapSpec;
  seriesByQueryIndex: Map<number, TimeSeries>;
  k: number;
  paletteColors: string[];
}

export function PanelNodeLayer({ spec, seriesByQueryIndex, k, paletteColors }: PanelNodeLayerProps): ReactElement {
  const nodes = spec.nodes ?? [];
  const variableValues = useAllVariableValues();
  const { connection: fallbackColor } = useWeathermapTheme();

  const handleNodeClick = useCallback(
    (link: string) => {
      window.open(replaceVariablesInString(link, variableValues), '_blank', 'noopener,noreferrer');
    },
    [variableValues]
  );

  return (
    <>
      {nodes.map((node) => {
        let labelOverride: string | undefined;
        let fillOverride: string | undefined;

        if (node.queryIndex !== undefined) {
          const series = seriesByQueryIndex.get(node.queryIndex);
          if (series) {
            if (node.label) {
              labelOverride = interpolateLabel(node.label, series, spec.format);
            }
            if (node.colorMode === 'fixed' && node.color) {
              fillOverride = node.color;
            } else if (node.colorMode === 'threshold' && spec.thresholds) {
              const lastTuple = series.values[series.values.length - 1];
              const lastValue = lastTuple?.[1];
              if (lastValue !== null && lastValue !== undefined) {
                fillOverride = colorFromThresholds(lastValue, spec.thresholds, paletteColors, fallbackColor);
              }
            }
          }
        }

        return (
          <NodeRenderer
            key={node.id}
            node={node}
            groupProps={node.link ? { onClick: () => handleNodeClick(node.link!), style: { cursor: 'pointer' } } : undefined}
            rectProps={{ strokeWidth: 2 / k }}
            labelOverride={labelOverride}
            fillOverride={fillOverride}
          />
        );
      })}
    </>
  );
}
