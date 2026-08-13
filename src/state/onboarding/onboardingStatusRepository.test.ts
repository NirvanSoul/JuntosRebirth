import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadOnboardingStatus,
  saveOnboardingStatus,
} from '@/state/onboarding/onboardingStatusRepository';
import { defaultOnboardingStatus } from '@/state/onboarding/onboardingStatus';

describe('onboardingStatusRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devuelve el estado por defecto cuando no hay nada guardado', async () => {
    await expect(loadOnboardingStatus()).resolves.toEqual(
      defaultOnboardingStatus,
    );
  });

  it('guarda y recupera un onboarding completado como invitado', async () => {
    await saveOnboardingStatus({
      completed: true,
      completedVersion: 1,
      accessMode: 'guest',
    });

    await expect(loadOnboardingStatus()).resolves.toEqual({
      completed: true,
      completedVersion: 1,
      accessMode: 'guest',
    });
  });

  it('guarda y recupera un onboarding completado autenticándose', async () => {
    await saveOnboardingStatus({
      completed: true,
      completedVersion: 1,
      accessMode: 'authenticated',
    });

    await expect(loadOnboardingStatus()).resolves.toEqual({
      completed: true,
      completedVersion: 1,
      accessMode: 'authenticated',
    });
  });

  it('vuelve al estado por defecto si el valor guardado no es válido', async () => {
    await AsyncStorage.setItem(
      '@juntoss/onboarding-status/v1',
      JSON.stringify({ version: 1, completed: 'sí' }),
    );

    await expect(loadOnboardingStatus()).resolves.toEqual(
      defaultOnboardingStatus,
    );
  });

  it('vuelve al estado por defecto si la versión guardada es otra', async () => {
    await AsyncStorage.setItem(
      '@juntoss/onboarding-status/v1',
      JSON.stringify({
        version: 2,
        completed: true,
        completedVersion: 1,
        accessMode: 'guest',
      }),
    );

    await expect(loadOnboardingStatus()).resolves.toEqual(
      defaultOnboardingStatus,
    );
  });
});
