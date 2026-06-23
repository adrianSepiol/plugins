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

import { ReactElement, useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { TimeSeries, ThresholdOptions } from '@perses-dev/core';
import { useChartsTheme } from '@perses-dev/components';
import { select } from 'd3-selection';
import { zoom, ZoomTransform, zoomIdentity } from 'd3-zoom';
import { WeathermapProps } from '../../types/weathermap-types';
import { edgeEndpoints, shortenLine } from '../../utils/edgeUtils';
import { NodeRenderer } from '../node/NodeRenderer';

const MARKER_ID = 'wm-arrow-panel';
const ARROW_SHORTEN = 6;

function interpolateLabel(template: string, series: TimeSeries): string {
  const lastValue = series.values.length > 0 ? series.values[series.values.length - 1]?.[1] : null;
  const labels: Record<string, string> = { ...series.labels };
  if (lastValue !== null && lastValue !== undefined) {
    labels['value'] = String(lastValue);
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

  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const width = contentDimensions?.width ?? 600;
  const height = contentDimensions?.height ?? 400;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const zoomBehavior = useMemo(() => zoom<SVGSVGElement, unknown>(), []);
  const updateTransform = useCallback(({ transform: t }: { transform: ZoomTransform }) => setTransform(t), []);

  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    zoomBehavior.on('zoom', updateTransform);
    zoomBehavior.filter((event: Event) => {
      return event.type !== 'dblclick';
    });
    select<SVGSVGElement, unknown>(canvasRef.current).call(zoomBehavior);
  }, [zoomBehavior, canvasRef, updateTransform]);

  const resetPan = useCallback(() => {
    if (!canvasRef.current) {
      return;
    }
    select<SVGSVGElement, unknown>(canvasRef.current).call(zoomBehavior.transform, zoomIdentity);
  }, [zoomBehavior]);

  return (
    <svg
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'grab' }}
      onDoubleClick={resetPan}
    >
      <defs>
        <marker id={MARKER_ID} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="currentColor" fillOpacity={0.8} />
        </marker>
      </defs>

      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {edges.map((edge, i) => {
          const pts = edgeEndpoints(edge, nodeById);
          if (!pts) return null;
          const shortened = shortenLine(pts, ARROW_SHORTEN / transform.k);
          return (
            <line
              key={i}
              x1={shortened.x1}
              y1={shortened.y1}
              x2={shortened.x2}
              y2={shortened.y2}
              stroke="currentColor"
              strokeWidth={2 / transform.k}
              strokeOpacity={0.8}
              markerEnd={`url(#${MARKER_ID})`}
            />
          );
        })}

        {nodes.map((node) => {
          let labelOverride: string | undefined;
          let fillOverride: string | undefined;

          if (node.queryIndex !== undefined) {
            const series = seriesByQueryIndex.get(node.queryIndex);
            if (series) {
              if (node.label) {
                labelOverride = interpolateLabel(node.label, series);
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
              rectProps={{ strokeWidth: 2 / transform.k }}
              labelOverride={labelOverride}
              fillOverride={fillOverride}
            />
          );
        })}
      </g>
    </svg>
  );
}
