export const appEnvironments = [
  'development',
  'preview',
  'production',
] as const;

export type AppEnvironment = (typeof appEnvironments)[number];

const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV;

export function getAppEnvironment(value: string | undefined): AppEnvironment {
  if (value === undefined || value === '') {
    return 'development';
  }

  if (appEnvironments.some((environment) => environment === value)) {
    return value as AppEnvironment;
  }

  throw new Error(`EXPO_PUBLIC_APP_ENV no es válido: ${value}`);
}

export const appEnvironment = getAppEnvironment(configuredEnvironment);

export type ApiEnvironment = {
  url: string;
};

/**
 * La URL de la API es pública por diseño: identifica el Worker al que se
 * conecta la aplicación, pero no concede acceso. Los secretos de Better Auth
 * y de la base de datos nunca pertenecen al bundle de Expo.
 */
export function getApiEnvironment(url: string | undefined): ApiEnvironment {
  if (!url) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_URL para conectar Juntoss con su API.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL no es una URL válida');
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('EXPO_PUBLIC_API_URL debe usar HTTP o HTTPS');
  }

  return { url: parsedUrl.toString().replace(/\/$/, '') };
}

export const apiEnvironment = getApiEnvironment(
  process.env.EXPO_PUBLIC_API_URL,
);
