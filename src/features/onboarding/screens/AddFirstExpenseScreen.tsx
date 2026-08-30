import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AddFirstTransactionStep } from '@/features/onboarding/components/AddFirstTransactionStep';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'AddFirstExpense'
>;

const expenseIllustrationAspectRatio = 1300 / 1300;

export function AddFirstExpenseScreen({ navigation }: Props) {
  const { activeSpace } = useSpaces();

  return (
    <AddFirstTransactionStep
      currentStep={8}
      illustrationAspectRatio={expenseIllustrationAspectRatio}
      illustrationScale={1.2}
      illustrationSource={require('../../../../assets/Onboarding/8_Gastos.png')}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.navigate('ReadyToExplore')}
      spaceId={activeSpace.id}
      spaceName={activeSpace.name}
      subtitle="Registrando tus gastos tendrás un mejor panorama de tus finanzas."
      testID="onboarding-add-expense"
      title={'No muy divertido,\npero necesario.\nAñade un gasto.'}
      type="expense"
    />
  );
}
