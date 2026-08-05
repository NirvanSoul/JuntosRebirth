import {
  compactHeightBreakpoint,
  iconSize,
  layout,
  minTouchTarget,
  resolveLayoutDensity,
} from '@/theme/layout';
import { spacing } from '@/theme/spacing';

describe('resolveLayoutDensity', () => {
  it('usa densidad compacta en pantallas cortas', () => {
    expect(resolveLayoutDensity(667)).toBe('compact');
    expect(resolveLayoutDensity(812)).toBe('compact');
    expect(resolveLayoutDensity(compactHeightBreakpoint - 1)).toBe('compact');
  });

  it('usa densidad regular a partir del punto de corte', () => {
    expect(resolveLayoutDensity(compactHeightBreakpoint)).toBe('regular');
    expect(resolveLayoutDensity(852)).toBe('regular');
    expect(resolveLayoutDensity(932)).toBe('regular');
  });
});

describe('tokens de disposición', () => {
  it('respeta el objetivo táctil mínimo de iOS y Android en ambas densidades', () => {
    const heights = [
      layout.controlHeight,
      layout.actionHeight,
      layout.keypadKeyHeight,
    ];

    heights.forEach((token) => {
      expect(token.compact).toBeGreaterThanOrEqual(minTouchTarget);
      expect(token.regular).toBeGreaterThanOrEqual(minTouchTarget);
    });
  });

  it('nunca da a la densidad compacta más espacio que a la regular', () => {
    const responsiveTokens = [
      layout.screenGutter,
      layout.controlHeight,
      layout.actionHeight,
      layout.keypadKeyHeight,
      layout.stackGap,
      layout.controlGap,
      layout.modalBottomInset,
    ];

    responsiveTokens.forEach((token) => {
      expect(token.compact).toBeLessThanOrEqual(token.regular);
    });
  });

  it('reserva una separación inferior visible en los modales', () => {
    expect(layout.modalBottomInset.compact).toBeGreaterThanOrEqual(spacing.lg);
  });

  it('alinea los tamaños de icono a la sub-rejilla de 4 pt', () => {
    Object.values(iconSize).forEach((size) => {
      expect(size % 4).toBe(0);
    });
  });
});

describe('escala de espaciado', () => {
  it('mantiene todos los pasos en la rejilla de 4 pt salvo el ajuste óptico', () => {
    Object.entries(spacing).forEach(([name, value]) => {
      if (name === 'xxs') {
        return;
      }

      expect(value % 4).toBe(0);
    });
  });
});
