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

import { createContext, MutableRefObject, useContext } from 'react';
import { EdgeSpec, NodeSpec, WeathermapSpec } from '../model';

export interface SpecContextValue {
  value: WeathermapSpec;
  onChange: (v: WeathermapSpec) => void;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  nodeById: Map<string, NodeSpec>;
  edgeById: Map<string, EdgeSpec>;
  viewCenterRef: MutableRefObject<() => { x: number; y: number }>;
  addNode: () => void;
  deleteSelected: () => void;
  onNodePropertiesChange: (updated: NodeSpec) => void;
  onEdgePropertiesChange: (updated: EdgeSpec) => void;
}

export const SpecContext = createContext<SpecContextValue | null>(null);

export function useSpecContext(): SpecContextValue {
  const ctx = useContext(SpecContext);
  if (!ctx) {
    throw new Error('useSpecContext must be used inside WeathermapEditor');
  }
  return ctx;
}
