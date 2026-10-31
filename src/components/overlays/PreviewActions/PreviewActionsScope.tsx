import { useContext, type ReactNode } from 'react';

import {
  PreviewActionsContext,
  type OpenPreviewActions,
} from '@/components/overlays/PreviewActions/previewActions';
import {
  PreviewSelectionContext,
  type PreviewSelectionStore,
} from '@/components/overlays/PreviewActions/previewSelection';

type PreviewActionsScopeValue = {
  open: OpenPreviewActions | null;
  selection: PreviewSelectionStore | null;
};

/** Contexto de la pulsación larga y la selección múltiple donde se lee. */
export function usePreviewActionsScope(): PreviewActionsScopeValue {
  return {
    open: useContext(PreviewActionsContext),
    selection: useContext(PreviewSelectionContext),
  };
}

/**
 * Reinyecta ese contexto bajo un portal (p. ej. una hoja), que lo pierde: así
 * las tarjetas de dentro vuelven a abrir sus acciones y a seleccionarse.
 */
export function PreviewActionsScope({
  children,
  value,
}: {
  children: ReactNode;
  value: PreviewActionsScopeValue;
}) {
  return (
    <PreviewActionsContext.Provider value={value.open}>
      <PreviewSelectionContext.Provider value={value.selection}>
        {children}
      </PreviewSelectionContext.Provider>
    </PreviewActionsContext.Provider>
  );
}
