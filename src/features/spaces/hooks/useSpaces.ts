import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { createSupabaseInvitationGateway } from '@/features/spaces/gateways/supabaseInvitationGateway';
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
import {
  defaultCurrencyCode,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';
import { loadCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

const maxSpaceNameLength = 40;
const defaultCoupleSpaceName = 'Juntos';

type SpacesController = {
  activeSpace: Space;
  createCoupleSpace: (name?: string) => Promise<Space>;
  createSpace: (name: string) => Promise<Space>;
  dissolveCoupleSpace: () => Promise<void>;
  error: string | null;
  isReady: boolean;
  refreshCoupleSpace: () => Promise<void>;
  selectSpace: (spaceId: string) => Promise<void>;
  spaces: readonly Space[];
};

/**
 * Lee el espacio de pareja activo del usuario directamente sobre `spaces`
 * (sin RPC dedicado: RLS ya restringe la fila a membresías activas). Como
 * mucho hay uno, por el índice único de "un espacio juntos por usuario"
 * aplicado en el servidor.
 */
async function fetchRemoteCoupleSpace(): Promise<Space | null> {
  const client = getConfiguredSupabaseClient();
  const { data, error } = await client
    .from('spaces')
    .select('id, name, type, activated_at, currency')
    .eq('type', 'couple')
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('No pudimos comprobar tu espacio de pareja.');
  }
  if (!data) return null;

  if (typeof data.currency !== 'string' || !isCurrencyCode(data.currency)) {
    throw new Error(
      `[useSpaces] Moneda no reconocida en espacio de pareja remoto: ${data.currency}`,
    );
  }

  return {
    id: data.id as string,
    name: data.name as string,
    type: 'couple',
    currency: data.currency as CurrencyCode,
    // `activated_at` es null mientras la invitación siga sin aceptar; en cuanto
    // la otra persona entra, esta misma consulta devuelve la fecha y el espacio
    // se comporta como cualquier otro.
    isAwaitingPartner: data.activated_at === null,
  };
}

/**
 * Fusiona el espacio de pareja remoto (o su ausencia) con el catálogo local.
 * Si existe uno remoto, reemplaza o añade la entrada local `type: 'couple'`.
 * Si no existe (nunca se creó, o se disolvió), retira cualquier entrada
 * local `couple` que hubiera quedado obsoleta, cayendo al espacio Personal
 * si esa era la selección activa. Devuelve la misma referencia de `current`
 * cuando no hay nada que cambiar, para que el llamador sepa si debe
 * persistir.
 */
function mergeRemoteCoupleSpace(
  current: SpacesState,
  remoteSpace: Space | null,
): SpacesState {
  const localCoupleSpace = current.spaces.find(
    (space) => space.type === 'couple',
  );

  if (remoteSpace) {
    if (
      localCoupleSpace &&
      localCoupleSpace.id === remoteSpace.id &&
      localCoupleSpace.name === remoteSpace.name &&
      localCoupleSpace.currency === remoteSpace.currency &&
      (localCoupleSpace.isAwaitingPartner ?? false) ===
        remoteSpace.isAwaitingPartner
    ) {
      return current;
    }

    const withoutStaleCouple = current.spaces.filter(
      (space) => space.type !== 'couple' || space.id === remoteSpace.id,
    );
    const alreadyPresent = withoutStaleCouple.some(
      (space) => space.id === remoteSpace.id,
    );
    const nextSpaces = alreadyPresent
      ? withoutStaleCouple.map((space) =>
          space.id === remoteSpace.id ? remoteSpace : space,
        )
      : [...withoutStaleCouple, remoteSpace];

    return { ...current, spaces: nextSpaces };
  }

  if (!localCoupleSpace) {
    return current;
  }

  const nextSpaces = current.spaces.filter(
    (space) => space.id !== localCoupleSpace.id,
  );
  const nextActiveSpaceId =
    current.activeSpaceId === localCoupleSpace.id
      ? personalSpace.id
      : current.activeSpaceId;

  return { activeSpaceId: nextActiveSpaceId, spaces: nextSpaces };
}

export function useSpaces(): SpacesController {
  const [state, setState] = useState<SpacesState>(initialSpacesState);
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady: isAuthReady, session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const stateRef = useRef(state);
  stateRef.current = state;

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

  const refreshCoupleSpace = useCallback(async (): Promise<void> => {
    if (!userId) return;

    let remoteSpace: Space | null;
    try {
      remoteSpace = await fetchRemoteCoupleSpace();
    } catch (caught) {
      // Si es un error de integridad (moneda no reconocida), se registra y se fija el error
      if (caught instanceof Error && caught.message.includes('[useSpaces]')) {
        console.error(
          '[useSpaces] Error de integridad en espacio remoto:',
          caught,
        );
        setError(
          'No pudimos comprobar tu espacio de pareja por un error de integridad.',
        );
        return;
      }
      // Un hipo de red transitorio al comprobar el espacio de pareja no debe bloquear
      // el resto de la app: se reintenta en la siguiente sincronización.
      return;
    }

    const merged = mergeRemoteCoupleSpace(stateRef.current, remoteSpace);
    if (merged === stateRef.current) return;

    try {
      await saveSpaces(merged);
    } catch {
      // El catálogo local sigue siendo válido; se reintentará más adelante.
      return;
    }
    setState(merged);
  }, [userId]);

  useEffect(() => {
    if (!isReady || !isAuthReady) return;
    void refreshCoupleSpace();
  }, [isReady, isAuthReady, refreshCoupleSpace]);

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

      const preferences = await loadCurrencyPreferences();
      const spaceCurrency =
        preferences.currencies[0] && isCurrencyCode(preferences.currencies[0])
          ? preferences.currencies[0]
          : defaultCurrencyCode;

      const space: Space = {
        id: createSpaceId(),
        name,
        type: 'other',
        currency: spaceCurrency,
      };
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

  const createCoupleSpace = useCallback(
    async (rawName?: string): Promise<Space> => {
      if (!session) {
        throw new Error('Inicia sesión para crear un espacio de pareja.');
      }

      const name = rawName?.trim() || defaultCoupleSpaceName;
      const preferences = await loadCurrencyPreferences();
      const spaceCurrency =
        preferences.currencies[0] && isCurrencyCode(preferences.currencies[0])
          ? preferences.currencies[0]
          : defaultCurrencyCode;

      const gateway = createSupabaseInvitationGateway();
      let spaceId: string;
      try {
        ({ spaceId } = await gateway.createCoupleSpace(name, spaceCurrency));
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'No pudimos crear el espacio de pareja.';
        setError(message);
        throw new Error(message);
      }

      // Nace pendiente: `create_couple_space` guarda `activated_at = null` y
      // el espacio no es utilizable hasta que la otra persona acepte.
      const newSpace: Space = {
        id: spaceId,
        name,
        type: 'couple',
        currency: spaceCurrency,
        isAwaitingPartner: true,
      };
      const nextState: SpacesState = {
        activeSpaceId: newSpace.id,
        spaces: [
          ...state.spaces.filter((space) => space.type !== 'couple'),
          newSpace,
        ],
      };

      try {
        await saveSpaces(nextState);
      } catch {
        const message =
          'No pudimos guardar el espacio de pareja. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setState(nextState);
      setError(null);

      return newSpace;
    },
    [session, state],
  );

  const dissolveCoupleSpace = useCallback(async (): Promise<void> => {
    const coupleSpaceEntry = state.spaces.find(
      (space) => space.type === 'couple',
    );
    if (!coupleSpaceEntry) return;

    if (!session) {
      throw new Error('Inicia sesión para eliminar el espacio de pareja.');
    }

    const gateway = createSupabaseInvitationGateway();
    try {
      await gateway.dissolveCoupleSpace(coupleSpaceEntry.id);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'No pudimos eliminar el espacio de pareja.';
      setError(message);
      throw new Error(message);
    }

    const nextSpaces = state.spaces.filter(
      (space) => space.id !== coupleSpaceEntry.id,
    );
    const nextActiveSpaceId =
      state.activeSpaceId === coupleSpaceEntry.id
        ? personalSpace.id
        : state.activeSpaceId;
    const nextState: SpacesState = {
      activeSpaceId: nextActiveSpaceId,
      spaces: nextSpaces,
    };

    try {
      await saveSpaces(nextState);
    } catch {
      const message =
        'Eliminamos el espacio, pero no pudimos actualizar tus espacios locales. Cierra y vuelve a abrir Juntos.';
      setError(message);
      throw new Error(message);
    }
    setState(nextState);
    setError(null);
  }, [session, state]);

  return {
    activeSpace,
    createCoupleSpace,
    createSpace,
    dissolveCoupleSpace,
    error,
    isReady,
    refreshCoupleSpace,
    selectSpace,
    spaces: state.spaces,
  };
}
