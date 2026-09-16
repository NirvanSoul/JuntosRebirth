import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { createJuntossInvitationGateway } from '@/features/spaces/gateways/juntossInvitationGateway';
import { useCancelPendingCoupleInvitation } from '@/features/spaces/hooks/useCancelPendingCoupleInvitation';
import {
  createSpaceId,
  getSpacesCatalogueRevision,
  loadSpaces,
  subscribeToSpaces,
  updateSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import {
  initialSpacesState,
  personalSpace,
  resolvePersonalSpaceId,
  type Space,
  type SpacesState,
} from '@/features/spaces/types';
import { projectSpacesForSession } from '@/features/spaces/utils/sessionSpaceProjection';
import {
  fetchRemoteCoupleSpace,
  RemoteSpaceIntegrityError,
  remoteSpaceIntegrityErrorMessage,
} from '@/features/spaces/utils/remoteCoupleSpace';
import {
  defaultCurrencyCode,
  isCurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { loadCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

const maxSpaceNameLength = 40;
const defaultCoupleSpaceName = 'Juntos';

type SpacesController = {
  activeSpace: Space;
  cancelPendingCoupleInvitation: () => Promise<void>;
  createCoupleSpaceInvitation: (
    inviteeEmail: string,
    name?: string,
  ) => Promise<Space>;
  createSpace: (name: string) => Promise<Space>;
  leaveCoupleSpace: () => Promise<void>;
  error: string | null;
  isReady: boolean;
  reloadSpaces: () => Promise<void>;
  refreshCoupleSpace: () => Promise<void>;
  selectSpace: (spaceId: string) => Promise<void>;
  spaces: readonly Space[];
};

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
      ? resolvePersonalSpaceId(nextSpaces)
      : current.activeSpaceId;

  return { activeSpaceId: nextActiveSpaceId, spaces: nextSpaces };
}

export function useSpaces(): SpacesController {
  const [state, setState] = useState<SpacesState>(initialSpacesState);
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady: isAuthReady, session } = useAuthSession();
  const userId = session?.user.id ?? null;

  useEffect(
    () =>
      subscribeToSpaces((stored) => {
        setState(stored);
      }),
    [],
  );

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

    const catalogueRevision = getSpacesCatalogueRevision();
    let remoteSpace: Space | null;
    try {
      remoteSpace = await fetchRemoteCoupleSpace();
    } catch (caught) {
      // Si es un error de integridad (moneda no reconocida), se registra y se fija el error
      if (caught instanceof RemoteSpaceIntegrityError) {
        console.error(
          '[useSpaces] Error de integridad en espacio remoto:',
          caught,
        );
        setError(remoteSpaceIntegrityErrorMessage);
        return;
      }
      // Un hipo de red transitorio al comprobar el espacio de pareja no debe bloquear
      // el resto de la app: se reintenta en la siguiente sincronización.
      return;
    }

    // Si la consulta fue exitosa, limpiamos solo el error de integridad si estaba activo
    setError((currentError) =>
      currentError === remoteSpaceIntegrityErrorMessage ? null : currentError,
    );

    // Se fusiona sobre lo guardado, no sobre el estado en memoria: el snapshot
    // puede haber reescrito el catálogo mientras esta petición estaba en vuelo.
    try {
      await updateSpaces(
        (stored) => mergeRemoteCoupleSpace(stored, remoteSpace),
        { ifCatalogueRevision: catalogueRevision },
      );
    } catch {
      return; // El catálogo local sigue siendo válido; se reintentará.
    }
  }, [userId]);

  const reloadSpaces = useCallback(async (): Promise<void> => {
    const stored = await loadSpaces();
    setState(stored);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthReady) return;
    // `refreshCoupleSpace` solo actualiza estado tras un `await` de red; el
    // análisis estático no distingue esa frontera asíncrona del cuerpo
    // síncrono del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCoupleSpace();
  }, [isReady, isAuthReady, refreshCoupleSpace]);

  const sessionSpacesState = useMemo(
    () => projectSpacesForSession(state, userId),
    [state, userId],
  );
  const activeSpace = useMemo(
    () =>
      sessionSpacesState.spaces.find(
        (space) => space.id === sessionSpacesState.activeSpaceId,
      ) ??
      sessionSpacesState.spaces.find((space) => space.type === 'personal') ??
      personalSpace,
    [sessionSpacesState],
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
      const firstCurrency = preferences.currencies[0];
      const spaceCurrency =
        firstCurrency && isCurrencyCode(firstCurrency)
          ? firstCurrency
          : defaultCurrencyCode;

      const space: Space = {
        id: createSpaceId(),
        name,
        type: 'other',
        currency: spaceCurrency,
      };
      try {
        await updateSpaces((stored) => {
          if (
            stored.spaces.some(
              (entry) =>
                entry.name.toLocaleLowerCase('es-ES') ===
                name.toLocaleLowerCase('es-ES'),
            )
          ) {
            throw new Error('Ya existe un espacio con ese nombre.');
          }
          return {
            activeSpaceId: space.id,
            spaces: [...stored.spaces, space],
          };
        });
      } catch (caught) {
        const message =
          caught instanceof Error &&
          caught.message === 'Ya existe un espacio con ese nombre.'
            ? caught.message
            : 'No pudimos guardar el espacio. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setError(null);

      return space;
    },
    [state],
  );

  const selectSpace = useCallback(async (spaceId: string): Promise<void> => {
    try {
      await updateSpaces((stored) => {
        if (!stored.spaces.some((space) => space.id === spaceId)) {
          throw new Error('El espacio seleccionado no existe.');
        }

        return stored.activeSpaceId === spaceId
          ? stored
          : { ...stored, activeSpaceId: spaceId };
      });
    } catch (caught) {
      if (
        caught instanceof Error &&
        caught.message === 'El espacio seleccionado no existe.'
      ) {
        throw caught;
      }
      const message = 'No pudimos guardar el cambio. Inténtalo de nuevo.';
      setError(message);
      throw new Error(message);
    }
    setError(null);
  }, []);

  const createCoupleSpaceInvitation = useCallback(
    async (inviteeEmail: string, rawName?: string): Promise<Space> => {
      if (!session) {
        throw new Error('Inicia sesión para crear un espacio de pareja.');
      }

      const name = rawName?.trim() || defaultCoupleSpaceName;
      const preferences = await loadCurrencyPreferences();
      const firstCurrency = preferences.currencies[0];
      const spaceCurrency =
        firstCurrency && isCurrencyCode(firstCurrency)
          ? firstCurrency
          : defaultCurrencyCode;

      const gateway = createJuntossInvitationGateway();
      let spaceId: string;
      try {
        ({ spaceId } = await gateway.createCoupleSpaceInvitation(
          name,
          spaceCurrency,
          inviteeEmail,
        ));
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'No pudimos crear el espacio y enviar la invitación.';
        setError(message);
        throw caught instanceof Error ? caught : new Error(message);
      }

      // Aunque son dos peticiones remotas, solo después de recibir ambos
      // identificadores se expone la espera en la UI.
      const newSpace: Space = {
        id: spaceId,
        name,
        type: 'couple',
        currency: spaceCurrency,
        isAwaitingPartner: true,
      };
      try {
        await updateSpaces((stored) => ({
          activeSpaceId: newSpace.id,
          spaces: [
            ...stored.spaces.filter((space) => space.type !== 'couple'),
            newSpace,
          ],
        }));
      } catch {
        const message =
          'La invitación se envió, pero no pudimos actualizar tus espacios locales. Cierra y vuelve a abrir Juntos.';
        setError(message);
        throw new Error(message);
      }
      setError(null);

      return newSpace;
    },
    [session],
  );

  const leaveCoupleSpace = useCallback(async (): Promise<void> => {
    const coupleSpaceEntry = state.spaces.find(
      (space) => space.type === 'couple',
    );
    if (!coupleSpaceEntry) return;

    if (!session) {
      throw new Error('Inicia sesión para salir del espacio de pareja.');
    }

    const gateway = createJuntossInvitationGateway();
    try {
      await gateway.leaveCoupleSpace(coupleSpaceEntry.id);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'No pudimos salir del espacio de pareja.';
      setError(message);
      throw new Error(message);
    }

    try {
      await updateSpaces((stored) => {
        const nextSpaces = stored.spaces.filter(
          (space) => space.id !== coupleSpaceEntry.id,
        );
        if (nextSpaces.length === stored.spaces.length) return stored;
        return {
          activeSpaceId:
            stored.activeSpaceId === coupleSpaceEntry.id
              ? resolvePersonalSpaceId(nextSpaces)
              : stored.activeSpaceId,
          spaces: nextSpaces,
        };
      });
    } catch {
      const message =
        'Saliste del espacio, pero no pudimos actualizar tus espacios locales. Cierra y vuelve a abrir Juntos.';
      setError(message);
      throw new Error(message);
    }
    setError(null);
  }, [session, state]);

  const cancelPendingCoupleInvitation = useCancelPendingCoupleInvitation({
    hasSession: session !== null,
    setError,
    setState,
    state,
  });

  return {
    activeSpace,
    cancelPendingCoupleInvitation,
    createCoupleSpaceInvitation,
    createSpace,
    leaveCoupleSpace,
    error,
    isReady,
    reloadSpaces,
    refreshCoupleSpace,
    selectSpace,
    spaces: sessionSpacesState.spaces,
  };
}
