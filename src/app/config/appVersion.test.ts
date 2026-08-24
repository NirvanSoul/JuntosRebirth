import appConfig from '../../../app.json';

import { appVersion } from '@/app/config/appVersion';

it('la versión de la app proviene de app.json → expo.version, no de un literal duplicado', () => {
  expect(appVersion).toBe(appConfig.expo.version);
  expect(appVersion).not.toContain('-alpha');
});
