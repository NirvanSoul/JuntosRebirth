import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  personalSpace,
  type Space,
  type SpacesState,
} from '@/features/spaces/types';
import {
  defaultCurrencyCode,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { loadCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

const spacesStorageKey = '@juntoss/spaces/v1';

type StoredSpacesState = {
  version: 2;
  activeSpaceId: string;
  spaces: Space[];
};

type LegacyV1Space = {
  id: string;
  name: string;
  type: 'personal' | 'couple' | 'other';
  currency?: unknown;
  isAwaitingPartner?: boolean;
};

type LegacyV1StoredSpacesState = {
  version: 1;
  activeSpaceId: string;
  spaces: LegacyV1Space[];
};

function isSpace(value: unknown): value is Space {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Space>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    (candidate.type === 'personal' ||
      candidate.type === 'couple' ||
      candidate.type === 'other') &&
    typeof candidate.currency === 'string' &&
    isCurrencyCode(candidate.currency) &&
    // Ausente en los catálogos guardados antes de que existieran los espacios
    // juntos pendientes: se trata como "no pendiente" hasta que
    // `refreshCoupleSpace` lo confirme contra el servidor.
    (candidate.isAwaitingPartner === undefined ||
      typeof candidate.isAwaitingPartner === 'boolean')
  );
}

function isLegacyV1Space(value: unknown): value is LegacyV1Space {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<LegacyV1Space>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    (candidate.type === 'personal' ||
      candidate.type === 'couple' ||
      candidate.type === 'other') &&
    (candidate.isAwaitingPartner === undefined ||
      typeof candidate.isAwaitingPartner === 'boolean')
  );
}

function parseStoredSpaces(
  value: string,
  seedCurrency: CurrencyCode,
): { state: SpacesState; needsSave: boolean } {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('El catálogo de espacios guardado no es válido');
  }

  const record = parsed as Record<string, unknown>;

  // Payload v2 vigente: debe contener currency válida en todos los espacios
  if (record.version === 2) {
    const candidate = parsed as Partial<StoredSpacesState>;
    if (
      !Array.isArray(candidate.spaces) ||
      !candidate.spaces.every(isSpace) ||
      typeof candidate.activeSpaceId !== 'string' ||
      !candidate.spaces.some((space) => space.id === candidate.activeSpaceId)
    ) {
      throw new Error('El catálogo de espacios guardado no es válido');
    }

    return {
      state: {
        activeSpaceId: candidate.activeSpaceId,
        spaces: candidate.spaces,
      },
      needsSave: false,
    };
  }

  // Payload v1 histórico: se migra enriqueciendo cada espacio con la semilla real
  if (record.version === 1) {
    const candidate = parsed as Partial<LegacyV1StoredSpacesState>;
    if (
      !Array.isArray(candidate.spaces) ||
      !candidate.spaces.every(isLegacyV1Space) ||
      typeof candidate.activeSpaceId !== 'string' ||
      !candidate.spaces.some((space) => space.id === candidate.activeSpaceId)
    ) {
      throw new Error('El catálogo de espacios guardado no es válido');
    }

    const migratedSpaces: Space[] = candidate.spaces.map((space) => ({
      id: space.id,
      name: space.name,
      type: space.type,
      currency:
        typeof space.currency === 'string' && isCurrencyCode(space.currency)
          ? (space.currency as CurrencyCode)
          : seedCurrency,
      ...(space.isAwaitingPartner !== undefined
        ? { isAwaitingPartner: space.isAwaitingPartner }
        : {}),
    }));

    return {
      state: {
        activeSpaceId: candidate.activeSpaceId,
        spaces: migratedSpaces,
      },
      needsSave: true,
    };
  }

  throw new Error('El catálogo de espacios guardado no es válido');
}

export async function loadSpaces(): Promise<SpacesState> {
  const stored = await AsyncStorage.getItem(spacesStorageKey);
  const preferences = await loadCurrencyPreferences();
  const seedCurrency: CurrencyCode =
    preferences.currencies[0] && isCurrencyCode(preferences.currencies[0])
      ? preferences.currencies[0]
      : defaultCurrencyCode;

  if (stored === null) {
    return {
      activeSpaceId: personalSpace.id,
      spaces: [{ ...personalSpace, currency: seedCurrency }],
    };
  }

  const { state, needsSave } = parseStoredSpaces(stored, seedCurrency);

  if (needsSave) {
    await saveSpaces(state);
  }

  return state;
}

export async function saveSpaces(state: SpacesState): Promise<void> {
  const stored: StoredSpacesState = {
    version: 2,
    activeSpaceId: state.activeSpaceId,
    spaces: [...state.spaces],
  };

  await AsyncStorage.setItem(spacesStorageKey, JSON.stringify(stored));
}

export function createSpaceId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `space-${time}-${random}`;
}

export const localSpaceStorage = {
  key: spacesStorageKey,
};
