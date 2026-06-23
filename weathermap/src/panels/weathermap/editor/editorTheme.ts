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

export interface EditorTheme {
  edgeHit: { strokeWidth: number };
  edge: { stroke: string; strokeWidth: number; strokeOpacity: number };
  edgeSelected: { stroke: string; strokeWidth: number; strokeOpacity: number };
  edgeHandle: { r: number; fill: string; stroke: string; strokeWidth: number };
  selectionBBox: { fill: string; stroke: string; strokeWidth: number; strokeDasharray: string };
  resizeHandle: { r: number; fill: string; stroke: string; strokeWidth: number };
  dragEdge: { stroke: string; strokeWidth: number; strokeDasharray: string };
  selectionRect: { fill: string; stroke: string; strokeWidth: number; strokeDasharray: string };
  nodeDefault: { stroke: string; strokeWidth: number };
  nodeSnap: { stroke: string; strokeWidth: number };
  selectionBBoxPad: number;
  arrowOpacity: number;
}

export function getEditorTheme(k: number): EditorTheme {
  return {
    edgeHit: {
      strokeWidth: 12 / k,
    },
    edge: {
      stroke: 'currentColor',
      strokeWidth: 2 / k,
      strokeOpacity: 0.8,
    },
    edgeSelected: {
      stroke: '#ff9800',
      strokeWidth: 3 / k,
      strokeOpacity: 0.8,
    },
    edgeHandle: {
      r: 6 / k,
      fill: '#ff9800',
      stroke: 'white',
      strokeWidth: 1.5 / k,
    },
    selectionBBox: {
      fill: 'none',
      stroke: '#ff9800',
      strokeWidth: 1.5 / k,
      strokeDasharray: `${5 / k},${3 / k}`,
    },
    resizeHandle: {
      r: 5 / k,
      fill: 'white',
      stroke: '#ff9800',
      strokeWidth: 1.5 / k,
    },
    dragEdge: {
      stroke: '#2196f3',
      strokeWidth: 2 / k,
      strokeDasharray: `${6 / k},${4 / k}`,
    },
    selectionRect: {
      fill: 'rgba(33,150,243,0.1)',
      stroke: '#2196f3',
      strokeWidth: 1 / k,
      strokeDasharray: `${4 / k},${3 / k}`,
    },
    nodeDefault: { stroke: 'white', strokeWidth: 2 },
    nodeSnap: { stroke: '#4caf50', strokeWidth: 3 },
    selectionBBoxPad: 6 / k,
    arrowOpacity: 0.8,
  };
}
