import { shadows } from '@/theme/shadows';

describe('shadows', () => {
  it('conserva la sombra informativa suave de la referencia', () => {
    expect(shadows.subtle).toMatchObject({
      elevation: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    });
  });

  it('proyecta la sombra del menú principal hacia el contenido', () => {
    expect(shadows.mainMenu).toMatchObject({
      elevation: shadows.subtle.elevation,
      shadowColor: shadows.subtle.shadowColor,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: shadows.subtle.shadowOpacity,
      shadowRadius: shadows.subtle.shadowRadius,
    });
  });
});
