import { StyleSheet } from 'react-native';

import {
  dynamicTypeRamp,
  getTypographyStyle,
  maxFontScale,
  typography,
} from '@/theme/typography';
import { fontFamily } from '@/theme/fonts';

const variants = Object.keys(typography) as (keyof typeof typography)[];

describe('escala tipográfica', () => {
  it('crece de forma monótona a lo largo de la escala', () => {
    const sizes = variants.map((variant) => typography[variant].fontSize);

    sizes.forEach((size, index) => {
      const previous = sizes[index - 1];
      if (previous === undefined) {
        return;
      }

      expect(size).toBeGreaterThanOrEqual(previous);
    });
  });

  it('no baja del tamaño mínimo legible', () => {
    variants.forEach((variant) => {
      expect(typography[variant].fontSize).toBeGreaterThanOrEqual(11);
    });
  });

  it('define un interlineado proporcional al tamaño', () => {
    variants.forEach((variant) => {
      const { fontSize, lineHeight } = typography[variant];

      expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.05);
      expect(lineHeight).toBeLessThanOrEqual(fontSize * 1.6);
    });
  });

  it('limita el escalado del sistema sin impedir la accesibilidad', () => {
    variants.forEach((variant) => {
      expect(maxFontScale[variant]).toBeGreaterThanOrEqual(1.1);
      expect(maxFontScale[variant]).toBeLessThanOrEqual(2);
    });
  });

  it('permite más escalado en el texto pequeño que en las cifras grandes', () => {
    expect(maxFontScale.footnote).toBeGreaterThan(maxFontScale.amountHero);
    expect(maxFontScale.body).toBeGreaterThan(maxFontScale.title);
  });

  it('reduce solo los estilos de presentación en densidad compacta', () => {
    const compactBody = StyleSheet.flatten(
      getTypographyStyle('body', 'compact'),
    );
    const compactHeading = StyleSheet.flatten(
      getTypographyStyle('heading', 'compact'),
    );

    expect(compactBody.fontSize).toBe(typography.body.fontSize);
    expect(compactHeading.fontSize).toBeLessThan(typography.heading.fontSize);
  });

  it('asigna una rampa de Dynamic Type a cada variante', () => {
    variants.forEach((variant) => {
      expect(dynamicTypeRamp[variant]).toBeDefined();
    });
  });

  it('asigna Gilroy según la jerarquía semántica', () => {
    expect(typography.body.fontFamily).toBe(fontFamily.light);
    expect(typography.caption.fontFamily).toBe(fontFamily.regular);
    expect(typography.label.fontFamily).toBe(fontFamily.medium);
    expect(typography.heading.fontFamily).toBe(fontFamily.bold);

    variants.forEach((variant) => {
      expect(typography[variant].fontFamily).toMatch(/^Gilroy-/);
    });
  });
});
