import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AddFirstTransactionStep } from '@/features/onboarding/components/AddFirstTransactionStep';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AddFirstIncome'>;

const incomeIllustrationAspectRatio = 1268 / 1208;

export function AddFirstIncomeScreen({ navigation }: Props) {
  const { activeSpace } = useSpaces();

  return (
    <AddFirstTransactionStep
      currentStep={7}
      illustrationAspectRatio={incomeIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/7 Bien.png')}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.navigate('AddFirstExpense')}
      spaceId={activeSpace.id}
      spaceName={activeSpace.name}
      subtitle="Registra el primer dinero que entra a tu espacio personal."
      testID="onboarding-add-income"
      title={'¡Genial! Ahora añade\ntu primer ingreso'}
      type="income"
    />
  );
}
