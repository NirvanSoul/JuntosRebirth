import { createContext, useContext, useSyncExternalStore } from 'react';

import type { PreviewActionTarget } from '@/components/overlays/PreviewActions/previewActions';

/** Acción de la pulsación larga que abre la selección de varias tarjetas. */
export type PreviewSelectionMode = 'copy' | 'delete';

export type PreviewSelection = {
  kind: PreviewActionTarget['kind'];
  mode: PreviewSelectionMode;
  ids: readonly string[];
};

/**
 * Cómo pinta una tarjeta la selección: `off` fuera de ella, `disabled` si la
 * acción elegida no se aplica a esa tarjeta o ya hay marcada otra con su
 * misma clave.
 */
export type PreviewSelectionStatus =
  'off' | 'disabled' | 'selected' | 'unselected';

/**
 * Clave de la tarjeta para la acción elegida, o `null` si no la admite. Dos
 * tarjetas con la misma clave no se marcan a la vez: al copiar, todas las
 * repeticiones de una serie son la misma copia.
 */
type ResolveSelectionKey = (
  kind: PreviewActionTarget['kind'],
  id: string,
  mode: PreviewSelectionMode,
) => string | null;

export type PreviewSelectionStore = ReturnType<
  typeof createPreviewSelectionStore
>;

/**
 * Estado externo de la selección: cada tarjeta se suscribe solo a su propio
 * estado, así marcar una no repinta las demás.
 */
export function createPreviewSelectionStore() {
  let selection: PreviewSelection | null = null;
  let resolveKey: ResolveSelectionKey = () => null;
  // La clave de cada tarjeta se resuelve una vez por selección.
  let keys = new Map<string, string | null>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  const keyOf = (id: string): string | null => {
    if (!selection) return null;
    let key = keys.get(id);
    if (key === undefined) {
      key = resolveKey(selection.kind, id, selection.mode);
      keys.set(id, key);
    }
    return key;
  };
  // Marcada no, pero otra con su misma clave sí.
  const isTaken = (id: string): boolean => {
    const key = keyOf(id);
    return (
      selection !== null &&
      !selection.ids.includes(id) &&
      selection.ids.some((other) => keyOf(other) === key)
    );
  };

  return {
    getSelection: () => selection,
    getStatus: (
      kind: PreviewActionTarget['kind'],
      id: string | undefined,
    ): PreviewSelectionStatus => {
      if (!selection || selection.kind !== kind) return 'off';
      if (id === undefined || keyOf(id) === null || isTaken(id)) {
        return 'disabled';
      }
      return selection.ids.includes(id) ? 'selected' : 'unselected';
    },
    setResolveKey: (next: ResolveSelectionKey) => {
      resolveKey = next;
    },
    start: (next: PreviewSelection) => {
      selection = next;
      keys = new Map();
      emit();
    },
    clear: () => {
      if (!selection) return;
      selection = null;
      emit();
    },
    toggle: (id: string) => {
      if (!selection || keyOf(id) === null || isTaken(id)) return;
      const ids = selection.ids.includes(id)
        ? selection.ids.filter((current) => current !== id)
        : [...selection.ids, id];
      selection = { ...selection, ids };
      emit();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const PreviewSelectionContext =
  createContext<PreviewSelectionStore | null>(null);

const noopSubscribe = () => () => undefined;

/** Si hay una selección abierta; el menú principal se retira mientras dure. */
export function useIsPreviewSelecting(): boolean {
  const store = useContext(PreviewSelectionContext);
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => (store?.getSelection() ?? null) !== null,
  );
}

/** Selección activa completa; para quien pinta la barra de la selección. */
export function usePreviewSelectionState(
  store: PreviewSelectionStore,
): PreviewSelection | null {
  return useSyncExternalStore(store.subscribe, store.getSelection);
}

/**
 * Estado de una tarjeta en la selección múltiple y cómo marcarla. Sin `id`
 * (un grupo plegado, por ejemplo) la tarjeta queda desactivada mientras dure.
 */
export function usePreviewSelection(
  kind: PreviewActionTarget['kind'],
  id: string | undefined,
) {
  const store = useContext(PreviewSelectionContext);
  const status = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getStatus(kind, id) ?? 'off',
  );
  const mode = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getSelection()?.mode,
  );

  return {
    mode,
    status,
    toggle: () => {
      if (id !== undefined) store?.toggle(id);
    },
  };
}
