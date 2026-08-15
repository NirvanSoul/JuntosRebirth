const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Deuda congelada el 2026-08-15: archivos fuente que ya superan el umbral de
// 400 líneas. El número es la cantidad de líneas no vacías medida ese día
// (equivale a `max-lines` con skipBlankLines: true). Mientras un archivo esté
// aquí, no puede crecer; se retira de la lista al descomponerlo.
const frozenLineDebt = {
  'src/navigation/MainTabsNavigator.tsx': 1372,
  'src/features/import/screens/ImportScreen.tsx': 1209,
  'src/features/transactions/components/CreateTransactionModal/CreateTransactionModal.tsx': 1167,
  'src/features/transactions/repositories/localTransactionRepository.ts': 901,
  'src/features/transactions/components/TransactionDetailModal/TransactionDetailModal.tsx': 701,
  'src/features/settings/screens/SettingsScreen.tsx': 660,
  'src/features/categories/components/CategoryDetailModal/CategoryDetailModal.tsx': 627,
  'src/features/map/screens/MapScreen.tsx': 611,
  'src/features/activity/screens/ActivityScreen.tsx': 573,
  'src/components/ui/AppCalendar/AppCalendar.tsx': 563,
  'src/features/import/repositories/localImportBatchRepository.ts': 556,
  'src/lib/storage/localDatabase.ts': 547,
  'src/features/activity/components/TransactionFiltersModal.tsx': 536,
  'src/features/categories/components/CategoryPickerModal/CategoryPickerModal.tsx': 485,
  'src/features/activity/components/CategoryDonutChart.tsx': 462,
  'src/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal.tsx': 441,
  'src/features/map/components/WeeklyMovementCalendar.tsx': 439,
  'src/features/spaces/components/SpaceSideMenu.tsx': 439,
  'src/features/categories/components/CategoryPreviewCard/CategoryPreviewCard.tsx': 425,
};

// Deuda de imports internos de node_modules (phosphor-react-native/src/...,
// react-native-calendars/src/...), congelada el 2026-08-15. Estos archivos ya
// importan de rutas internas; no pueden añadir más y se retiran de la lista al
// migrar a imports públicos.
const internalImportDebt = [
  'src/components/navigation/AppTabBar/AppTabBar.tsx',
  'src/features/categories/components/CategoryIcon/CategoryIcon.tsx',
  'src/features/map/screens/MapScreen.tsx',
  'src/components/ui/AppCalendar/AppCalendar.tsx',
  'src/features/activity/components/TransactionDateRangePickerModal.tsx',
  'src/features/transactions/components/CreateTransactionModal/TransactionCustomRecurrenceModal.tsx',
];

module.exports = defineConfig([
  globalIgnores(['coverage/*', 'dist/*', 'android/*', 'ios/*', '.expo/*']),
  expoConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      // Prohibición de «god components»: un archivo fuente nuevo no supera
      // 400 líneas no vacías.
      'max-lines': ['warn', { max: 400, skipBlankLines: true }],
      // Prohibición de importar desde rutas internas de node_modules. Se nombran
      // los paquetes (en vez de un comodín) para no bloquear imports relativos
      // legítimos del propio src/.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'phosphor-react-native/src/**',
                'react-native-calendars/src/**',
              ],
              message:
                'Importa desde la entrada pública de la librería, no de su src/ interno.',
            },
          ],
        },
      ],
    },
  },
  // Los tests no se penalizan por longitud: una suite larga es cobertura, no deuda.
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'max-lines': 'off' },
  },
  // Deuda de longitud: umbral congelado por archivo.
  ...Object.entries(frozenLineDebt).map(([file, frozen]) => ({
    files: [file],
    rules: { 'max-lines': ['warn', { max: frozen, skipBlankLines: true }] },
  })),
  // Deuda de imports internos: congelada por archivo.
  {
    files: internalImportDebt,
    rules: { 'no-restricted-imports': 'off' },
  },
  // Las Edge Functions de Supabase usan imports URL de Deno (https://esm.sh/...)
  // que import/no-unresolved no puede resolver.
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': 'off' },
  },
]);
