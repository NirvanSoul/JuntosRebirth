import type { SQLiteDatabase } from 'expo-sqlite';

import {
  clearLocalProfileAvatar,
  getPendingLocalDisplayName,
  getLocalProfile,
  restoreRemoteProfileDisplayName,
  saveLocalProfileAvatar,
  saveLocalProfileCountry,
  saveLocalProfileDisplayName,
  saveOwnRemoteAvatar,
  subscribeToLocalProfile,
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

  it('devuelve un perfil sin avatar, nombre ni país cuando no hay fila guardada', async () => {
    getFirstAsync.mockResolvedValueOnce(null);

    await expect(getLocalProfile()).resolves.toEqual({
      avatarUri: null,
      avatarPath: null,
      avatarUpdatedAt: null,
      displayName: null,
      countryCode: null,
    });
  });

  it('construye una uri con cache-bust, el nombre y el país a partir de la fila guardada', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: 'file:///document/avatars/profile-avatar.jpg',
      avatar_updated_at: '2026-08-07T00:00:00.000Z',
      avatar_remote_path: 'uuid-ana/avatar.jpg',
      avatar_remote_updated_at: '2026-08-30T10:14:38.971Z',
      display_name: 'Farruel',
      country_code: 'VE',
    });

    // El sello que manda es el del servidor: es el que cambia cuando la foto
    // cambia de verdad para todo el mundo.
    await expect(getLocalProfile()).resolves.toEqual({
      avatarUri:
        'file:///document/avatars/profile-avatar.jpg?v=2026-08-30T10:14:38.971Z',
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
      displayName: 'Farruel',
      countryCode: 'VE',
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
      countryCode: null,
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
      country_code: null,
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
      country_code: null,
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
      countryCode: null,
    });
  });

  it('publica el perfil guardado para actualizar la interfaz al instante', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: null,
      avatar_updated_at: null,
      avatar_remote_path: null,
      avatar_remote_updated_at: null,
      display_name: 'Beatriz',
      country_code: null,
    });
    const subscriber = jest.fn();
    const unsubscribe = subscribeToLocalProfile(subscriber);

    await saveLocalProfileDisplayName('Beatriz');

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Beatriz' }),
    );
    unsubscribe();
  });

  it('reconoce un nombre pendiente para reintentarlo después de reiniciar', async () => {
    getFirstAsync.mockResolvedValueOnce({
      display_name: 'Beatriz',
      display_name_sync_status: 'failed',
    });

    await expect(getPendingLocalDisplayName()).resolves.toBe('Beatriz');
  });

  it('restaura el nombre remoto solo cuando no hay una edición local pendiente', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: null,
      avatar_updated_at: null,
      avatar_remote_path: null,
      avatar_remote_updated_at: null,
      display_name: 'Nombre remoto',
      country_code: null,
    });

    await restoreRemoteProfileDisplayName('Nombre remoto');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("NOT IN ('pending', 'failed')"),
      'Nombre remoto',
    );
  });

  it('guarda el país local en mayúsculas y lo devuelve junto al resto del perfil', async () => {
    getFirstAsync.mockResolvedValueOnce({
      avatar_path: null,
      avatar_updated_at: null,
      avatar_remote_path: null,
      avatar_remote_updated_at: null,
      display_name: null,
      country_code: 'VE',
    });

    const profile = await saveLocalProfileCountry('  ve  ');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_profile'),
      'VE',
    );
    expect(profile).toEqual({
      avatarUri: null,
      avatarPath: null,
      avatarUpdatedAt: null,
      displayName: null,
      countryCode: 'VE',
    });
  });
});
