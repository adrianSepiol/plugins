import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapComponent } from './components/WeathermapComponent';
import { WeathermapOptions, WeathermapProps } from './types/weathermap-types';
import { WeathermapSettingsEditor } from './components/WeathermapSettingsEditor';
import { WeathermapNodeEditor } from './components/WeathermapNodeEditor';

export const Weathermap: PanelPlugin<WeathermapOptions, WeathermapProps> = {
  PanelComponent: WeathermapComponent,
  panelOptionsEditorComponents: [
    { label: 'Settings', content: WeathermapSettingsEditor },
    { label: 'Nodes', content: WeathermapNodeEditor },
  ],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
