import { TimeSeriesData, ThresholdOptions } from '@perses-dev/core';
import { FormatOptions } from '@perses-dev/components';
import { PanelProps, LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';

export type QueryData = TimeSeriesData; // Type of data returned by a query plugin and supported by this plugin

export type WeathermapProps = PanelProps<WeathermapOptions, QueryData>;

export interface QuerySettingsOptions {
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
  link?: string; // URL template for drill-down navigation; supports ${varName} syntax
  queryIndex?: number; // index into queryResults; enables {{label}} interpolation in label
  colorMode?: 'threshold' | 'fixed'; // how to color the node; requires queryIndex
  color?: string; // fixed color (hex) used when colorMode === 'fixed'
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

export interface WeathermapOptions {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  format?: FormatOptions;
  backgroundImage?: string;
  backgroundImageFit?: 'contain' | 'stretch';
  edgeThresholdWidths?: EdgeThresholdStep[];
  edgeDefaultStrokeWidth?: number;
  querySettings?: QuerySettingsOptions;
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
}

export type WeathermapOptionsEditorProps = OptionsEditorProps<WeathermapOptions>;
