import { createJuntossAccountDeletionGateway } from '@/features/legal/gateways/juntossAccountDeletionGateway';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { delete: jest.fn(async () => undefined) },
}));

describe('juntossAccountDeletionGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('envía la confirmación requerida al eliminar la cuenta', async () => {
    await createJuntossAccountDeletionGateway().deleteAccount();

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/me', {
      confirmation: 'DELETE_MY_ACCOUNT',
    });
  });

  it('usa una ruta distinta para borrar datos y conservar la cuenta', async () => {
    await createJuntossAccountDeletionGateway().deleteData();

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/me/data');
    expect(apiClient.delete).not.toHaveBeenCalledWith('/v1/me');
  });
});
