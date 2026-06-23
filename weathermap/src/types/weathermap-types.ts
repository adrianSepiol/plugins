import { TimeSeriesData, ThresholdOptions } from '@perses-dev/core';
import { PanelProps, LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';

export type QueryData = TimeSeriesData; // Type of data returned by a query plugin and supported by this plugin

export type WeathermapProps = PanelProps<WeathermapOptions, QueryData>;

export interface QuerySettingsOptions {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export interface NodeSpec {
  id: string;
  x: number;
  y: number;
  size: number;
  kind: 'rectangle' | 'icon' | 'text';
  label?: string;
  icon?: string;
  queryIndex?: number; // index into queryResults; enables {{label}} interpolation in label
  colorMode?: 'threshold' | 'fixed'; // how to color the node; requires queryIndex
  color?: string; // fixed color (hex) used when colorMode === 'fixed'
}

export type AnchorPoint = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface EdgeSpec {
  id: string;
  source: string;
  target: string; // empty string = free endpoint
  sourceAnchor?: AnchorPoint;
  targetAnchor?: AnchorPoint;
  x2?: number; // free endpoint x (when target === '')
  y2?: number; // free endpoint y (when target === '')
  bidirectional?: boolean;
  sourceQueryIndex?: number; // query index for the source→target direction label
  targetQueryIndex?: number; // query index for the target→source direction label
  sourceLabelTemplate?: string; // {{value}} template for source→target label
  targetLabelTemplate?: string; // {{value}} template for target→source label
}

export interface EdgeThresholdStep {
  value: number;
  strokeWidth: number;
}

export interface WeathermapOptions {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  edgeThresholdWidths?: EdgeThresholdStep[];
  edgeDefaultStrokeWidth?: number;
  querySettings?: QuerySettingsOptions;
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
}

export type WeathermapOptionsEditorProps = OptionsEditorProps<WeathermapOptions>;
