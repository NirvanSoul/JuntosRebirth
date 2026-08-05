import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadSpaces,
  localSpaceStorage,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import { initialSpacesState } from '@/features/spaces/types';

describe('localSpaceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restaura el espacio personal cuando todavía no hay datos', async () => {
    await expect(loadSpaces()).resolves.toEqual(initialSpacesState);
  });

  it('guarda y restaura espacios junto con la selección activa', async () => {
    const state = {
      activeSpaceId: 'space-home',
      spaces: [
        ...initialSpacesState.spaces,
        { id: 'space-home', name: 'Casa', type: 'other' as const },
      ],
    };

    await saveSpaces(state);

    await expect(loadSpaces()).resolves.toEqual(state);
  });

  it('rechaza un catálogo guardado cuyo espacio activo no existe', async () => {
    await AsyncStorage.setItem(
      localSpaceStorage.key,
      JSON.stringify({
        version: 1,
        activeSpaceId: 'missing',
        spaces: [initialSpacesState.spaces[0]],
      }),
    );

    await expect(loadSpaces()).rejects.toThrow(
      'El catálogo de espacios guardado no es válido',
    );
  });
});
