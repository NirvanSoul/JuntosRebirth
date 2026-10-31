/* global __dirname */
const path = require('node:path');

// `babel-preset-expo` llega como dependencia de `expo`; se resuelve desde ahí
// para usar exactamente la versión del SDK instalado.
const expoPreset = require.resolve('babel-preset-expo', {
  paths: [path.dirname(require.resolve('expo/package.json'))],
});

/**
 * React Compiler se adopta por carpetas (ver Bible/ARCHITECTURE.md §4):
 * solo se compilan los directorios listados y se amplía fase a fase. Fuera de
 * ellos el código se transforma igual que con la configuración por defecto.
 */
const source = (...segments) =>
  path.join(__dirname, 'src', ...segments) + path.sep;

const reactCompilerDirectories = [
  // Fase 1: navegador principal y hojas globales.
  source('navigation'),
  ...['accounts', 'categories', 'exchangeRates', 'transactions'].map(
    (feature) => source('features', feature, 'components'),
  ),
  // Fase 2: primitivas compartidas y pantallas de Inicio, Actividad y Mapa.
  source('components'),
  source('theme'),
  source('features', 'activity'),
  source('features', 'dashboard'),
  source('features', 'map'),
];

const presetOptions = {
  'react-compiler': {
    sources: (filename) =>
      !/\.test\.[jt]sx?$/.test(filename) &&
      reactCompilerDirectories.some((directory) =>
        filename.startsWith(directory),
      ),
  },
};

/**
 * El código de la app usa el runtime JSX traducido (`src/lib/i18n/jsx`): sus
 * textos se escriben en español y se muestran en el idioma activo. Las
 * dependencias conservan el runtime de React; si React Native lo cargara, el
 * runtime importaría de vuelta `react-native` durante su propia carga.
 */
const appSources = [source(), path.join(__dirname, 'App.tsx')];
// Metro construye el transformador cargando esta configuración sin archivo:
// los patrones deben ser funciones que acepten `filename` indefinido.
const isAppSource = (filename) =>
  Boolean(filename) &&
  appSources.some((appSource) => filename.startsWith(appSource));
const isDependency = (filename) => !isAppSource(filename);

module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    overrides: [
      {
        test: isAppSource,
        presets: [
          [expoPreset, { ...presetOptions, jsxImportSource: '@/lib/i18n/jsx' }],
        ],
      },
      {
        test: isDependency,
        presets: [[expoPreset, presetOptions]],
      },
    ],
  };
};
