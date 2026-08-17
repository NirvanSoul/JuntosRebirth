import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadSpaces,
  localSpaceStorage,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import { initialSpacesState, type SpacesState } from '@/features/spaces/types';
import { saveCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

describe('localSpaceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restaura el espacio personal con EUR cuando no hay datos ni preferencias guardadas y lo persiste en disco', async () => {
    const state = await loadSpaces();
    expect(state).toEqual(initialSpacesState);

    // Verificar que se persistió inmediatamente en AsyncStorage como versión 2
    const raw = await AsyncStorage.getItem(localSpaceStorage.key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      version: 2,
      activeSpaceId: 'personal',
      spaces: [
        {
          id: 'personal',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
        },
      ],
    });
  });

  it('inicializa el espacio personal con VES cuando la preferencia guardada es VES y lo fija en disco', async () => {
    await saveCurrencyPreferences({ currencies: ['VES'] });

    const state = await loadSpaces();
    expect(state).toEqual({
      activeSpaceId: 'personal',
      spaces: [
        {
          id: 'personal',
          name: 'Personal',
          type: 'personal',
          currency: 'VES',
        },
      ],
    });

    // Verificar persistencia inmediata en AsyncStorage
    const raw = await AsyncStorage.getItem(localSpaceStorage.key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.spaces[0].currency).toBe('VES');
  });

  it('inmutabilidad: inicializar en VES, cambiar preferencias a EUR y recargar mantiene el espacio en VES', async () => {
    // 1. Inicialización en VES
    await saveCurrencyPreferences({ currencies: ['VES'] });
    const initial = await loadSpaces();
    expect(initial.spaces[0]!.currency).toBe('VES');

    // 2. Usuario cambia preferencias posteriormente a EUR
    await saveCurrencyPreferences({ currencies: ['EUR'] });

    // 3. Recarga del catálogo: debe mantenerse inmutable en VES
    const reloaded = await loadSpaces();
    expect(reloaded.spaces[0]!.currency).toBe('VES');

    const raw = await AsyncStorage.getItem(localSpaceStorage.key);
    const parsed = JSON.parse(raw!);
    expect(parsed.spaces[0].currency).toBe('VES');
  });

  it('guarda y restaura espacios versión 2 junto con la selección activa y sus monedas', async () => {
    const state: SpacesState = {
      activeSpaceId: 'space-home',
      spaces: [
        {
          id: 'personal',
          name: 'Personal',
          type: 'personal',
          currency: 'VES',
        },
        {
          id: 'space-home',
          name: 'Casa',
          type: 'other',
          currency: 'USD',
        },
      ],
    };

    await saveSpaces(state);

    await expect(loadSpaces()).resolves.toEqual(state);

    // Verificar que en AsyncStorage está version: 2
    const raw = await AsyncStorage.getItem(localSpaceStorage.key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.spaces[1].currency).toBe('USD');
  });

  it('migra un payload versión 1 conservando espacios y sembrando con la preferencia real (VES)', async () => {
    await saveCurrencyPreferences({ currencies: ['VES'] });

    // Guardar payload versión 1 antiguo sin campo currency
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 1,
        activeSpaceId: 'space-trips',
        spaces: [
          { id: 'personal', name: 'Personal', type: 'personal' },
          { id: 'space-trips', name: 'Viajes', type: 'other' },
        ],
      }),
    );

    const migrated = await loadSpaces();

    expect(migrated).toEqual({
      activeSpaceId: 'space-trips',
      spaces: [
        {
          id: 'personal',
          name: 'Personal',
          type: 'personal',
          currency: 'VES',
        },
        {
          id: 'space-trips',
          name: 'Viajes',
          type: 'other',
          currency: 'VES',
        },
      ],
    });

    // Verificar que se reescribió a disco como versión 2
    const raw = await AsyncStorage.getItem(localSpaceStorage.key);
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.spaces[0].currency).toBe('VES');
    expect(parsed.spaces[1].currency).toBe('VES');
  });

  it('rechaza un payload versión 2 que carece de currency o tiene una moneda inválida (no degrada a v1)', async () => {
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 2,
        activeSpaceId: 'personal',
        spaces: [
          {
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            // Sin campo currency
          },
        ],
      }),
    );

    await expect(loadSpaces()).rejects.toThrow(
      'El catálogo de espacios guardado no es válido',
    );

    // Con divisa no reconocida
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 2,
        activeSpaceId: 'personal',
        spaces: [
          {
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            currency: 'INVALID_CURRENCY',
          },
        ],
      }),
    );

    await expect(loadSpaces()).rejects.toThrow(
      'El catálogo de espacios guardado no es válido',
    );
  });

  it('rechaza un catálogo guardado cuyo espacio activo no existe', async () => {
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 2,
        activeSpaceId: 'missing',
        spaces: [initialSpacesState.spaces[0]],
      }),
    );

    await expect(loadSpaces()).rejects.toThrow(
      'El catálogo de espacios guardado no es válido',
    );
  });
});
