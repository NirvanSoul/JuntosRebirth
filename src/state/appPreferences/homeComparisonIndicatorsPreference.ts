/**
 * Controla si Inicio muestra el porcentaje de cambio de Ingresos/Gastos
 * frente al mes anterior en sus badges de resumen. Solo afecta a Inicio:
 * Actividad y las hojas de Balance/Ingresos/Gastos siempre lo muestran.
 */
export type HomeComparisonIndicatorsPreference = {
  enabled: boolean;
};

export const defaultHomeComparisonIndicatorsPreference: HomeComparisonIndicatorsPreference =
  {
    enabled: true,
  };
