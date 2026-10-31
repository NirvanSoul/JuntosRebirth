import { Portal } from '@gorhom/portal';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler } from 'react-native';

import {
  CopyToSpaceModal,
  type CopyToSpaceRequest,
} from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import {
  PreviewActionsContext,
  previewActionsHostName,
  type OpenPreviewActions,
  type PreviewAction,
  type PreviewActionSubject,
  type PreviewActionTarget,
} from '@/components/overlays/PreviewActions/previewActions';
import type { PreviewAnchor } from '@/components/overlays/PreviewActions/previewActionsLayout';
import { PreviewActionsOverlay } from '@/components/overlays/PreviewActions/PreviewActionsOverlay';
import { PreviewSelectionBar } from '@/components/overlays/PreviewActions/PreviewSelectionBar';
import {
  createPreviewSelectionStore,
  PreviewSelectionContext,
  usePreviewSelectionState,
  type PreviewSelectionMode,
} from '@/components/overlays/PreviewActions/previewSelection';
import {
  SpaceMembershipScope,
  useSpaceMembership,
} from '@/features/profile/state/SpaceMembershipContext';
import { useStableCallback } from '@/hooks/useStableCallback';
import { triggerHaptic } from '@/lib/haptics/haptics';
import {
  CurrencySymbolPreferenceScope,
  useCurrencySymbolPreference,
} from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

type PreviewActionsLayerProps = {
  children: ReactNode;
  /** Acciones disponibles para los elementos, o `null` si no admiten ninguna. */
  resolveActions: (
    subject: PreviewActionSubject,
  ) => readonly PreviewAction[] | null;
};

type OpenRequest = {
  actions: readonly PreviewAction[];
  anchor: PreviewAnchor;
  /** Cambia en cada apertura para repetir la animación de entrada. */
  key: number;
  preview: ReactNode;
  /** Eliminar y copiar abren la selección múltiple en vez de actuar ya. */
  selectable: boolean;
  target: PreviewActionTarget;
};

/** Acciones que, sobre una tarjeta horizontal, abren la selección múltiple. */
function isSelectionMode(key: string): key is PreviewSelectionMode {
  return key === 'copy' || key === 'delete';
}

type ConfirmAction = Extract<PreviewAction, { kind: 'confirm' }>;

/**
 * Hace que las tarjetas de vista previa respondan a una pulsación larga con
 * la superposición de acciones. La superposición se pinta en un portal de la
 * raíz, así que reinyecta los contextos que la copia de la tarjeta necesita.
 *
 * En una tarjeta horizontal, eliminar o copiar abren la selección múltiple:
 * la tarjeta queda marcada, las demás del mismo tipo se pueden marcar y una
 * barra inferior lanza la acción sobre todas.
 */
export function PreviewActionsLayer({
  children,
  resolveActions,
}: PreviewActionsLayerProps) {
  const currencySymbolPreference = useCurrencySymbolPreference();
  const membership = useSpaceMembership();
  const [request, setRequest] = useState<OpenRequest | null>(null);
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [copyRequest, setCopyRequest] = useState<CopyToSpaceRequest | null>(
    null,
  );
  const [isCopyVisible, setCopyVisible] = useState(false);
  const [selectionStore] = useState(createPreviewSelectionStore);
  const selection = usePreviewSelectionState(selectionStore);
  const [selectionConfirming, setSelectionConfirming] =
    useState<ConfirmAction | null>(null);
  // Icono de la acción elegida, para repetirlo en la barra.
  const [selectionIcon, setSelectionIcon] = useState<PreviewAction['icon']>();
  // Una tarjeta entra en la selección si admite la acción elegida.
  selectionStore.setResolveKey((kind, id, mode) => {
    const action = resolveActions({ kind, ids: [id] })?.find(
      (current) => current.key === mode,
    );
    return action ? (action.selectionKey ?? id) : null;
  });

  const open = useStableCallback<Parameters<OpenPreviewActions>, void>(
    (target, anchor, renderPreview, selectable) => {
      if (selectionStore.getSelection()) return;
      const actions = resolveActions({ kind: target.kind, ids: [target.id] });
      if (!actions || actions.length === 0) return;
      triggerHaptic('previewActionsOpen');
      setConfirming(null);
      setRequest((current) => ({
        actions,
        anchor,
        key: (current?.key ?? 0) + 1,
        preview: renderPreview(),
        selectable,
        target,
      }));
    },
  );
  const close = useCallback(() => {
    setRequest(null);
    setConfirming(null);
  }, []);
  const clearSelection = useCallback(() => {
    selectionStore.clear();
    setSelectionConfirming(null);
  }, [selectionStore]);

  const isOpen = request !== null;
  const isSelecting = selection !== null;
  useEffect(() => {
    if (!isOpen && !isSelecting) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isOpen) close();
        else clearSelection();
        return true;
      },
    );
    return () => subscription.remove();
  }, [clearSelection, close, isOpen, isSelecting]);

  const openCopyRequest = (copy: CopyToSpaceRequest) => {
    setCopyRequest(copy);
    setCopyVisible(true);
  };
  // Acción de la barra sobre lo marcado; `undefined` si no se puede lanzar.
  const selectionAction =
    selection && selection.ids.length > 0
      ? resolveActions({ kind: selection.kind, ids: selection.ids })?.find(
          (action) => action.key === selection.mode,
        )
      : undefined;
  const submitSelection = () => {
    if (selectionAction?.kind === 'confirm') {
      setSelectionConfirming(selectionAction);
    } else if (selectionAction?.kind === 'copyToSpace') {
      const copy = selectionAction.request;
      openCopyRequest({
        ...copy,
        onSelect: async (targetSpaceId) => {
          const succeeded = await copy.onSelect(targetSpaceId);
          if (succeeded) clearSelection();
          return succeeded;
        },
      });
    }
  };

  const handleSelect = (action: PreviewAction) => {
    if (request?.selectable && isSelectionMode(action.key)) {
      close();
      triggerHaptic('categorySelect');
      selectionStore.start({
        ids: [request.target.id],
        kind: request.target.kind,
        mode: action.key,
      });
      setSelectionIcon(() => action.icon);
      return;
    }
    switch (action.kind) {
      case 'run':
        close();
        action.onPress();
        return;
      case 'confirm':
        setConfirming(action);
        return;
      case 'copyToSpace':
        close();
        openCopyRequest(action.request);
        return;
    }
  };

  return (
    <PreviewActionsContext.Provider value={open}>
      <PreviewSelectionContext.Provider value={selectionStore}>
        {children}
      </PreviewSelectionContext.Provider>
      <Portal hostName={previewActionsHostName}>
        <CurrencySymbolPreferenceScope value={currencySymbolPreference}>
          <SpaceMembershipScope value={membership}>
            {request ? (
              <PreviewActionsOverlay
                actions={request.actions}
                anchor={request.anchor}
                confirming={confirming}
                key={request.key}
                onCancelConfirmation={() => setConfirming(null)}
                onClose={close}
                onConfirm={() => {
                  const action = confirming;
                  close();
                  action?.onConfirm();
                }}
                onSelect={handleSelect}
                preview={request.preview}
              />
            ) : null}
            {/* Baja mientras el selector de espacio está abierto para no
                taparlo; cerrarlo sin copiar conserva lo marcado. */}
            {selection && selectionIcon && !isCopyVisible ? (
              <PreviewSelectionBar
                confirmation={selectionConfirming?.confirmation ?? null}
                count={selection.ids.length}
                icon={selectionIcon}
                mode={selection.mode}
                onCancel={clearSelection}
                onCancelConfirmation={() => setSelectionConfirming(null)}
                onConfirm={() => {
                  const action = selectionConfirming;
                  clearSelection();
                  action?.onConfirm();
                }}
                onSubmit={submitSelection}
                submitDisabled={!selectionAction}
              />
            ) : null}
          </SpaceMembershipScope>
        </CurrencySymbolPreferenceScope>
      </Portal>
      {copyRequest ? (
        <CopyToSpaceModal
          {...copyRequest}
          onClose={() => setCopyVisible(false)}
          testID="preview-actions-space-picker-modal"
          visible={isCopyVisible}
        />
      ) : null}
    </PreviewActionsContext.Provider>
  );
}
