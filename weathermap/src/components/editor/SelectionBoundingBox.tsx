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

import { PointerEvent, ReactElement } from 'react';
import { BoundingBox, ResizeHandleId } from '../../utils/editorReducer';
import { HANDLE_POSITIONS, handlePosition, RESIZE_CURSORS } from '../../utils/resizeUtils';
import { editorStyles } from '../../utils/editorStyles';
import { useWeathermapTheme } from '../../hooks/useWeathermapTheme';
import { useZoomContext } from '../../contexts/ZoomContext';

interface SelectionBoundingBoxProps {
  bbox: BoundingBox;
  isResizing: boolean;
  onResizeHandlePointerDown: (event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId) => void;
}

export function SelectionBoundingBox({
  bbox,
  isResizing,
  onResizeHandlePointerDown,
}: SelectionBoundingBoxProps): ReactElement {
  const theme = editorStyles(useWeathermapTheme(), useZoomContext().transform.k);
  const pad = theme.selectionBBoxPad;
  const bx = bbox.minX - pad;
  const by = bbox.minY - pad;
  const bw = bbox.maxX - bbox.minX + pad * 2;
  const bh = bbox.maxY - bbox.minY + pad * 2;
  const paddedBBox: BoundingBox = { minX: bx, minY: by, maxX: bx + bw, maxY: by + bh };
  const handleIds: ResizeHandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <g style={{ pointerEvents: isResizing ? 'none' : 'all' }}>
      <rect x={bx} y={by} width={bw} height={bh} {...theme.selectionBBox} style={{ pointerEvents: 'none' }} />
      {handleIds.map((h) => {
        const pos = handlePosition(paddedBBox, h);
        return (
          <circle
            key={h}
            cx={pos.x}
            cy={pos.y}
            {...theme.resizeHandle}
            style={{ cursor: RESIZE_CURSORS[h] }}
            onPointerDown={(event) => onResizeHandlePointerDown(event, h)}
          />
        );
      })}
    </g>
  );
}

export { HANDLE_POSITIONS };
