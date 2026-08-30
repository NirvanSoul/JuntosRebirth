import type { SQLiteDatabase } from 'expo-sqlite';

import {
  clearLocalProfileAvatar,
  getLocalProfile,
  saveLocalProfileAvatar,
  saveLocalProfileDisplayName,
  saveOwnRemoteAvatar,
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
      avatarPath: null,
      avatarUpdatedAt: null,
      displayName: null,
    });
  });

  it('construye una uri con cache-bust y el nombre a partir de la fila guardada', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: 'file:///document/avatars/profile-avatar.jpg',
      avatar_updated_at: '2026-08-07T00:00:00.000Z',
      avatar_remote_path: 'uuid-ana/avatar.jpg',
      avatar_remote_updated_at: '2026-08-30T10:14:38.971Z',
      display_name: 'Farruel',
    });

    // El sello que manda es el del servidor: es el que cambia cuando la foto
    // cambia de verdad para todo el mundo.
    await expect(getLocalProfile()).resolves.toEqual({
      avatarUri:
        'file:///document/avatars/profile-avatar.jpg?v=2026-08-30T10:14:38.971Z',
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
      displayName: 'Farruel',
    });
  });

  it('guarda avatarPath y avatarUpdatedAt tal y como los devuelve la API', async () => {
    await saveOwnRemoteAvatar('file:///document/avatars/profile-avatar.jpg', {
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('avatar_remote_updated_at'),
      'uuid-ana/avatar.jpg',
      '2026-08-30T10:14:38.971Z',
      'file:///document/avatars/profile-avatar.jpg',
    );
  });

  it('deja el perfil sin foto ni metadata tras un borrado confirmado', async () => {
    getFirstAsync.mockResolvedValueOnce(null);

    await expect(clearLocalProfileAvatar()).resolves.toEqual({
      avatarUri: null,
      avatarPath: null,
      avatarUpdatedAt: null,
      displayName: null,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('avatar_remote_path = NULL'),
      expect.any(String),
    );
  });

  it('guarda la ruta del avatar como fila única y la devuelve con cache-bust', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: 'file:///document/avatars/profile-avatar.jpg',
      avatar_updated_at: '2026-08-11T00:00:00.000Z',
      avatar_remote_path: null,
      avatar_remote_updated_at: null,
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
      avatar_remote_path: null,
      avatar_remote_updated_at: null,
      display_name: 'Farruel',
    });

    const profile = await saveLocalProfileDisplayName('  Farruel  ');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_profile'),
      'Farruel',
    );
    expect(profile).toEqual({
      avatarUri: null,
      avatarPath: null,
      avatarUpdatedAt: null,
      displayName: 'Farruel',
    });
  });
});
