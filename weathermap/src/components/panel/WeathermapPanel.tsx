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
import { edgeEndpoints, midpoint, offsetLine, shortenLine } from '../../utils/edgeUtils';
import { NodeRenderer } from '../node/NodeRenderer';
import { EdgeLabel } from '../node/EdgeLabel';

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
          const arrowPx = ARROW_SHORTEN / transform.k;
          const lineOffset = 4 / transform.k;
          const strokeWidth = 2 / transform.k;
          const markerUrl = `url(#${MARKER_ID})`;

          function resolveLabel(queryIndex: number | undefined, template: string | undefined): string | null {
            if (queryIndex === undefined) return null;
            const series = seriesByQueryIndex.get(queryIndex);
            if (!series) return null;
            const tmpl = template ?? '{{value}}';
            return interpolateLabel(tmpl, series);
          }

          if (edge.bidirectional) {
            const fwdLine = offsetLine(pts, lineOffset);
            const bwdLine = offsetLine(pts, -lineOffset);
            const fwdShortened = shortenLine(fwdLine, arrowPx);
            // Backward arrow points from x2→x1, so shorten from x1 end
            const bwdShortened = shortenLine(
              { x1: bwdLine.x2, y1: bwdLine.y2, x2: bwdLine.x1, y2: bwdLine.y1 },
              arrowPx
            );
            const fwdLabel = resolveLabel(edge.sourceQueryIndex, edge.sourceLabelTemplate);
            const bwdLabel = resolveLabel(edge.targetQueryIndex, edge.targetLabelTemplate);
            const fwdMid = midpoint(fwdLine);
            const bwdMid = midpoint(bwdLine);
            return (
              <g key={i}>
                <line
                  x1={fwdShortened.x1}
                  y1={fwdShortened.y1}
                  x2={fwdShortened.x2}
                  y2={fwdShortened.y2}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.8}
                  markerEnd={markerUrl}
                />
                <line
                  x1={bwdShortened.x1}
                  y1={bwdShortened.y1}
                  x2={bwdShortened.x2}
                  y2={bwdShortened.y2}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.8}
                  markerEnd={markerUrl}
                />
                {fwdLabel && <EdgeLabel x={fwdMid.x} y={fwdMid.y} text={fwdLabel} k={transform.k} />}
                {bwdLabel && <EdgeLabel x={bwdMid.x} y={bwdMid.y} text={bwdLabel} k={transform.k} />}
              </g>
            );
          }

          const shortened = shortenLine(pts, arrowPx);
          const label = resolveLabel(edge.sourceQueryIndex, edge.sourceLabelTemplate);
          const mid = midpoint(pts);
          return (
            <g key={i}>
              <line
                x1={shortened.x1}
                y1={shortened.y1}
                x2={shortened.x2}
                y2={shortened.y2}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeOpacity={0.8}
                markerEnd={markerUrl}
              />
              {label && <EdgeLabel x={mid.x} y={mid.y} text={label} k={transform.k} />}
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
