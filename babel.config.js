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

module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [
      [
        expoPreset,
        {
          'react-compiler': {
            sources: (filename) =>
              !/\.test\.[jt]sx?$/.test(filename) &&
              reactCompilerDirectories.some((directory) =>
                filename.startsWith(directory),
              ),
          },
        },
      ],
    ],
  };
};
