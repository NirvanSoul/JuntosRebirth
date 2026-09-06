import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { AddFirstExpenseScreen } from '@/features/onboarding/screens/AddFirstExpenseScreen';
import { AddFirstIncomeScreen } from '@/features/onboarding/screens/AddFirstIncomeScreen';
import { CalendarPreviewScreen } from '@/features/onboarding/screens/CalendarPreviewScreen';
import { CountryScreen } from '@/features/onboarding/screens/CountryScreen';
import { CreateFirstCategoryScreen } from '@/features/onboarding/screens/CreateFirstCategoryScreen';
import { JuntosScreen } from '@/features/onboarding/screens/JuntosScreen';
import { NameScreen } from '@/features/onboarding/screens/NameScreen';
import { ReadyToExploreScreen } from '@/features/onboarding/screens/ReadyToExploreScreen';
import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { preloadOnboardingIllustrations } from '@/features/onboarding/utils/preloadOnboardingIllustrations';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Name: undefined;
  Country: undefined;
  CalendarPreview: undefined;
  Juntos: undefined;
  CreateFirstCategory: undefined;
  AddFirstIncome: undefined;
  AddFirstExpense: undefined;
  ReadyToExplore: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type OnboardingNavigatorProps = {
  onComplete: () => Promise<void>;
};

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const [areIllustrationsReady, setIllustrationsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void preloadOnboardingIllustrations().finally(() => {
      if (isMounted) setIllustrationsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Las nueve ilustraciones ya comenzaron a cargarse al importar el módulo.
  // Esperamos su caché antes de montar la primera lámina para que no aparezca
  // tarde respecto de su copy al entrar o cambiar de pantalla.
  if (!areIllustrationsReady) return null;

  return (
    <Stack.Navigator screenOptions={{ animation: 'fade', headerShown: false }}>
      <Stack.Screen
        component={NameScreen}
        name="Name"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen component={CountryScreen} name="Country" />
      <Stack.Screen component={WelcomeScreen} name="Welcome" />
      <Stack.Screen component={CalendarPreviewScreen} name="CalendarPreview" />
      <Stack.Screen component={JuntosScreen} name="Juntos" />
      <Stack.Screen
        component={CreateFirstCategoryScreen}
        name="CreateFirstCategory"
      />
      <Stack.Screen component={AddFirstIncomeScreen} name="AddFirstIncome" />
      <Stack.Screen component={AddFirstExpenseScreen} name="AddFirstExpense" />
      <Stack.Screen name="ReadyToExplore">
        {(props) => <ReadyToExploreScreen {...props} onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
