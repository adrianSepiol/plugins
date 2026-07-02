import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapPanel } from './components/panel/WeathermapPanel';
import { WeathermapOptions, WeathermapProps } from './types/weathermap-types';
import { GlobalSettingsEditor } from './components/settings/GlobalSettingsEditor';

export const Weathermap: PanelPlugin<WeathermapOptions, WeathermapProps> = {
  PanelComponent: WeathermapPanel,
  panelOptionsEditorComponents: [{ label: 'Settings', content: GlobalSettingsEditor }],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
