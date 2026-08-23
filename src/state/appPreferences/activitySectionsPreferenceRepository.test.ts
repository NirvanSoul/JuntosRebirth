import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadActivitySectionsPreference,
  saveActivitySectionsPreference,
} from '@/state/appPreferences/activitySectionsPreferenceRepository';

describe('activitySectionsPreferenceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('inicia las secciones de Actividad plegadas', async () => {
    await expect(loadActivitySectionsPreference()).resolves.toEqual({
      accountsExpanded: false,
      categoriesExpanded: false,
      categoryView: 'list',
    });
  });

  it('guarda el último estado elegido para cada sección', async () => {
    await saveActivitySectionsPreference({
      accountsExpanded: true,
      categoriesExpanded: false,
      categoryView: 'grid',
    });

    await expect(loadActivitySectionsPreference()).resolves.toEqual({
      accountsExpanded: true,
      categoriesExpanded: false,
      categoryView: 'grid',
    });
  });

  it('mantiene el plegado almacenado antes de añadir la preferencia de vista', async () => {
    await AsyncStorage.setItem(
      '@juntoss/activity-sections/v1',
      JSON.stringify({
        accountsExpanded: true,
        categoriesExpanded: true,
        version: 1,
      }),
    );

    await expect(loadActivitySectionsPreference()).resolves.toEqual({
      accountsExpanded: true,
      categoriesExpanded: true,
      categoryView: 'list',
    });
  });
});
