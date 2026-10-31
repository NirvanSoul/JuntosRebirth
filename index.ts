// Antes que cualquier pantalla: las fechas siguen el idioma de la app.
import './src/lib/i18n/installDateLocale';
import { registerRootComponent } from 'expo';

import { markStartup } from './src/lib/diagnostics/startupTrace';
import App from './App';

markStartup('bundle_evaluated');

registerRootComponent(App);
