import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AppModalProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  variant?: 'compact' | 'catalog' | 'expanded';
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
  stackBehavior?: 'push' | 'switch' | 'replace';
  testID?: string;
}>;

/** Espacio vertical que la librería reserva al tirador del bottom sheet. */
const bottomSheetHandleHeight = 24;
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
  variant = 'compact',
  extendContentIntoBottomInset = false,
  contentHeight,
  hideHandle = false,
  containsScrollable = false,
  stackBehavior = 'replace',
  testID,
}: AppModalProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const density = useLayoutDensity();
  const { isDark } = useTheme();
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
  const hasPresentedRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
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

    setContentVisible(true);
    if (!dismissRequestedByParentRef.current) {
      hasPresentedRef.current = true;
      modalRef.current?.present();
    }
  }, [presentationRequest, visible]);

  const handleDismiss = useCallback(() => {
    hasPresentedRef.current = false;
    const wasRequestedByParent = dismissRequestedByParentRef.current;
    dismissRequestedByParentRef.current = false;

    if (!wasRequestedByParent) {
      setContentVisible(false);
      onClose();
      return;
    }

    if (visibleRef.current) {
      setContentVisible(true);
      setPresentationRequest((current) => current + 1);
      return;
    }

    setContentVisible(false);
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        pressBehavior="close"
        style={[props.style, styles.transparentBackdrop]}
      >
        <BlurView
          blurReductionFactor={2}
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : undefined
          }
          intensity={20}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          tint={isDark ? 'dark' : 'light'}
        />
        <View pointerEvents="none" style={themedStyles.backdropShade} />
      </BottomSheetBackdrop>
    ),
    [isDark, themedStyles.backdropShade],
  );

  const contentStyle = [
    isExpanded && { height: expandedContentHeight },
    catalogContentHeight !== null && { height: catalogContentHeight },
  ];
  const innerContent = (
    <View
      style={[
        hasFixedHeight && styles.fixedInnerContent,
        {
          paddingHorizontal: layout.screenGutter[density],
          paddingBottom: extendContentIntoBottomInset ? 0 : modalBottomPadding,
        },
      ]}
      testID={testID ? `${testID}-content` : undefined}
    >
      {isContentVisible ? children : null}
    </View>
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        themedStyles.background,
        (isExpanded || isCatalog) && themedStyles.expandedBackground,
      ]}
      containerComponent={ModalLayer}
      enableDynamicSizing={!hasFixedHeight}
      enablePanDownToClose
      handleComponent={hideHandle ? null : undefined}
      handleIndicatorStyle={themedStyles.handle}
      index={0}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={height * 0.86}
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
    ...StyleSheet.absoluteFillObject,
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
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
    },
    expandedBackground: {
      backgroundColor: colors.modalBackground,
    },
    handle: {
      width: 42,
      height: 5,
      backgroundColor: colors.border,
    },
    backdropShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlaySoft,
    },
  });
}
