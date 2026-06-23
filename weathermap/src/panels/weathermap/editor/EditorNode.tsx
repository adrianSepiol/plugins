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
import { NodeSpec, AnchorPoint } from '../weathermap-types';
import { EditorTheme } from './editorTheme';
import { WeathermapNode } from '../node/WeathermapNode';
import { ConnectionHandles } from '../shared/ConnectionHandles';

interface EditorNodeProps {
  node: NodeSpec;
  isHovered: boolean;
  isSelected: boolean;
  snapTarget: boolean;
  isDragging: boolean;
  k: number;
  theme: EditorTheme;
  onPointerDown: (event: PointerEvent<SVGRectElement>) => void;
  onPointerMove: (event: PointerEvent<SVGRectElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCrossDragStart: (anchor: AnchorPoint, x: number, y: number) => void;
}

export function EditorNode({
  node,
  isHovered,
  isSelected,
  snapTarget,
  isDragging,
  k,
  theme,
  onPointerDown,
  onPointerMove,
  onMouseEnter,
  onMouseLeave,
  onCrossDragStart,
}: EditorNodeProps): ReactElement {
  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <WeathermapNode
        node={node}
        rectProps={{
          style: { cursor: 'move' },
          ...(snapTarget ? theme.nodeSnap : theme.nodeDefault),
          onPointerDown,
          onPointerMove,
        }}
      />
      {isHovered && !isSelected && !isDragging && (
        <ConnectionHandles node={node} k={k} onDragStart={onCrossDragStart} />
      )}
    </g>
  );
}
