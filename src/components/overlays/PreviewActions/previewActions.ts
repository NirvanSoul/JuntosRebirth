import {
  createContext,
  useContext,
  useRef,
  type ComponentRef,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { AccessibilityActionEvent, View } from 'react-native';

import type { CopyToSpaceRequest } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import type { PreviewAnchor } from '@/components/overlays/PreviewActions/previewActionsLayout';

/**
 * Host del portal de la superposición. Va en la raíz, hermano de las hojas,
 * para quedar por encima de ellas cuando la tarjeta pulsada vive en una.
 */
export const previewActionsHostName = 'preview-actions';

/** Elemento sobre el que actúa la pulsación larga de una tarjeta de vista previa. */
export type PreviewActionTarget = {
  kind: 'category' | 'moneyAccount' | 'transaction';
  id: string;
};

/**
 * Elementos sobre los que se resuelven las acciones: uno tras la pulsación
 * larga o varios del mismo tipo en la selección múltiple.
 */
export type PreviewActionSubject = {
  kind: PreviewActionTarget['kind'];
  ids: readonly string[];
};

type PreviewActionBase = {
  key: string;
  accessibilityLabel: string;
  icon: ComponentType<{ color: string; size: number }>;
  /**
   * En la selección múltiple, tarjetas con la misma clave no se marcan a la
   * vez. Sin ella, cada tarjeta es independiente.
   */
  selectionKey?: string;
};

/**
 * Acción flotante de la superposición. `confirm` pide confirmación en la
 * propia superposición y `copyToSpace` abre el selector de espacio de destino.
 */
export type PreviewAction = PreviewActionBase &
  (
    | { kind: 'run'; onPress: () => void }
    | {
        kind: 'confirm';
        confirmation: { title: string; description: string };
        onConfirm: () => void;
      }
    | { kind: 'copyToSpace'; request: CopyToSpaceRequest }
  );

export type OpenPreviewActions = (
  target: PreviewActionTarget,
  anchor: PreviewAnchor,
  renderPreview: () => ReactNode,
  /** Eliminar y copiar abren la selección múltiple en vez de actuar sobre una. */
  selectable: boolean,
) => void;

/**
 * Solo publica la función de apertura, con identidad fija: abrir o cerrar la
 * superposición no vuelve a pintar las tarjetas que la consumen.
 */
export const PreviewActionsContext = createContext<OpenPreviewActions | null>(
  null,
);

const longPressActionName = 'longpress';
const accessibilityActions = [
  { name: longPressActionName, label: 'Mostrar acciones' },
] as const;

/**
 * Props que una tarjeta reparte en su `Pressable` para abrir sus acciones con
 * una pulsación larga. Sin proveedor o sin `target` devuelve `null` y la
 * tarjeta se comporta como antes.
 *
 * `renderPreview` pinta la copia elevada de la tarjeta; se llama al abrir.
 * Las tarjetas horizontales pasan `selectable` para que eliminar y copiar
 * abran la selección múltiple.
 */
export function usePreviewActionsTrigger(
  target: PreviewActionTarget | undefined,
  renderPreview: () => ReactNode,
  { selectable = false }: { selectable?: boolean } = {},
) {
  const open = useContext(PreviewActionsContext);
  const ref = useRef<ComponentRef<typeof View>>(null);
  if (!open || !target) return null;

  const trigger = () => {
    ref.current?.measureInWindow((x, y, width, height) =>
      open(target, { x, y, width, height }, renderPreview, selectable),
    );
  };

  return {
    ref,
    accessibilityActions,
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === longPressActionName) trigger();
    },
    onLongPress: trigger,
  };
}
