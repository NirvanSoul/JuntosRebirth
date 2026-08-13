import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getLocalProfile,
  saveLocalProfileAvatar,
  saveLocalProfileDisplayName,
} from '@/features/profile/repositories/localProfileRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

describe('localProfileRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getFirstAsync = jest.fn();
  const database = {
    getFirstAsync,
    runAsync,
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('devuelve un perfil sin avatar ni nombre cuando no hay fila guardada', async () => {
    getFirstAsync.mockResolvedValueOnce(null);

    await expect(getLocalProfile()).resolves.toEqual({
      avatarUri: null,
      displayName: null,
    });
  });

  it('construye una uri con cache-bust y el nombre a partir de la fila guardada', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: 'file:///document/avatars/profile-avatar.jpg',
      avatar_updated_at: '2026-08-07T00:00:00.000Z',
      display_name: 'Farruel',
    });

    await expect(getLocalProfile()).resolves.toEqual({
      avatarUri:
        'file:///document/avatars/profile-avatar.jpg?v=2026-08-07T00:00:00.000Z',
      displayName: 'Farruel',
    });
  });

  it('guarda la ruta del avatar como fila única y la devuelve con cache-bust', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: 'file:///document/avatars/profile-avatar.jpg',
      avatar_updated_at: '2026-08-11T00:00:00.000Z',
      display_name: null,
    });

    const profile = await saveLocalProfileAvatar(
      'file:///document/avatars/profile-avatar.jpg',
    );

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_profile'),
      'file:///document/avatars/profile-avatar.jpg',
      expect.any(String),
    );
    expect(profile.avatarUri).toMatch(
      /^file:\/\/\/document\/avatars\/profile-avatar\.jpg\?v=/,
    );
  });

  it('guarda el nombre local y lo devuelve junto al resto del perfil', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: null,
      avatar_updated_at: null,
      display_name: 'Farruel',
    });

    const profile = await saveLocalProfileDisplayName('  Farruel  ');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_profile'),
      'Farruel',
    );
    expect(profile).toEqual({ avatarUri: null, displayName: 'Farruel' });
  });
});
