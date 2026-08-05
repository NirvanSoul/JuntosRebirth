import { spacing } from '@/theme/spacing';

/**
 * Tokens de disposición: objetivos táctiles, alturas de control, márgenes y
 * tamaños de icono.
 *
 * React Native no dispone de consultas de medios, así que la adaptación al
 * tamaño de pantalla se resuelve con una única variable de densidad derivada de
 * la altura de la ventana. Cada token afectado declara su valor `compact` y
 * `regular`, y los componentes lo resuelven con `useLayoutDensity`.
 */
export type LayoutDensity = 'compact' | 'regular';

/**
 * Altura de ventana, en puntos, por debajo de la cual se usa densidad compacta.
 *
 * Deja en `compact` los dispositivos de 667 a 812 pt (iPhone SE, iPhone mini y
 * equivalentes Android) y en `regular` los de 852 pt en adelante.
 */
export const compactHeightBreakpoint = 820;

export function resolveLayoutDensity(windowHeight: number): LayoutDensity {
  return windowHeight < compactHeightBreakpoint ? 'compact' : 'regular';
}

/**
 * Objetivo táctil mínimo.
 *
 * Apple exige 44 pt y Material 48 dp; se adopta 48 para cumplir ambas guías con
 * un único valor. Todo control interactivo debe alcanzarlo por altura y por
 * anchura, o compensarlo con `hitSlop`.
 */
export const minTouchTarget = 48;

export const layout = {
  minTouchTarget,
  /** Margen lateral de pantallas y modales. */
  screenGutter: { compact: spacing.lg, regular: spacing.xl },
  /** Altura de controles secundarios: campos, segmentos, filas de metadatos. */
  controlHeight: { compact: 48, regular: 56 },
  /** Altura de las acciones principales de un formulario o modal. */
  actionHeight: { compact: 56, regular: 64 },
  /** Altura de cada tecla de la calculadora de importes. */
  keypadKeyHeight: { compact: 48, regular: 56 },
  /** Separación entre bloques dentro de un modal o formulario. */
  stackGap: { compact: spacing.md, regular: spacing.lg },
  /** Separación entre controles contiguos de una misma fila. */
  controlGap: { compact: spacing.sm, regular: spacing.md },
  /**
   * Separación entre el último control de un modal y su borde útil, añadida a
   * la safe area (PROJECT_RULES §18).
   */
  modalBottomInset: { compact: spacing.lg, regular: spacing.xl },
  /**
   * Espacio libre al final del scroll de una pantalla para que la barra de
   * pestañas y el botón flotante no tapen el contenido.
   */
  floatingActionClearance: 148,
  /** Diámetro del botón flotante global de creación. */
  floatingActionSize: 60,
  /** Distancia desde la safe area inferior hasta las acciones sobre las pestañas. */
  floatingActionTabOffset: 78,
} as const;

/**
 * Tamaños de icono alineados a la sub-rejilla de 4 pt.
 *
 * `sm` acompaña a `footnote` y `label`, `md` a `body`, `lg` a `subheading` y
 * `xl` a las acciones destacadas.
 */
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

export type IconSize = keyof typeof iconSize;
