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
import { DragEdge } from '../../utils/editorReducer';
import { shortenLine } from '../../utils/edgeUtils';
import { editorStyles } from '../../utils/editorStyles';
import { useWeathermapTheme } from '../../hooks/useWeathermapTheme';
import { useZoomContext } from '../../contexts/ZoomContext';
import { ARROW_SHORTEN_PX, EdgeArrowMarker, markerId } from '../shared/EdgeLines';

interface DragEdgeLineProps {
  dragEdge: DragEdge;
  k: number;
  nsPrefix: string;
}

export function DragEdgeLine({ dragEdge, k, nsPrefix }: DragEdgeLineProps): ReactElement {
  const theme = editorStyles(useWeathermapTheme(), useZoomContext().transform.k);
  const strokeWidth = theme.dragEdge.strokeWidth as number;
  const arrowShorten = dragEdge.snapTargetId ? ARROW_SHORTEN_PX * strokeWidth : 0;
  const shortened = shortenLine(
    { x1: dragEdge.x1, y1: dragEdge.y1, x2: dragEdge.x2, y2: dragEdge.y2 },
    arrowShorten
  );
  return (
    <>
      <defs>
        <EdgeArrowMarker nsPrefix={nsPrefix} fillOpacity={theme.arrowOpacity} />
      </defs>
      <line
        x1={shortened.x1}
        y1={shortened.y1}
        x2={shortened.x2}
        y2={shortened.y2}
        {...theme.dragEdge}
        markerEnd={`url(#${markerId(nsPrefix)})`}
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
