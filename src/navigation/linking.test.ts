import { linking } from '@/navigation/linking';

describe('linking', () => {
  it('deja el callback OAuth a expo-web-browser, sin reiniciar navegación', () => {
    expect(linking.filter?.('juntoss://oauth/google')).toBe(false);
    expect(linking.filter?.('juntoss://actividad')).toBe(true);
  });
});
