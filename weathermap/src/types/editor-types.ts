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

import { AnchorPoint } from './weathermap-types';

export interface SelectionRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface MultiResizeDrag {
  handleId: ResizeHandleId;
  fixedX: number;
  fixedY: number;
  origBBox: BoundingBox;
  origNodes: Array<{ id: string; x: number; y: number; size: number }>;
  origEdges: Array<{ id: string; x2: number; y2: number }>;
}

export interface DragEdge {
  sourceId: string;
  sourceAnchor: AnchorPoint;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  snapTargetId?: string;
  snapTargetAnchor?: AnchorPoint;
  editingEdgeId?: string;
  editingEnd?: 'source' | 'target';
}
