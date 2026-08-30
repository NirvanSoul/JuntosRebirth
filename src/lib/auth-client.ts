import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { apiEnvironment } from '@/app/config/environment';

/**
 * La sesión Better Auth vive en SecureStore. Ninguna cookie se replica en
 * AsyncStorage: el cliente Expo la recupera bajo demanda para las llamadas
 * privadas realizadas por `services/api`.
 */
export const authClient = createAuthClient({
  baseURL: apiEnvironment.url,
  plugins: [
    expoClient({
      scheme: 'juntoss',
      storagePrefix: 'juntoss',
      storage: SecureStore,
    }),
    // Verificación de correo y recuperación de contraseña por código de un
    // solo uso, que es lo que piden VerifyCodeScreen y ResetPasswordScreen.
    emailOTPClient(),
  ],
});
