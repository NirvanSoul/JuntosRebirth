import {
  getAppEnvironment,
  getSupabaseEnvironment,
} from '@/app/config/environment';

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

describe('getSupabaseEnvironment', () => {
  it('permite ejecutar la app local sin conectar todavía Supabase', () => {
    expect(getSupabaseEnvironment(undefined, undefined)).toBeNull();
  });

  it('exige URL y publishable key juntas', () => {
    expect(() =>
      getSupabaseEnvironment('https://example.supabase.co', undefined),
    ).toThrow('configuración de Supabase está incompleta');
  });

  it('normaliza una configuración completa', () => {
    expect(
      getSupabaseEnvironment('https://example.supabase.co/', 'publishable'),
    ).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable',
    });
  });
});
