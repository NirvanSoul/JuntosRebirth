import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { fontFamily } from '@/theme/fonts';
import { typography } from '@/theme/typography';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SpaceCreationViewProps = {
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function SpaceCreationView({
  onCancel,
  onSubmit,
}: SpaceCreationViewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  const submitSpace = async () => {
    if (isSaving) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos crear el espacio.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.createContent}>
      <Text tone="secondary" variant="body">
        Ponle un nombre que te ayude a reconocer este espacio.
      </Text>
      <View style={styles.field}>
        <Text variant="label" weight="semibold">
          Nombre
        </Text>
        <TextInput
          accessibilityLabel="Nombre del nuevo espacio"
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={40}
          onChangeText={setName}
          placeholder="Por ejemplo, Casa"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={name}
        />
        {error ? (
          <Text tone="expense" variant="footnote">
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.createActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text variant="label" weight="semibold">
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving }}
          disabled={isSaving}
          onPress={() => void submitSpace()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryPressed : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text tone="onBrand" variant="label" weight="semibold">
              Crear espacio
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    createContent: { flex: 1, gap: spacing.xl },
    field: { gap: spacing.sm },
    input: {
      minHeight: layout.minTouchTarget,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: fontFamily.light,
      fontSize: typography.body.fontSize,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    createActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 'auto',
      paddingBottom: spacing.lg,
    },
    secondaryButton: {
      minHeight: layout.minTouchTarget,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
    },
    primaryButton: {
      minHeight: layout.minTouchTarget,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
    primaryPressed: { backgroundColor: colors.ctaPressed },
    pressed: { opacity: 0.68 },
  });
}
