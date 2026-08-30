import { getApiEnvironment, getAppEnvironment } from '@/app/config/environment';

describe('getAppEnvironment', () => {
  it('usa development cuando no hay configuración', () => {
    expect(getAppEnvironment(undefined)).toBe('development');
  });

  it.each(['development', 'preview', 'production'] as const)(
    'acepta el entorno %s',
    (environment) => {
      expect(getAppEnvironment(environment)).toBe(environment);
    },
  );

  it('rechaza un entorno desconocido', () => {
    expect(() => getAppEnvironment('staging')).toThrow(
      'EXPO_PUBLIC_APP_ENV no es válido',
    );
  });
});

describe('getApiEnvironment', () => {
  it('exige una URL pública de API', () => {
    expect(() => getApiEnvironment(undefined)).toThrow(
      'Configura EXPO_PUBLIC_API_URL',
    );
  });

  it('normaliza una URL válida sin barra final', () => {
    expect(getApiEnvironment('https://api.example.test/')).toEqual({
      url: 'https://api.example.test',
    });
  });

  it('rechaza protocolos que no son HTTP', () => {
    expect(() => getApiEnvironment('juntoss://api')).toThrow(
      'EXPO_PUBLIC_API_URL debe usar HTTP o HTTPS',
    );
  });
});
