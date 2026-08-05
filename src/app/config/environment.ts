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

export type SupabaseEnvironment = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnvironment(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseEnvironment | null {
  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) {
    throw new Error('La configuración de Supabase está incompleta');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL no es una URL válida');
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL debe usar HTTP o HTTPS');
  }

  return { url: parsedUrl.toString().replace(/\/$/, ''), publishableKey };
}

export const supabaseEnvironment = getSupabaseEnvironment(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
