import { apiEnvironment } from '@/app/config/environment';
import { authClient } from '@/lib/auth-client';
import { ApiError, createApiClient } from '@/services/api/client';
import { loadDemoSession } from '@/state/demoSession/demoSessionStore';

/**
 * Con el usuario demo activo ninguna petición sale del dispositivo: sus datos
 * son ficticios y no deben llegar nunca a Juntoss API. Es la guarda de último
 * recurso; los flujos automáticos además evitan llamar mientras dura el demo.
 */
const fetchUnlessDemo: typeof fetch = async (input, init) => {
  if (await loadDemoSession()) {
    throw new ApiError({
      status: 0,
      code: 'DEMO_SESSION',
      message: 'El usuario demo funciona sin conexión con Juntoss.',
    });
  }
  return fetch(input, init);
};

/** Única instancia que conecta las peticiones privadas con Better Auth. */
export const apiClient = createApiClient({
  baseUrl: apiEnvironment.url,
  fetchImpl: fetchUnlessDemo,
  getCookie: () => authClient.getCookie(),
});
