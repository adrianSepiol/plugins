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

import { ReactElement, useCallback, useMemo } from 'react';
import { TimeSeries } from '@perses-dev/core';
import { useChartsTheme } from '@perses-dev/components';
import { WeathermapProps } from '../../model';
import { nodeBBox } from '../../utils/resizeUtils';
import { useZoom } from '../../hooks/useZoom';
import { useZoomContext, ZoomProvider } from '../../contexts/ZoomContext';
import { ThresholdLegend } from './ThresholdLegend';
import { PanelEdgeLayer } from './PanelEdgeLayer';
import { PanelNodeLayer } from './PanelNodeLayer';

interface PanelSvgProps {
  svgRef: (node: SVGSVGElement | null) => void;
  props: WeathermapProps;
  seriesByQueryIndex: Map<number, TimeSeries>;
  paletteColors: string[];
}

function PanelSvg({ svgRef, props, seriesByQueryIndex, paletteColors }: PanelSvgProps): ReactElement {
  const { contentDimensions, spec } = props;
  const { transform, fitView } = useZoomContext();

  const nodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);

  const width = contentDimensions?.width ?? 600;
  const height = contentDimensions?.height ?? 400;

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
      ref={svgRef}
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
        <PanelEdgeLayer
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
        />
        <PanelNodeLayer
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
        />
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

export function WeathermapPanel(props: WeathermapProps): ReactElement | null {
  const { queryResults } = props;
  const chartsTheme = useChartsTheme();
  const paletteColors = chartsTheme.thresholds.palette;

  const seriesByQueryIndex = useMemo(() => {
    const map = new Map<number, TimeSeries>();
    queryResults.forEach((result, i) => {
      const first = result.data.series[0];
      if (first) {
        map.set(i, first);
      }
    });
    return map;
  }, [queryResults]);

  const { svgRef, toCanvasPoint, transform, fitView } = useZoom();

  return (
    <ZoomProvider value={{ toCanvasPoint, transform, fitView }}>
      <PanelSvg svgRef={svgRef} props={props} seriesByQueryIndex={seriesByQueryIndex} paletteColors={paletteColors} />
    </ZoomProvider>
  );
}
