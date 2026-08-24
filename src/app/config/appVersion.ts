import appConfig from '../../../app.json';

/**
 * Versión pública de la app. Fuente canónica: `app.json → expo.version`
 * (0.1.0). El campo `version` de `package.json` (0.1.0-alpha) es metadato del
 * paquete npm y no se copia como versión de la app: cualquier otra fuente
 * duplicada vuelve a crear el literal que este módulo centraliza.
 */
export const appVersion: string = appConfig.expo.version;
