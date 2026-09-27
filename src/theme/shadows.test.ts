import { darkShadows, shadows } from '@/theme/shadows';

describe('shadows', () => {
  it('expresa cada sombra con boxShadow para que Android e iOS la pinten igual', () => {
    for (const token of Object.values(shadows)) {
      expect(Object.keys(token)).toEqual(['boxShadow']);
    }
  });

  it('conserva la sombra informativa suave de la referencia', () => {
    expect(shadows.subtle.boxShadow).toBe('0 6px 24px rgba(0, 0, 0, 0.05)');
  });

  it('proyecta la sombra del menú principal hacia el contenido', () => {
    expect(shadows.mainMenu.boxShadow).toBe('0 -4px 24px rgba(0, 0, 0, 0.05)');
  });

  it('mantiene oscura la sombra de la acción flotante en modo oscuro', () => {
    expect(darkShadows.floatingAction.boxShadow).toBe(
      '0 4px 16px rgba(0, 0, 0, 0.44)',
    );
  });

  it('anula la sombra heredada con una lista vacía', () => {
    expect(shadows.none.boxShadow).toEqual([]);
  });
});
