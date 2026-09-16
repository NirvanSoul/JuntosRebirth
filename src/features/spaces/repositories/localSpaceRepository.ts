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

/**
 * AsyncStorage no serializa a quienes escriben el catálogo. Sin esta cola, la
 * comprobación remota del espacio de pareja y la restauración del snapshot
 * (que arrancan a la vez al abrir la cuenta) se pisaban: ganaba el último
 * `setItem`, y se perdía o el catálogo del snapshot o la marca de "esperando
 * pareja". Todas las escrituras pasan por aquí, en orden.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
let catalogueRevision = 0;
const spacesListeners = new Set<(state: SpacesState) => void>();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

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

async function resolveSeedCurrency(): Promise<CurrencyCode> {
  const preferences = await loadCurrencyPreferences();
  const firstCurrency = preferences.currencies[0];
  return firstCurrency && isCurrencyCode(firstCurrency)
    ? firstCurrency
    : defaultCurrencyCode;
}

function resolveStoredActiveSpaceId(
  spaces: readonly Space[],
  candidate: unknown,
): string {
  if (
    typeof candidate === 'string' &&
    spaces.some((space) => space.id === candidate)
  ) {
    return candidate;
  }

  const fallback =
    spaces.find((space) => space.type === 'personal') ?? spaces[0];
  if (!fallback) {
    throw new Error('El catálogo de espacios guardado no es válido');
  }
  return fallback.id;
}

/** Lectura sin cola: la usan la cola misma y `loadSpaces`. */
async function readSpaces(): Promise<SpacesState> {
  const stored = await AsyncStorage.getItem(spacesStorageKey);

  if (stored === null) {
    const seedCurrency = await resolveSeedCurrency();
    const initialState: SpacesState = {
      activeSpaceId: personalSpace.id,
      spaces: [{ ...personalSpace, currency: seedCurrency }],
    };
    await writeSpaces(initialState, false);
    return initialState;
  }

  const parsed: unknown = JSON.parse(stored);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('El catálogo de espacios guardado no es válido');
  }

  const record = parsed as Record<string, unknown>;

  // Payload v2 vigente: no lee preferencias, valida directamente
  if (record.version === 2) {
    const candidate = parsed as Partial<StoredSpacesState>;
    if (
      !Array.isArray(candidate.spaces) ||
      !candidate.spaces.every(isSpace) ||
      candidate.spaces.length === 0
    ) {
      throw new Error('El catálogo de espacios guardado no es válido');
    }

    const state: SpacesState = {
      activeSpaceId: resolveStoredActiveSpaceId(
        candidate.spaces,
        candidate.activeSpaceId,
      ),
      spaces: candidate.spaces,
    };
    if (state.activeSpaceId !== candidate.activeSpaceId) {
      await writeSpaces(state, false);
    }
    return state;
  }

  // Payload v1 histórico: consulta preferencias para la semilla y persiste versión 2
  if (record.version === 1) {
    const candidate = parsed as Partial<LegacyV1StoredSpacesState>;
    if (
      !Array.isArray(candidate.spaces) ||
      !candidate.spaces.every(isLegacyV1Space) ||
      candidate.spaces.length === 0
    ) {
      throw new Error('El catálogo de espacios guardado no es válido');
    }

    const seedCurrency = await resolveSeedCurrency();
    const migratedSpaces: Space[] = candidate.spaces.map((space) => {
      const rawCurrency = space.currency;
      const currency: CurrencyCode =
        typeof rawCurrency === 'string' && isCurrencyCode(rawCurrency)
          ? rawCurrency
          : seedCurrency;

      return {
        id: space.id,
        name: space.name,
        type: space.type,
        currency,
        ...(space.isAwaitingPartner !== undefined
          ? { isAwaitingPartner: space.isAwaitingPartner }
          : {}),
      };
    });

    const migratedState: SpacesState = {
      activeSpaceId: resolveStoredActiveSpaceId(
        migratedSpaces,
        candidate.activeSpaceId,
      ),
      spaces: migratedSpaces,
    };
    await writeSpaces(migratedState, false);
    return migratedState;
  }

  throw new Error('El catálogo de espacios guardado no es válido');
}

async function writeSpaces(
  state: SpacesState,
  catalogueChanged = true,
): Promise<void> {
  const stored: StoredSpacesState = {
    version: 2,
    activeSpaceId: state.activeSpaceId,
    spaces: [...state.spaces],
  };

  await AsyncStorage.setItem(spacesStorageKey, JSON.stringify(stored));
  if (catalogueChanged) catalogueRevision += 1;
  for (const listener of spacesListeners) {
    try {
      listener(state);
    } catch (error) {
      console.error('[spaces] No se pudo publicar el catálogo local:', error);
    }
  }
}

export function loadSpaces(): Promise<SpacesState> {
  // La siembra y la migración v1 escriben; deben esperar a la cola para no
  // devolver un catálogo que otra escritura en curso va a sustituir.
  return enqueueWrite(readSpaces);
}

export function saveSpaces(state: SpacesState): Promise<void> {
  return enqueueWrite(() => writeSpaces(state));
}

export function getSpacesCatalogueRevision(): number {
  return catalogueRevision;
}

type UpdateSpacesOptions = {
  /**
   * Omite una respuesta remota si el catálogo cambió desde que empezó su
   * petición. Cambiar únicamente la selección activa no invalida la respuesta.
   */
  ifCatalogueRevision?: number;
};

/**
 * Lee, transforma y guarda el catálogo como una sola operación de la cola.
 * Quien fusiona datos remotos debe partir de lo guardado en ese instante, no
 * de una copia en memoria que otra escritura pudo dejar atrás. Si `mutate`
 * devuelve la misma referencia no se escribe nada.
 */
export function updateSpaces(
  mutate: (stored: SpacesState) => SpacesState,
  options: UpdateSpacesOptions = {},
): Promise<SpacesState> {
  return enqueueWrite(async () => {
    const stored = await readSpaces();
    if (
      options.ifCatalogueRevision !== undefined &&
      options.ifCatalogueRevision !== catalogueRevision
    ) {
      return stored;
    }
    const next = mutate(stored);
    if (next !== stored) {
      await writeSpaces(next, next.spaces !== stored.spaces);
    }
    return next;
  });
}

/**
 * Mantiene sincronizadas las copias en memoria con cualquier escritura del
 * catálogo, incluida una restauración iniciada fuera de `useSpaces`.
 */
export function subscribeToSpaces(
  listener: (state: SpacesState) => void,
): () => void {
  spacesListeners.add(listener);
  return () => spacesListeners.delete(listener);
}

export function createSpaceId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `space-${time}-${random}`;
}

export const localSpaceStorage = {
  key: spacesStorageKey,
};
