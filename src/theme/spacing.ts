/**
 * Escala de espaciado de `juntoss`.
 *
 * Sigue la rejilla de 8 pt adoptada por iOS y Material, con una sub-rejilla de
 * 4 pt para el interior de los componentes. Todos los valores son múltiplos de
 * 4 salvo `xxs`, reservado para separaciones ópticas dentro de una misma línea.
 *
 * Uso recomendado:
 *
 * - `xxs`–`xs`: separación entre elementos de una misma línea.
 * - `sm`–`md`: interior de controles y separación entre elementos de una lista.
 * - `lg`: relleno interior de tarjetas y campos.
 * - `xl`: márgenes laterales de pantalla y modal en densidad regular.
 * - `xxl`–`xxxl`: separación entre secciones.
 * - `huge`: separaciones excepcionales, como estados vacíos a pantalla completa.
 *
 * No deben usarse números sueltos: si falta un paso, se discute antes de
 * añadirlo para no romper el ritmo vertical.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export type Spacing = keyof typeof spacing;
