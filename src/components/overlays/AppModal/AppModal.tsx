import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { PropsWithChildren } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurScrim } from '@/components/overlays/BlurScrim/BlurScrim';
import {
  PreviewActionsScope,
  usePreviewActionsScope,
} from '@/components/overlays/PreviewActions/PreviewActionsScope';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  CurrencySymbolPreferenceScope,
  useCurrencySymbolPreference,
} from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AppModalProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  /** Se ejecuta cuando la hoja terminó de cerrarse y no va a reabrirse. */
  onDismissed?: () => void;
  variant?: 'compact' | 'catalog' | 'expanded';
  /** Superficie de la hoja; por defecto usa el mismo fondo que la app. */
  backgroundVariant?: 'surface' | 'modal' | 'background';
  /** Permite que un scroll interno ocupe el inset y lo añada al final de su contenido. */
  extendContentIntoBottomInset?: boolean;
  /** Altura natural del contenido, sin handle ni padding inferior del modal. */
  contentHeight?: number;
  /** Retira el tirador y permite que el contenido ocupe también su franja superior. */
  hideHandle?: boolean;
  /**
   * Indica que los hijos ya incluyen un scrollable integrado de bottom sheet.
   * Evita registrar además un BottomSheetView estático que sobrescriba su offset.
   */
  containsScrollable?: boolean;
  /**
   * Mantiene la pulsación larga y la selección múltiple de las tarjetas de
   * vista previa dentro de la hoja, que se pinta en un portal sin ese contexto.
   */
  previewActions?: boolean;
  /**
   * `false` deja los arrastres del contenido a sus hijos (p. ej. la rueda del
   * selector nativo de hora); la hoja se sigue cerrando desde el tirador.
   */
  enableContentPanningGesture?: boolean;
  stackBehavior?: 'push' | 'switch' | 'replace';
  testID?: string;
}>;

/** Espacio vertical que la librería reserva al tirador del bottom sheet. */
const bottomSheetHandleHeight = 24;
// Reanimated puede dejar el índice cerrado ligeramente por encima de -1.
// Este margen hace que el backdrop libere los toques aun con ese redondeo.
const closedBackdropIndex = -0.99;
const expandedSnapRatio = 0.94;
export function useAppModalBottomInset(): number {
  const insets = useSafeAreaInsets();
  const density = useLayoutDensity();

  return insets.bottom + layout.modalBottomInset[density];
}

function ModalLayer({ children }: PropsWithChildren) {
  return (
    <View pointerEvents="box-none" style={styles.modalLayer}>
      {children}
    </View>
  );
}

export function AppModal({
  children,
  visible,
  onClose,
  onDismissed,
  variant = 'compact',
  backgroundVariant,
  extendContentIntoBottomInset = false,
  contentHeight,
  hideHandle = false,
  containsScrollable = false,
  previewActions = false,
  enableContentPanningGesture = true,
  stackBehavior = 'replace',
  testID,
}: AppModalProps) {
  const currencySymbolPreference = useCurrencySymbolPreference();
  const previewActionsScope = usePreviewActionsScope();
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const density = useLayoutDensity();
  const themedStyles = useThemedStyles(createThemedStyles);
  const isExpanded = variant === 'expanded';
  const isCatalog = variant === 'catalog';
  const modalBottomPadding = useAppModalBottomInset();
  const modalHandleHeight = hideHandle ? 0 : bottomSheetHandleHeight;
  const expandedContentHeight =
    (height - insets.top) * expandedSnapRatio - modalHandleHeight;
  const catalogSheetHeight =
    isCatalog && contentHeight !== undefined
      ? Math.min(
          contentHeight + modalBottomPadding + modalHandleHeight,
          height * 0.86,
        )
      : null;
  const catalogContentHeight =
    catalogSheetHeight === null ? null : catalogSheetHeight - modalHandleHeight;
  const hasFixedHeight = isExpanded || catalogSheetHeight !== null;
  const [isContentVisible, setContentVisible] = useState(visible);
  const [presentationRequest, setPresentationRequest] = useState(0);
  /**
   * Distingue un cierre pedido por el padre (`visible` pasó a `false`) de uno
   * iniciado por gesto (deslizar o tocar el backdrop). `onDismiss` puede
   * llegar después de que el usuario ya haya vuelto a abrir el mismo modal,
   * así que no puede confiar en el valor de `visible` en ese momento: quedaría
   * obsoleto y volvería a cerrar lo que el usuario acaba de reabrir.
   */
  const dismissRequestedByParentRef = useRef(false);
  /** El cierre por gesto ya se notificó con `onClose` al empezar a animarse. */
  const closeNotifiedRef = useRef(false);
  const hasPresentedRef = useRef(false);
  const visibleRef = useRef(visible);
  useLayoutEffect(() => {
    visibleRef.current = visible;
  });
  const snapPoints = useMemo(
    () =>
      isExpanded
        ? ['94%']
        : catalogSheetHeight !== null
          ? [catalogSheetHeight]
          : undefined,
    [catalogSheetHeight, isExpanded],
  );

  useLayoutEffect(() => {
    if (!visible) {
      if (hasPresentedRef.current) {
        dismissRequestedByParentRef.current = true;
        modalRef.current?.dismiss();
      }
      return;
    }

    // Este efecto también presenta el bottom sheet imperativamente (abajo);
    // no es un derivado puro de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentVisible(true);
    closeNotifiedRef.current = false;
    // Se presenta aunque haya un cierre pendiente: si la librería descartó ese
    // cierre sin animarlo (`forceClose` sale antes de tiempo) nunca llega
    // `onDismiss` y la hoja quedaría sin volver a abrirse. Si el cierre sí está
    // en curso, la librería ignora esta llamada y `handleDismiss` la repite.
    hasPresentedRef.current = true;
    modalRef.current?.present();
  }, [presentationRequest, visible]);

  /**
   * La librería puede perder un cierre y dejar la hoja abierta: `present()`
   * monta en el siguiente frame, así que un `dismiss()` anterior no encuentra
   * hoja que cerrar, y un reajuste por teclado o contenido puede reabrirla.
   * La hoja quedaba visible sin responder, porque sus acciones piden un
   * cierre que el padre ya considera hecho. Al asentarse abierta se reconcilia
   * con `visible`.
   */
  const handleChange = useCallback((index: number) => {
    if (index < 0) return;
    if (visibleRef.current) {
      // Abierta y deseada: un cierre pendiente ya no llegará.
      dismissRequestedByParentRef.current = false;
      closeNotifiedRef.current = false;
      return;
    }
    dismissRequestedByParentRef.current = true;
    modalRef.current?.dismiss();
  }, []);

  /**
   * La librería solo emite `onDismiss` si la animación de cierre termina
   * completa; si se interrumpe, un cierre por gesto nunca llegaba al padre.
   * Este seguía con `visible` en `true`, así que las aperturas siguientes no
   * cambiaban nada y la hoja no volvía a presentarse. Se avisa al empezar.
   */
  const handleAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      if (
        toIndex !== -1 ||
        !visibleRef.current ||
        dismissRequestedByParentRef.current ||
        closeNotifiedRef.current
      ) {
        return;
      }
      closeNotifiedRef.current = true;
      onClose();
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    hasPresentedRef.current = false;
    const wasRequestedByParent = dismissRequestedByParentRef.current;
    const wasCloseNotified = closeNotifiedRef.current;
    dismissRequestedByParentRef.current = false;
    closeNotifiedRef.current = false;

    if (!wasRequestedByParent) {
      setContentVisible(false);
      if (!wasCloseNotified) onClose();
      onDismissed?.();
      return;
    }

    if (visibleRef.current) {
      setContentVisible(true);
      setPresentationRequest((current) => current + 1);
      return;
    }

    setContentVisible(false);
    onDismissed?.();
  }, [onClose, onDismissed]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={closedBackdropIndex}
        opacity={1}
        pressBehavior="close"
        style={[props.style, styles.transparentBackdrop]}
      >
        <BlurScrim />
      </BottomSheetBackdrop>
    ),
    [],
  );

  const contentStyle = [
    isExpanded && { height: expandedContentHeight },
    catalogContentHeight !== null && { height: catalogContentHeight },
  ];
  const innerContent = (
    <CurrencySymbolPreferenceScope value={currencySymbolPreference}>
      <View
        style={[
          hasFixedHeight && styles.fixedInnerContent,
          {
            paddingHorizontal: layout.screenGutter[density],
            paddingBottom: extendContentIntoBottomInset
              ? 0
              : modalBottomPadding,
          },
        ]}
        testID={testID ? `${testID}-content` : undefined}
      >
        {!isContentVisible ? null : previewActions ? (
          <PreviewActionsScope value={previewActionsScope}>
            {children}
          </PreviewActionsScope>
        ) : (
          children
        )}
      </View>
    </CurrencySymbolPreferenceScope>
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      animationConfigs={
        Platform.OS === 'android' ? undefined : motion.sheetSpring
      }
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        themedStyles.background,
        backgroundVariant === 'surface' && themedStyles.surfaceBackground,
        backgroundVariant === 'modal' && themedStyles.modalBackground,
      ]}
      containerComponent={ModalLayer}
      enableContentPanningGesture={enableContentPanningGesture}
      enableDynamicSizing={!hasFixedHeight}
      enablePanDownToClose
      handleComponent={hideHandle ? null : undefined}
      handleIndicatorStyle={themedStyles.handle}
      index={0}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={height * 0.86}
      onAnimate={handleAnimate}
      onChange={handleChange}
      onDismiss={handleDismiss}
      ref={modalRef}
      snapPoints={snapPoints}
      stackBehavior={stackBehavior}
      topInset={insets.top}
    >
      {isContentVisible ? (
        containsScrollable ? (
          <View style={contentStyle} testID={testID}>
            {innerContent}
          </View>
        ) : (
          <BottomSheetView style={contentStyle} testID={testID}>
            {innerContent}
          </BottomSheetView>
        )
      ) : null}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modalLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 20,
  },
  fixedInnerContent: {
    flex: 1,
  },
  transparentBackdrop: {
    backgroundColor: 'transparent',
  },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    background: {
      backgroundColor: colors.background,
      borderRadius: radii.lg,
    },
    surfaceBackground: { backgroundColor: colors.surface },
    modalBackground: { backgroundColor: colors.modalBackground },
    handle: {
      width: 42,
      height: 5,
      backgroundColor: colors.border,
    },
  });
}
