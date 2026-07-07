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

import { TimeSeriesData, ThresholdOptions } from '@perses-dev/core';
import { FormatOptions } from '@perses-dev/components';
import { PanelProps, LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';

export type QueryData = TimeSeriesData;

export type WeathermapProps = PanelProps<WeathermapSpec, QueryData>;

export interface QueryColorSettings {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export type LabelPosition = 'above' | 'below' | 'left' | 'right' | 'center';

export interface NodeSpec {
  id: string;
  x: number;
  y: number;
  size: number;
  kind: 'rectangle' | 'icon' | 'text';
  label?: string;
  labelPosition?: LabelPosition;
  labelPadding?: number;
  icon?: string;
  link?: string;
  queryIndex?: number;
  colorMode?: 'threshold' | 'fixed';
  color?: string;
}

export type AnchorPoint = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface EdgeSpec {
  id: string;
  source: string;
  target: string;
  sourceAnchor?: AnchorPoint;
  targetAnchor?: AnchorPoint;
  x2?: number;
  y2?: number;
  bidirectional?: boolean;
  thicknessMode?: 'fixed' | 'threshold';
  strokeWidth?: number;
  sourceQueryIndex?: number;
  targetQueryIndex?: number;
  sourceLabelTemplate?: string;
  targetLabelTemplate?: string;
}

export interface EdgeThresholdStep {
  value: number;
  strokeWidth: number;
}

export interface WeathermapSpec {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  format?: FormatOptions;
  backgroundImage?: string;
  backgroundImageFit?: 'contain' | 'stretch';
  edgeThresholdWidths?: EdgeThresholdStep[];
  edgeDefaultStrokeWidth?: number;
  querySettings?: QueryColorSettings;
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
}

export type WeathermapSpecEditorProps = OptionsEditorProps<WeathermapSpec>;
