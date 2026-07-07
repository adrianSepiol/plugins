import { PanelPlugin } from '@perses-dev/plugin-system';
import { WeathermapPanel } from './components/panel/WeathermapPanel';
import { WeathermapSpec, WeathermapProps } from './model';
import { GlobalSettingsEditor } from './components/settings/GlobalSettingsEditor';

export const Weathermap: PanelPlugin<WeathermapSpec, WeathermapProps> = {
  PanelComponent: WeathermapPanel,
  panelOptionsEditorComponents: [{ label: 'Settings', content: GlobalSettingsEditor }],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
