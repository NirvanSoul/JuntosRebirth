import type { PropsWithChildren } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen/Screen';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { OnboardingProgressIndicator } from '@/features/onboarding/components/OnboardingProgressIndicator';
import {
  estimateRevealDuration,
  OnboardingRevealText,
} from '@/features/onboarding/components/OnboardingRevealText';
import { useReduceMotionPreference } from '@/features/onboarding/hooks/useReduceMotionPreference';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { getDisclosureLayoutTransition } from '@/theme/transitions';

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

type OnboardingScreenLayoutProps = PropsWithChildren<{
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  onBack?: () => void;
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
  onAction,
  onBack,
  currentStep,
  subtitle,
  testID,
  title,
}: OnboardingScreenLayoutProps) {
  const density = useLayoutDensity();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotionPreference();
  const subtitleDelay =
    estimateRevealDuration() + motion.onboardingTextRevealBlockPause;
  const layoutTransition = getDisclosureLayoutTransition();
  const raiseActions = isCompact && compactRaisesActions;

  const illustrationStyle = (() => {
    if (illustrationFullBleed) {
      const width = Math.round(windowWidth);
      return {
        width,
        height: Math.round(width / (illustrationAspectRatio ?? 1)),
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
    return { width: Math.round(width), height: Math.round(height) };
  })();

  const illustrationWrapperStyle = illustrationFullBleed
    ? [styles.illustration, { marginHorizontal: -layout.screenGutter[density] }]
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
        <OnboardingProgressIndicator currentStep={currentStep} />
        <Animated.View
          layout={layoutTransition}
          style={isCompact ? styles.headerCompact : styles.header}
        >
          {illustrationSource ? (
            <Animated.View
              layout={layoutTransition}
              style={illustrationWrapperStyle}
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
              isCompact && compactCopyOverlapsIllustration
                ? styles.copyCompactOverlap
                : null,
            ]}
          >
            <OnboardingRevealText
              accessibilityRole="header"
              reduceMotion={reduceMotion}
              text={title}
              variant={isCompact ? 'heading' : 'heroTitle'}
            />
            {subtitle ? (
              <OnboardingRevealText
                reduceMotion={reduceMotion}
                startDelay={subtitleDelay}
                text={subtitle}
                tone="secondary"
                variant={isCompact ? 'label' : 'subheading'}
                weight="regular"
              />
            ) : null}
          </Animated.View>
        </Animated.View>
        <Animated.View
          layout={layoutTransition}
          style={raiseActions ? styles.visualCompact : styles.visual}
        >
          {children}
        </Animated.View>
        <Animated.View layout={layoutTransition} style={styles.actions}>
          {onBack ? (
            <ModalPrimaryAction
              accessibilityLabel="Atrás"
              label="Atrás"
              onPress={onBack}
              testID={testID ? `${testID}-back` : undefined}
              variant="surface"
            />
          ) : null}
          <ModalPrimaryAction
            accessibilityLabel={actionLabel}
            disabled={actionDisabled}
            label={actionLabel}
            onPress={onAction}
            style={styles.primaryAction}
            testID={testID ? `${testID}-action` : undefined}
            variant="cta"
          />
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
  header: { gap: spacing.xxl },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  copy: { gap: spacing.md, flexShrink: 1 },
  copyCompactOverlap: { marginLeft: -spacing.xl },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  illustrationCompact: { alignItems: 'center', justifyContent: 'center' },
  visual: { flex: 1, minHeight: 0 },
  visualCompact: {
    flexShrink: 1,
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  primaryAction: { flex: 1 },
});
