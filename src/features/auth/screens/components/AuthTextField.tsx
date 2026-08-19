import { Eye } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlash } from 'phosphor-react-native/src/icons/EyeSlash';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { fontFamily } from '@/theme/fonts';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AuthTextFieldProps = {
  accessibilityLabel?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  editable?: boolean;
  error?: string | null;
  keyboardType?: TextInputProps['keyboardType'];
  label?: string;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  secureTextEntry?: boolean;
  testID?: string;
  textContentType?: TextInputProps['textContentType'];
  value: string;
};

/**
 * Mismo aspecto que el campo de "nombre de espacio" de `SpaceSideMenu`:
 * único estilo de entrada de texto en toda la app, reutilizado aquí en vez
 * de inventar uno nuevo para los formularios de autenticación.
 */
export function AuthTextField({
  accessibilityLabel,
  autoCapitalize = 'none',
  autoComplete,
  editable = true,
  error = null,
  keyboardType,
  label,
  onBlur,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  returnKeyType = 'next',
  secureTextEntry = false,
  testID,
  textContentType,
  value,
}: AuthTextFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isPasswordField = secureTextEntry;

  const renderTextInput = (inputStyle: StyleProp<TextStyle>) => (
    <TextInput
      accessibilityLabel={
        accessibilityLabel ?? label ?? placeholder ?? 'Campo de texto'
      }
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      autoCorrect={false}
      editable={editable}
      keyboardType={keyboardType}
      onBlur={onBlur}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      returnKeyType={returnKeyType}
      secureTextEntry={isPasswordField && !passwordVisible}
      style={inputStyle}
      testID={testID}
      textContentType={textContentType}
      value={value}
    />
  );

  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="label" weight="semibold">
          {label}
        </Text>
      ) : null}
      {isPasswordField ? (
        <View style={[styles.inputRow, error ? styles.inputError : null]}>
          {renderTextInput(styles.inputInner)}
          <Pressable
            accessibilityLabel={
              passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            accessibilityRole="button"
            disabled={!editable}
            hitSlop={spacing.sm}
            onPress={() => setPasswordVisible((current) => !current)}
            style={({ pressed }) => [
              styles.visibilityToggle,
              pressed ? styles.pressed : null,
            ]}
            testID={testID ? `${testID}-toggle-visibility` : undefined}
          >
            {passwordVisible ? (
              <EyeSlash
                color={colors.textMuted}
                size={iconSize.md}
                weight="regular"
              />
            ) : (
              <Eye
                color={colors.textMuted}
                size={iconSize.md}
                weight="regular"
              />
            )}
          </Pressable>
        </View>
      ) : (
        renderTextInput([styles.input, error ? styles.inputError : null])
      )}
      {error ? (
        <Text tone="expense" variant="footnote">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    field: {
      gap: spacing.sm,
    },
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
    inputError: {
      borderColor: colors.expense,
    },
    inputRow: {
      minHeight: layout.minTouchTarget,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputInner: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      color: colors.textPrimary,
      fontFamily: fontFamily.light,
      fontSize: typography.body.fontSize,
      paddingLeft: spacing.lg,
      paddingVertical: spacing.md,
    },
    pressed: {
      opacity: 0.68,
    },
    visibilityToggle: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
