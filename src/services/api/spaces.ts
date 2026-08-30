import { apiClient } from '@/services/api/juntossApiClient';

export type RemoteSpace = {
  activatedAt: string | null;
  createdAt: string;
  currency: string;
  id: string;
  name: string;
  role: string;
  timezone: string;
  type: 'couple' | 'other' | 'personal';
};

type ListSpacesResponse = {
  data: {
    spaces: RemoteSpace[];
  };
};

/** Primera llamada privada del modo remoto; no toca SQLite ni el espacio local. */
export async function listRemoteSpaces(): Promise<readonly RemoteSpace[]> {
  const response = await apiClient.get<ListSpacesResponse>('/v1/spaces');
  return response.data.spaces;
}
