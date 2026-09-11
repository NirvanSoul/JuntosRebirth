import { registerRootComponent } from 'expo';

import { markStartup } from './src/lib/diagnostics/startupTrace';
import App from './App';

markStartup('bundle_evaluated');

registerRootComponent(App);
