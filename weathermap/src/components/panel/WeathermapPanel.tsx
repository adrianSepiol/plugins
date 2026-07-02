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

import React, { ReactElement, useCallback, useMemo } from 'react';
import { ThresholdOptions, TimeSeries } from '@perses-dev/core';
import { FormatOptions, formatValue, useChartsTheme } from '@perses-dev/components';
import { replaceVariablesInString, useAllVariableValues } from '@perses-dev/plugin-system';
import { WeathermapOptions, WeathermapProps } from '../../types/weathermap-types';
import { edgeEndpoints, strokeWidthFromThresholds } from '../../utils/edgeUtils';
import { nodeBBox } from '../../utils/resizeUtils';
import { useZoom } from '../../hooks/useZoom';
import { NodeRenderer } from '../node/NodeRenderer';
import { EdgeLabel } from '../node/EdgeLabel';
import { EdgeLines, edgeLabelPoints, LineStyle } from '../node/EdgeLines';
import { ThresholdLegend } from './ThresholdLegend';

const NS_PREFIX = 'wm-arrow-panel';

function interpolateLabel(template: string, series: TimeSeries, format: FormatOptions | undefined): string {
  const lastValue = series.values.length > 0 ? series.values[series.values.length - 1]?.[1] : null;
  const labels: Record<string, string> = { ...series.labels };
  if (lastValue !== null && lastValue !== undefined) {
    labels['value'] = formatValue(lastValue, format);
  }
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_match, key: string) => labels[key.trim()] ?? '');
}

function colorFromThresholds(value: number, thresholds: ThresholdOptions, paletteColors: string[]): string {
  const defaultColor = thresholds.defaultColor ?? paletteColors[0] ?? '#1976d2';
  if (!thresholds.steps?.length) return defaultColor;
  let result = defaultColor;
  for (let i = 0; i < thresholds.steps.length; i++) {
    const step = thresholds.steps[i];
    if (step && value >= step.value) {
      result = step.color ?? paletteColors[i] ?? defaultColor;
    }
  }
  return result;
}

function resolveEdgeStyle(
  queryIndex: number | undefined,
  thicknessMode: 'fixed' | 'threshold' | undefined,
  edgeStrokeWidth: number | undefined,
  seriesByQueryIndex: Map<number, TimeSeries>,
  spec: WeathermapOptions,
  paletteColors: string[]
): { stroke: string; strokeWidth: number } {
  const defaultWidth = edgeStrokeWidth ?? spec.edgeDefaultStrokeWidth ?? 2;
  if (queryIndex === undefined) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }
  const series = seriesByQueryIndex.get(queryIndex);
  if (!series) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }
  const lastTuple = series.values[series.values.length - 1];
  const lastValue = lastTuple?.[1];
  if (lastValue === null || lastValue === undefined) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }

  const stroke = spec.thresholds ? colorFromThresholds(lastValue, spec.thresholds, paletteColors) : 'currentColor';
  const strokeWidth =
    thicknessMode === 'threshold' && spec.edgeThresholdWidths?.length
      ? strokeWidthFromThresholds(lastValue, spec.edgeThresholdWidths, defaultWidth)
      : defaultWidth;
  return { stroke, strokeWidth };
}

export function WeathermapPanel(props: WeathermapProps): ReactElement | null {
  const { contentDimensions, spec, queryResults } = props;
  const chartsTheme = useChartsTheme();

  const nodes = spec.nodes ?? [];
  const edges = spec.edges ?? [];

  const seriesByQueryIndex = useMemo(() => {
    const map = new Map<number, TimeSeries>();
    queryResults.forEach((result, i) => {
      const first = result.data.series[0];
      if (first) map.set(i, first);
    });
    return map;
  }, [queryResults]);

  const { applyZoomBehaviour, transform, fitView } = useZoom();
  const variableValues = useAllVariableValues();

  const handleNodeClick = useCallback(
    (link: string) => {
      window.open(replaceVariablesInString(link, variableValues), '_blank', 'noopener,noreferrer');
    },
    [variableValues]
  );

  const width = contentDimensions?.width ?? 600;
  const height = contentDimensions?.height ?? 400;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const paletteColors = chartsTheme.thresholds.palette;

  const handleDoubleClick = useCallback(() => {
    const bbox = nodeBBox(nodes);
    if (bbox) {
      fitView(bbox, width, height);
    }
  }, [fitView, nodes, width, height]);

  const showLegend = spec.legend !== undefined && spec.thresholds !== undefined;
  const legendPosition = spec.legend?.position ?? 'bottom';
  const LEGEND_MARGIN = 8;
  const legendX = legendPosition === 'right' ? width - 118 - LEGEND_MARGIN : LEGEND_MARGIN;
  const legendY =
    legendPosition === 'right' ? LEGEND_MARGIN : height - ((spec.thresholds?.steps?.length ?? 0) + 1) * 18 - 24;

  return (
    <svg
      ref={applyZoomBehaviour}
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'grab' }}
      onDoubleClick={handleDoubleClick}
    >
      {spec.backgroundImage && (
        <image
          href={spec.backgroundImage}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio={spec.backgroundImageFit === 'stretch' ? 'none' : 'xMidYMid meet'}
        />
      )}
      <g transform={transform.toString()}>
        {edges.map((edge, i) => {
          const pts = edgeEndpoints(edge, nodeById);
          if (!pts) return null;

          function resolveLabel(queryIndex: number | undefined, template: string | undefined): string | null {
            if (queryIndex === undefined) return null;
            const series = seriesByQueryIndex.get(queryIndex);
            if (!series) return null;
            const tmpl = template ?? '{{value}}';
            return interpolateLabel(tmpl, series, spec.format);
          }

          const fwdStyle = resolveEdgeStyle(
            edge.sourceQueryIndex,
            edge.thicknessMode,
            edge.strokeWidth,
            seriesByQueryIndex,
            spec,
            paletteColors
          );
          const bwdStyle = resolveEdgeStyle(
            edge.targetQueryIndex,
            edge.thicknessMode,
            edge.strokeWidth,
            seriesByQueryIndex,
            spec,
            paletteColors
          );
          const scaledFwdStyle: LineStyle = {
            stroke: fwdStyle.stroke,
            strokeWidth: fwdStyle.strokeWidth / transform.k,
            strokeOpacity: 0.8,
          };
          const scaledBwdStyle: LineStyle = {
            stroke: bwdStyle.stroke,
            strokeWidth: bwdStyle.strokeWidth / transform.k,
            strokeOpacity: 0.8,
          };

          const labelPts = edgeLabelPoints(
            pts,
            edge.bidirectional ?? false,
            transform.k,
            scaledFwdStyle.strokeWidth,
            scaledBwdStyle.strokeWidth
          );
          const fwdLabel = resolveLabel(edge.sourceQueryIndex, edge.sourceLabelTemplate);
          const bwdLabel = edge.bidirectional ? resolveLabel(edge.targetQueryIndex, edge.targetLabelTemplate) : null;

          return (
            <g key={i}>
              <EdgeLines
                pts={pts}
                bidirectional={edge.bidirectional ?? false}
                nsPrefix={NS_PREFIX}
                k={transform.k}
                fwdStyle={scaledFwdStyle}
                bwdStyle={scaledBwdStyle}
                lineProps={{ style: { pointerEvents: 'none' } }}
              />
              {fwdLabel && <EdgeLabel x={labelPts.fwd.x} y={labelPts.fwd.y} text={fwdLabel} k={transform.k} />}
              {bwdLabel && labelPts.bwd && (
                <EdgeLabel x={labelPts.bwd.x} y={labelPts.bwd.y} text={bwdLabel} k={transform.k} />
              )}
            </g>
          );
        })}

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
                  fillOverride = colorFromThresholds(lastValue, spec.thresholds, chartsTheme.thresholds.palette);
                }
              }
            }
          }

          return (
            <NodeRenderer
              key={node.id}
              node={node}
              groupProps={
                node.link ? { onClick: () => handleNodeClick(node.link!), style: { cursor: 'pointer' } } : undefined
              }
              rectProps={{ strokeWidth: 2 / transform.k }}
              labelOverride={labelOverride}
              fillOverride={fillOverride}
            />
          );
        })}
      </g>

      {showLegend && (
        <ThresholdLegend
          thresholds={spec.thresholds!}
          format={spec.format}
          paletteColors={paletteColors}
          x={legendX}
          y={legendY}
        />
      )}
    </svg>
  );
}
