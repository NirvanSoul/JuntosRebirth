import type { PropsWithChildren, ReactNode } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen/Screen';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { OnboardingTopBar } from '@/features/onboarding/components/OnboardingTopBar';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import {
  getDisclosureLayoutTransition,
  getOnboardingEntering,
} from '@/theme/transitions';
import { Text } from '@/components/ui/Text/Text';

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Tamaño único de la ilustración de cabecera para toda lámina de onboarding
 * que la use, fijado a partir de la lámina de nombre. Ninguna pantalla debe
 * declarar su propio ancho: así una misma "regla" de tamaño se aplica a
 * todas sin duplicarla.
 */
const heroIllustrationWidth = { compact: 320, regular: 380 } as const;

/**
 * Alto máximo de la ilustración de cabecera, independiente de su ancho. Una
 * imagen con proporción más cuadrada que las de referencia (ancho ÷ alto
 * cercano a 1) alcanzaría un alto mayor si solo se limitara el ancho,
 * empujando título/subtítulo y los botones fuera de la pantalla.
 */
const heroIllustrationMaxHeight = { compact: 260, regular: 300 } as const;

/** Tamaño de la ilustración cuando el teclado está abierto (modo compacto). */
const compactIllustrationWidth = { compact: 112, regular: 128 } as const;

/**
 * Orden en que suben los bloques al montarse la lámina: mismo recorrido y
 * desfase que la entrada de Home, de arriba abajo para que la lectura siga
 * al movimiento. El indicador de progreso no entra: es la única pieza fija
 * entre láminas y así marca la continuidad del recorrido.
 */
const entranceOrder = {
  illustration: 0,
  title: 1,
  subtitle: 2,
  content: 3,
  actions: 4,
} as const;

type OnboardingScreenLayoutProps = PropsWithChildren<{
  actionLabel?: string;
  actionDisabled?: boolean;
  /** Acción circular colocada junto a Atrás, normalmente el FAB del onboarding. */
  footerAccessory?: ReactNode;
  /**
   * Acción secundaria a ancho completo colocada justo encima de la fila de
   * botones, para una lámina que ofrece dos caminos (por ejemplo, iniciar
   * sesión además de crear cuenta). Se pasa como nodo para que la pantalla
   * elija su variante, pero debe construirse con `ModalPrimaryAction` para
   * conservar la altura de acción del resto del onboarding.
   */
  secondaryAction?: ReactNode;
  onAction?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  currentStep: number;
  /** Imagen opcional mostrada entre el progreso y el título, a tamaño estándar. */
  illustrationSource?: ImageSourcePropType;
  /** Ancho ÷ alto real del archivo de `illustrationSource`, para calcular su alto sin depender de `aspectRatio` en `Image` (ver ADR/nota de la lámina de nombre). */
  illustrationAspectRatio?: number;
  /**
   * La ilustración ignora el ancho estándar y el margen lateral de pantalla
   * y se extiende de borde a borde. Pensada para una imagen cuyo contenido
   * (por ejemplo, manos entrando desde ambos lados) se ve recortado dentro
   * del ancho habitual.
   */
  illustrationFullBleed?: boolean;
  /**
   * Multiplicador opcional sobre el tamaño estándar de la ilustración (ancho
   * y alto máximo), para una lámina cuya imagen deba destacar más sin
   * alterar el tamaño por defecto de las demás. 1 = tamaño estándar.
   */
  illustrationScale?: number;
  /**
   * Encoge la cabecera (ilustración junto al título, textos más pequeños)
   * para dejar sitio al teclado. Cada pantalla decide cuándo activarlo
   * (normalmente al enfocar su campo).
   */
  isCompact?: boolean;
  /** Permite que un titular compacto aproveche el espacio visual de su ilustración. */
  compactCopyOverlapsIllustration?: boolean;
  /**
   * Solo tiene efecto junto a `isCompact`. Colapsa el área de contenido y
   * sube `Atrás`/el botón principal justo debajo, en vez de dejarlos al pie
   * de la pantalla. Pensado para una lámina cuyo único contenido es un campo
   * (nombre): no hay nada más que mostrar debajo. Una lámina con una lista
   * bajo el campo (país) debe omitirlo para que la lista conserve su espacio.
   */
  compactRaisesActions?: boolean;
  subtitle?: string;
  testID?: string;
  title: string;
}>;

/** Estructura compartida de una lámina: mensaje arriba, contenido central y CTA estable. */
export function OnboardingScreenLayout({
  actionDisabled = false,
  actionLabel,
  children,
  compactCopyOverlapsIllustration = false,
  compactRaisesActions = false,
  illustrationAspectRatio,
  illustrationFullBleed = false,
  illustrationScale = 1,
  illustrationSource,
  isCompact = false,
  footerAccessory,
  onAction,
  onBack,
  onSkip,
  currentStep,
  secondaryAction,
  subtitle,
  testID,
  title,
}: OnboardingScreenLayoutProps) {
  const density = useLayoutDensity();
  const { width: windowWidth } = useWindowDimensions();
  const layoutTransition = getDisclosureLayoutTransition();
  const raiseActions = isCompact && compactRaisesActions;
  const canSkip = currentStep >= 3 && onSkip !== undefined;
  const handleAction = () => {
    triggerHaptic('onboardingContinue');
    onAction?.();
  };

  // Fuera del modo compacto la imagen puede encoger en alto (`flexShrink`) si
  // la lámina no cabe: con `contain` se reduce a escala y la fila de acciones
  // conserva su sitio al pie en vez de bajar con el desbordamiento. Esto es lo
  // que iguala láminas con imagen de borde a borde o textos largos al resto.
  const illustrationStyle = (() => {
    // A sangre: siempre el 100 % del ancho de la ventana, con el alto que
    // dicta su proporción. Nunca encoge: si la lámina anda justa de alto, cede
    // el área de contenido (vacía en estas láminas), no la imagen.
    if (illustrationFullBleed) {
      const width = Math.round(windowWidth);
      return {
        width,
        height: Math.round(width / (illustrationAspectRatio ?? 1)),
        flexShrink: 0,
      };
    }
    // Fijar inmediatamente la huella compacta evita que el texto reciba
    // anchos intermedios y salte entre distintas líneas al abrir el teclado.
    const rawWidth = isCompact
      ? compactIllustrationWidth[density]
      : heroIllustrationWidth[density] * illustrationScale;
    const rawMaxHeight = isCompact
      ? compactIllustrationWidth[density]
      : heroIllustrationMaxHeight[density] * illustrationScale;
    const ratio = illustrationAspectRatio ?? 1;
    // Ancho tope salvo que, con esa proporción, el alto resultante supere el
    // máximo permitido: en ese caso el alto manda para no empujar el resto
    // de la lámina fuera de la pantalla.
    const width = Math.min(rawWidth, rawMaxHeight * ratio);
    const height = width / ratio;
    // Redondeado a píxel entero: una medida fraccionaria durante el resorte
    // hace que la imagen nativa se rasterice borrosa en vez de nítida.
    return {
      width: Math.round(width),
      height: Math.round(height),
      flexShrink: isCompact ? 0 : 1,
    };
  })();

  const illustrationWrapperStyle = illustrationFullBleed
    ? [
        styles.illustration,
        styles.illustrationFullBleed,
        { marginHorizontal: -layout.screenGutter[density] },
      ]
    : isCompact
      ? styles.illustrationCompact
      : styles.illustration;

  return (
    <Screen
      contentContainerStyle={styles.content}
      scrollable={false}
      testID={testID}
      transparentBackground
    >
      <Pressable
        accessible={false}
        onPress={Keyboard.dismiss}
        style={styles.dismissArea}
        testID={testID ? `${testID}-dismiss-area` : undefined}
      >
        <OnboardingTopBar
          canSkip={canSkip}
          currentStep={currentStep}
          onSkip={onSkip}
          testID={testID}
        />
        <Animated.View
          layout={layoutTransition}
          style={isCompact ? styles.headerCompact : styles.header}
        >
          {illustrationSource ? (
            <Animated.View
              entering={getOnboardingEntering(entranceOrder.illustration)}
              layout={layoutTransition}
              style={illustrationWrapperStyle}
              testID={testID ? `${testID}-illustration-frame` : undefined}
            >
              <AnimatedImage
                accessible={false}
                resizeMode="contain"
                source={illustrationSource}
                style={illustrationStyle}
                testID={testID ? `${testID}-illustration` : undefined}
              />
            </Animated.View>
          ) : null}
          <Animated.View
            layout={layoutTransition}
            style={[
              styles.copy,
              isCompact ? styles.copyCompact : null,
              isCompact && compactCopyOverlapsIllustration
                ? styles.copyCompactOverlap
                : null,
            ]}
          >
            <Animated.View
              entering={getOnboardingEntering(entranceOrder.title)}
            >
              <Text
                accessibilityRole="header"
                variant={isCompact ? 'heading' : 'heroTitle'}
              >
                {title}
              </Text>
            </Animated.View>
            {subtitle ? (
              <Animated.View
                entering={getOnboardingEntering(entranceOrder.subtitle)}
              >
                <Text
                  tone="secondary"
                  variant={isCompact ? 'label' : 'subheading'}
                  weight="regular"
                >
                  {subtitle}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
        <Animated.View
          entering={getOnboardingEntering(entranceOrder.content)}
          layout={layoutTransition}
          style={raiseActions ? styles.visualCompact : styles.visual}
        >
          {children}
        </Animated.View>
        <Animated.View
          entering={getOnboardingEntering(entranceOrder.actions)}
          layout={layoutTransition}
          style={styles.actionStack}
        >
          {secondaryAction}
          <View style={styles.actions}>
            {onBack ? (
              <ModalCloseButton
                onPress={onBack}
                showBackground
                size={layout.floatingActionSize}
                testID={testID ? `${testID}-back` : undefined}
                variant="back"
              />
            ) : null}
            {actionLabel && onAction ? (
              <ModalPrimaryAction
                accessibilityLabel={actionLabel}
                disabled={actionDisabled}
                label={actionLabel}
                onPress={handleAction}
                style={styles.primaryAction}
                testID={testID ? `${testID}-action` : undefined}
                variant="cta"
              />
            ) : null}
            {footerAccessory ? (
              <View style={styles.footerAccessory}>{footerAccessory}</View>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.huge + spacing.lg,
  },
  dismissArea: { flex: 1, gap: spacing.xxl },
  // Cabecera e ilustración pueden ceder alto; el texto nunca (solo cede ancho
  // en la fila compacta). Así una lámina que desborda encoge la imagen, no
  // desplaza los botones.
  header: { gap: spacing.xxl, flexShrink: 1, minHeight: 0 },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  copy: { gap: spacing.md },
  copyCompact: { flexShrink: 1 },
  copyCompactOverlap: { marginLeft: -spacing.xl },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
    flexShrink: 1,
    minHeight: 0,
  },
  // El marco tampoco cede alto: la imagen a sangre no se recorta ni encoge.
  illustrationFullBleed: { flexShrink: 0 },
  illustrationCompact: { alignItems: 'center', justifyContent: 'center' },
  visual: { flex: 1, minHeight: 0 },
  visualCompact: {
    flexShrink: 1,
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionStack: { gap: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footerAccessory: { marginLeft: 'auto' },
  primaryAction: { flex: 1 },
});
