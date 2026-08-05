import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createSpaceId,
  loadSpaces,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import {
  initialSpacesState,
  personalSpace,
  type Space,
  type SpacesState,
} from '@/features/spaces/types';

const maxSpaceNameLength = 40;

type SpacesController = {
  activeSpace: Space;
  createSpace: (name: string) => Promise<Space>;
  error: string | null;
  isReady: boolean;
  selectSpace: (spaceId: string) => Promise<void>;
  spaces: readonly Space[];
};

export function useSpaces(): SpacesController {
  const [state, setState] = useState<SpacesState>(initialSpacesState);
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadSpaces()
      .then((stored) => {
        if (isMounted) {
          setState(stored);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No pudimos recuperar tus espacios.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSpace = useMemo(
    () =>
      state.spaces.find((space) => space.id === state.activeSpaceId) ??
      personalSpace,
    [state.activeSpaceId, state.spaces],
  );

  const createSpace = useCallback(
    async (rawName: string): Promise<Space> => {
      const name = rawName.trim();
      if (name.length === 0) {
        throw new Error('Escribe un nombre para el espacio.');
      }
      if (name.length > maxSpaceNameLength) {
        throw new Error(
          `El nombre no puede superar ${maxSpaceNameLength} caracteres.`,
        );
      }
      if (
        state.spaces.some(
          (space) =>
            space.name.toLocaleLowerCase('es-ES') ===
            name.toLocaleLowerCase('es-ES'),
        )
      ) {
        throw new Error('Ya existe un espacio con ese nombre.');
      }

      const space: Space = { id: createSpaceId(), name, type: 'other' };
      const nextState: SpacesState = {
        activeSpaceId: space.id,
        spaces: [...state.spaces, space],
      };

      try {
        await saveSpaces(nextState);
      } catch {
        const message = 'No pudimos guardar el espacio. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setState(nextState);
      setError(null);

      return space;
    },
    [state],
  );

  const selectSpace = useCallback(
    async (spaceId: string): Promise<void> => {
      if (!state.spaces.some((space) => space.id === spaceId)) {
        throw new Error('El espacio seleccionado no existe.');
      }

      const nextState = { ...state, activeSpaceId: spaceId };
      try {
        await saveSpaces(nextState);
      } catch {
        const message = 'No pudimos guardar el cambio. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setState(nextState);
      setError(null);
    },
    [state],
  );

  return {
    activeSpace,
    createSpace,
    error,
    isReady,
    selectSpace,
    spaces: state.spaces,
  };
}
