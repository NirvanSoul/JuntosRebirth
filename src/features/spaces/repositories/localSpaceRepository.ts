import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initialSpacesState,
  type Space,
  type SpacesState,
} from '@/features/spaces/types';

const spacesStorageKey = '@juntoss/spaces/v1';

type StoredSpacesState = {
  version: 1;
  activeSpaceId: string;
  spaces: Space[];
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
      candidate.type === 'other')
  );
}

function parseStoredSpaces(value: string): SpacesState {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('El catálogo de espacios guardado no es válido');
  }

  const candidate = parsed as Partial<StoredSpacesState>;
  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.spaces) ||
    !candidate.spaces.every(isSpace) ||
    typeof candidate.activeSpaceId !== 'string' ||
    !candidate.spaces.some((space) => space.id === candidate.activeSpaceId)
  ) {
    throw new Error('El catálogo de espacios guardado no es válido');
  }

  return {
    activeSpaceId: candidate.activeSpaceId,
    spaces: candidate.spaces,
  };
}

export async function loadSpaces(): Promise<SpacesState> {
  const stored = await AsyncStorage.getItem(spacesStorageKey);

  return stored === null ? initialSpacesState : parseStoredSpaces(stored);
}

export async function saveSpaces(state: SpacesState): Promise<void> {
  const stored: StoredSpacesState = {
    version: 1,
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
