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

import React, { ReactElement } from 'react';
import { midpoint, shortenLine } from '../../utils/edgeUtils';

// Arrow geometry in stroke-width units (markerUnits="strokeWidth").
// The marker scales with both stroke width and zoom automatically.
const ARROW_SW_W = 2.5; // arrowhead length in stroke-width units
const ARROW_SW_H = 1.75; // arrowhead height in stroke-width units

// How many stroke-width units to shorten the line so the tip sits flush.
export const ARROW_SHORTEN_PX = ARROW_SW_W;

type Line = { x1: number; y1: number; x2: number; y2: number };

interface EdgeGeometry {
  fwd: Line;
  bwd: Line | null;
}

function computeEdgeGeometry(
  pts: Line,
  bidirectional: boolean,
  k: number,
  strokeWidth: number,
  bwdStrokeWidth: number
): EdgeGeometry {
  // strokeWidth is in canvas units (screen px / k); multiply by stroke-width
  // units to get the canvas-unit shorten amount.
  const fwdShorten = ARROW_SHORTEN_PX * strokeWidth;
  const bwdShorten = ARROW_SHORTEN_PX * bwdStrokeWidth;

  if (!bidirectional) {
    return { fwd: shortenLine(pts, fwdShorten), bwd: null };
  }

  const mid = midpoint(pts);

  const fwdHalf = { x1: pts.x1, y1: pts.y1, x2: mid.x, y2: mid.y };
  const bwdHalfRaw = { x1: pts.x2, y1: pts.y2, x2: mid.x, y2: mid.y };

  return {
    fwd: shortenLine(fwdHalf, fwdShorten),
    bwd: shortenLine(bwdHalfRaw, bwdShorten),
  };
}

export interface LineStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  fillOpacity?: number;
}

export function markerId(nsPrefix: string): string {
  return `${nsPrefix}-arrow`;
}

interface EdgeArrowMarkerProps {
  nsPrefix: string;
  fillOpacity?: number;
}

// markerUnits="strokeWidth": dimensions scale with stroke width automatically,
// which also handles zoom since stroke width is pre-divided by k.
export function EdgeArrowMarker({ nsPrefix, fillOpacity = 0.8 }: EdgeArrowMarkerProps): ReactElement {
  return (
    <marker
      id={markerId(nsPrefix)}
      markerWidth={ARROW_SW_W}
      markerHeight={ARROW_SW_H}
      refY={ARROW_SW_H / 2}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path
        d={`M0,0 L0,${ARROW_SW_H} L${ARROW_SW_W},${ARROW_SW_H / 2} z`}
        fill="currentColor"
        fillOpacity={fillOpacity}
      />
    </marker>
  );
}

interface EdgeLinesProps {
  pts: Line;
  bidirectional: boolean;
  nsPrefix: string;
  k: number;
  fwdStyle: LineStyle;
  bwdStyle?: LineStyle;
  lineProps?: React.SVGProps<SVGLineElement>;
}

export function EdgeLines({
  pts,
  bidirectional,
  nsPrefix,
  k,
  fwdStyle,
  bwdStyle,
  lineProps,
}: EdgeLinesProps): ReactElement {
  const resolvedBwdStyle = bwdStyle ?? fwdStyle;
  const { fwd, bwd } = computeEdgeGeometry(pts, bidirectional, k, fwdStyle.strokeWidth, resolvedBwdStyle.strokeWidth);

  const arrowUrl = `url(#${markerId(nsPrefix)})`;

  return (
    <>
      <defs>
        <EdgeArrowMarker nsPrefix={nsPrefix} fillOpacity={fwdStyle.fillOpacity} />
      </defs>
      <line
        x1={fwd.x1}
        y1={fwd.y1}
        x2={fwd.x2}
        y2={fwd.y2}
        stroke={fwdStyle.stroke}
        strokeWidth={fwdStyle.strokeWidth}
        strokeOpacity={fwdStyle.strokeOpacity}
        markerEnd={arrowUrl}
        {...lineProps}
      />
      {bwd && (
        <line
          x1={bwd.x1}
          y1={bwd.y1}
          x2={bwd.x2}
          y2={bwd.y2}
          stroke={resolvedBwdStyle.stroke}
          strokeWidth={resolvedBwdStyle.strokeWidth}
          strokeOpacity={resolvedBwdStyle.strokeOpacity}
          markerEnd={arrowUrl}
          {...lineProps}
        />
      )}
    </>
  );
}

export function edgeLabelPoints(
  pts: Line,
  bidirectional: boolean,
  k: number,
  fwdStrokeWidth: number,
  bwdStrokeWidth: number
): { fwd: { x: number; y: number }; bwd: { x: number; y: number } | null } {
  const { fwd, bwd } = computeEdgeGeometry(pts, bidirectional, k, fwdStrokeWidth, bwdStrokeWidth);
  return { fwd: midpoint(fwd), bwd: bwd ? midpoint(bwd) : null };
}
