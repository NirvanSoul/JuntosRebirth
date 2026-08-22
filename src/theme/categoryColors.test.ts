import {
  categoryColorTokens,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { lightColors } from '@/theme/colors';

describe('getCategoryContentContrast', () => {
  it('mantiene blancos el texto y los iconos sobre cualquier color de categoría', () => {
    categoryColorTokens.forEach((colorToken) => {
      expect(getCategoryContentContrast(colorToken)).toEqual({
        color: lightColors.onBrand,
        tone: 'onBrand',
      });
    });
  });
});
