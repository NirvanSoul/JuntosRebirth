import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { saveLocalProfileDisplayName } from '@/features/profile/repositories/localProfileRepository';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Name'>;

const helloIllustrationAspectRatio = 1300 / 1057;

export function NameScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const trimmedName = name.trim();

  const handleContinue = async () => {
    if (!trimmedName || isSaving) return;
    setSaving(true);
    setError(null);
    try {
      await saveLocalProfileDisplayName(trimmedName);
      navigation.navigate('Country');
    } catch (error) {
      console.error('[onboarding] No se pudo guardar el nombre', error);
      setError('No pudimos guardar tu nombre. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreenLayout
      actionDisabled={!trimmedName || isSaving}
      actionLabel={isSaving ? 'Guardando…' : 'Continuar'}
      onAction={() => void handleContinue()}
      currentStep={1}
      compactCopyOverlapsIllustration
      compactRaisesActions
      illustrationAspectRatio={helloIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/1_Hola.png')}
      isCompact={isFocused}
      subtitle="Nosotros nos llamamos Juntos, y queremos conocerte."
      testID="onboarding-name"
      title={'Primero que nada…\n¿Cómo te llamas?'}
    >
      <View style={styles.inputArea}>
        <AuthTextField
          accessibilityLabel="Escribe tu nombre"
          autoCapitalize="words"
          autoComplete="name"
          editable={!isSaving}
          error={error}
          onBlur={() => setFocused(false)}
          onChangeText={setName}
          onFocus={() => setFocused(true)}
          onSubmitEditing={() => void handleContinue()}
          placeholder="Escribe tu nombre"
          testID="onboarding-name-input"
          textContentType="name"
          value={name}
        />
      </View>
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  inputArea: { flex: 1, justifyContent: 'flex-end', gap: spacing.xl },
});
