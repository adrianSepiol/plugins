import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapComponent } from './panel/WeathermapComponent';
import { WeathermapOptions, WeathermapProps } from './weathermap-types';
import { WeathermapSettingsEditor } from './settings/WeathermapSettingsEditor';
import { WeathermapNodeEditor } from './editor/WeathermapNodeEditor';

export const Weathermap: PanelPlugin<WeathermapOptions, WeathermapProps> = {
  PanelComponent: WeathermapComponent,
  panelOptionsEditorComponents: [
    { label: 'Settings', content: WeathermapSettingsEditor },
    { label: 'Nodes', content: WeathermapNodeEditor },
  ],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
