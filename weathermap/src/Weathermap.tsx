import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapPanel } from './components/panel/WeathermapPanel';
import { WeathermapOptions, WeathermapProps } from './types/weathermap-types';
import { GlobalSettingsEditor } from './components/settings/GlobalSettingsEditor';
import { WeathermapEditor } from './components/editor/WeathermapEditor';

export const Weathermap: PanelPlugin<WeathermapOptions, WeathermapProps> = {
  PanelComponent: WeathermapPanel,
  panelOptionsEditorComponents: [
    { label: 'Settings', content: GlobalSettingsEditor },
    { label: 'Nodes', content: WeathermapEditor },
  ],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
