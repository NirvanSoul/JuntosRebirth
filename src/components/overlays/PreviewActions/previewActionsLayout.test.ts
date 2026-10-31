import {
  getPreviewActionsLayout,
  previewActionButtonSize,
} from '@/components/overlays/PreviewActions/previewActionsLayout';

const window = { width: 390, height: 844 };

describe('getPreviewActionsLayout', () => {
  it('forma un arco sobre la tarjeta con el botón central más separado', () => {
    const { buttons, placement } = getPreviewActionsLayout({
      anchor: { x: 20, y: 400, width: 350, height: 72 },
      count: 3,
      gutter: 16,
      topInset: 47,
      window,
    });

    expect(placement).toBe('above');
    const [left, middle, right] = buttons;
    expect(middle!.top).toBeLessThan(left!.top);
    expect(left!.top).toBe(right!.top);
    expect(left!.top + previewActionButtonSize).toBeLessThan(400);
    // Centrado en la tarjeta.
    const groupCenter =
      (left!.left + right!.left + previewActionButtonSize) / 2;
    expect(groupCenter).toBe(20 + 350 / 2);
  });

  it('pasa el arco por debajo cuando la tarjeta está pegada al borde superior', () => {
    const { buttons, placement } = getPreviewActionsLayout({
      anchor: { x: 20, y: 80, width: 350, height: 72 },
      count: 3,
      gutter: 16,
      topInset: 47,
      window,
    });

    expect(placement).toBe('below');
    const [left, middle] = buttons;
    expect(left!.top).toBeGreaterThan(80 + 72);
    expect(middle!.top).toBeGreaterThan(left!.top);
  });

  it('no deja que el arco de una tarjeta pequeña del borde salga del margen', () => {
    const { buttons } = getPreviewActionsLayout({
      anchor: { x: 2, y: 500, width: 50, height: 74 },
      count: 3,
      gutter: 16,
      topInset: 47,
      window,
    });

    expect(buttons[0]!.left).toBe(16);
    expect(buttons[2]!.left + previewActionButtonSize).toBeLessThanOrEqual(
      window.width - 16,
    );
  });
});
