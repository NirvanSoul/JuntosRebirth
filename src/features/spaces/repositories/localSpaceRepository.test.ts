import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getSpacesCatalogueRevision,
  loadSpaces,
  localSpaceStorage,
  saveSpaces,
  subscribeToSpaces,
  updateSpaces,
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

  it('repara un catálogo guardado cuyo espacio activo ya no existe', async () => {
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 2,
        activeSpaceId: 'missing',
        spaces: [initialSpacesState.spaces[0]],
      }),
    );

    await expect(loadSpaces()).resolves.toEqual(initialSpacesState);
    await expect(
      AsyncStorage.getItem(localSpaceStorage.key).then((raw) =>
        JSON.parse(raw!),
      ),
    ).resolves.toEqual({ version: 2, ...initialSpacesState });
  });

  it('notifica cada catálogo persistido a quienes mantienen el contexto activo', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSpaces(listener);

    await saveSpaces(initialSpacesState);
    unsubscribe();
    await saveSpaces({
      activeSpaceId: 'space-home',
      spaces: [
        ...initialSpacesState.spaces,
        {
          id: 'space-home',
          name: 'Casa',
          type: 'other',
          currency: 'EUR',
        },
      ],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(initialSpacesState);
  });

  it('no cambia el contexto activo si AsyncStorage rechaza la escritura', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSpaces(listener);
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(saveSpaces(initialSpacesState)).rejects.toThrow(
      'storage unavailable',
    );
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });

  describe('updateSpaces', () => {
    const couple = {
      id: 'couple-1',
      name: 'Juntos',
      type: 'couple' as const,
      currency: 'EUR' as const,
    };
    const other = {
      id: 'other-1',
      name: 'Viaje',
      type: 'other' as const,
      currency: 'EUR' as const,
    };

    it('aplica dos mutaciones concurrentes en orden, sin perder ninguna', async () => {
      await saveSpaces(initialSpacesState);

      const [first, second] = await Promise.all([
        updateSpaces((stored) => ({
          ...stored,
          spaces: [...stored.spaces, couple],
        })),
        updateSpaces((stored) => ({
          ...stored,
          spaces: [...stored.spaces, other],
        })),
      ]);

      expect(first.spaces.map((space) => space.id)).toEqual([
        'personal',
        'couple-1',
      ]);
      expect(second.spaces.map((space) => space.id)).toEqual([
        'personal',
        'couple-1',
        'other-1',
      ]);
      expect((await loadSpaces()).spaces.map((space) => space.id)).toEqual([
        'personal',
        'couple-1',
        'other-1',
      ]);
    });

    it('un saveSpaces directo espera a la actualización en curso', async () => {
      await saveSpaces(initialSpacesState);
      let releaseUpdate: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        releaseUpdate = resolve;
      });

      // La mutación es síncrona; la espera se mete en la lectura previa
      // simulando una escritura lenta que sigue en la cola.
      const slowUpdate = updateSpaces((stored) => ({
        ...stored,
        spaces: [...stored.spaces, couple],
      }));
      const directSave = gate.then(() =>
        saveSpaces({
          activeSpaceId: 'personal',
          spaces: [...initialSpacesState.spaces, other],
        }),
      );
      releaseUpdate?.();
      await Promise.all([slowUpdate, directSave]);

      // La escritura directa es posterior en la cola y prevalece entera.
      expect((await loadSpaces()).spaces.map((space) => space.id)).toEqual([
        'personal',
        'other-1',
      ]);
    });

    it('no escribe cuando la mutación devuelve la misma referencia', async () => {
      await saveSpaces(initialSpacesState);
      // El mock de AsyncStorage ya es un jest.fn: se limpia su historial.
      jest.mocked(AsyncStorage.setItem).mockClear();

      const result = await updateSpaces((stored) => stored);

      expect(result).toEqual(initialSpacesState);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('una selección no invalida una lectura remota del mismo catálogo', async () => {
      await saveSpaces({
        activeSpaceId: 'personal',
        spaces: [...initialSpacesState.spaces, couple],
      });
      const revision = getSpacesCatalogueRevision();

      await updateSpaces((stored) => ({
        ...stored,
        activeSpaceId: 'couple-1',
      }));

      expect(getSpacesCatalogueRevision()).toBe(revision);
    });

    it('ignora una respuesta remota si el catálogo cambió mientras esperaba', async () => {
      await saveSpaces(initialSpacesState);
      const staleRevision = getSpacesCatalogueRevision();
      await updateSpaces((stored) => ({
        ...stored,
        spaces: [...stored.spaces, couple],
      }));

      const result = await updateSpaces(
        (stored) => ({
          activeSpaceId: 'personal',
          spaces: stored.spaces.filter((space) => space.type !== 'couple'),
        }),
        { ifCatalogueRevision: staleRevision },
      );

      expect(result.spaces.map((space) => space.id)).toEqual([
        'personal',
        'couple-1',
      ]);
      expect((await loadSpaces()).spaces.map((space) => space.id)).toEqual([
        'personal',
        'couple-1',
      ]);
    });
  });
});
