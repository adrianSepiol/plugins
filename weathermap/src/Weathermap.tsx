import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapPanel } from './components/WeathermapPanel';
import { WeathermapOptions, WeathermapProps } from './types/weathermap-types';
import { GlobalSettingsEditor } from './components/GlobalSettingsEditor';
import { WeathermapEditor } from './components/WeathermapEditor';

export const Weathermap: PanelPlugin<WeathermapOptions, WeathermapProps> = {
  PanelComponent: WeathermapPanel,
  panelOptionsEditorComponents: [
    { label: 'Settings', content: GlobalSettingsEditor },
    { label: 'Nodes', content: WeathermapEditor },
  ],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
