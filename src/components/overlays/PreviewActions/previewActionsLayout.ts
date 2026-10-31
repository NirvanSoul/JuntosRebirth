import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

/** Rectángulo de la tarjeta pulsada, en coordenadas de ventana. */
export type PreviewAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewActionsPlacement = 'above' | 'below';

export type PreviewActionsLayout = {
  placement: PreviewActionsPlacement;
  /** Posición de cada botón (esquina superior izquierda), en orden. */
  buttons: readonly { left: number; top: number }[];
};

/** Diámetro de cada botón flotante; supera el objetivo táctil mínimo. */
export const previewActionButtonSize = layout.minTouchTarget + spacing.xs;
/** Separación entre la tarjeta y la fila de botones. */
const anchorGap = spacing.md;
/** Separación horizontal entre botones contiguos. */
const buttonGap = spacing.lg;
/** Cuánto se separa el botón central de la tarjeta para dibujar el arco. */
const arcLift = spacing.md;

type LayoutInput = {
  anchor: PreviewAnchor;
  count: number;
  gutter: number;
  /** Solo importa el superior: si no caben arriba, la tarjeta está lejos del inferior. */
  topInset: number;
  window: { width: number; height: number };
};

/**
 * Coloca los botones en un arco sobre la tarjeta, centrado en ella. Si no
 * caben por encima (la tarjeta está pegada al borde superior), el arco pasa
 * por debajo con la curva invertida. El grupo se desplaza en horizontal para
 * no salirse de los márgenes de pantalla.
 */
export function getPreviewActionsLayout({
  anchor,
  count,
  gutter,
  topInset,
  window,
}: LayoutInput): PreviewActionsLayout {
  const step = previewActionButtonSize + buttonGap;
  const groupWidth = count * previewActionButtonSize + (count - 1) * buttonGap;
  const centerX = clamp(
    anchor.x + anchor.width / 2,
    gutter + groupWidth / 2,
    window.width - gutter - groupWidth / 2,
  );
  const firstLeft = centerX - groupWidth / 2;
  const middle = (count - 1) / 2;
  const aboveTop = anchor.y - anchorGap - previewActionButtonSize;
  const fitsAbove = aboveTop - arcLift >= topInset + spacing.sm;
  const placement: PreviewActionsPlacement = fitsAbove ? 'above' : 'below';
  const baseTop = fitsAbove ? aboveTop : anchor.y + anchor.height + anchorGap;

  return {
    placement,
    buttons: Array.from({ length: count }, (_, index) => {
      // 1 en el centro y 0 en los extremos: el centro se aleja de la tarjeta.
      const curve =
        middle === 0 ? 1 : 1 - Math.abs(index - middle) / Math.max(middle, 1);
      const lift = arcLift * curve;
      return {
        left: firstLeft + index * step,
        top: fitsAbove ? baseTop - lift : baseTop + lift,
      };
    }),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}
