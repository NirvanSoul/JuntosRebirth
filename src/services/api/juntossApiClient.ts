import { apiEnvironment } from '@/app/config/environment';
import { authClient } from '@/lib/auth-client';
import { createApiClient } from '@/services/api/client';

/** Única instancia que conecta las peticiones privadas con Better Auth. */
export const apiClient = createApiClient({
  baseUrl: apiEnvironment.url,
  getCookie: () => authClient.getCookie(),
});
