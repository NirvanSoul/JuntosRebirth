import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { AddFirstExpenseScreen } from '@/features/onboarding/screens/AddFirstExpenseScreen';
import { AddFirstIncomeScreen } from '@/features/onboarding/screens/AddFirstIncomeScreen';
import { CalendarPreviewScreen } from '@/features/onboarding/screens/CalendarPreviewScreen';
import { CountryScreen } from '@/features/onboarding/screens/CountryScreen';
import { CreateFirstCategoryScreen } from '@/features/onboarding/screens/CreateFirstCategoryScreen';
import { JuntosScreen } from '@/features/onboarding/screens/JuntosScreen';
import { NameScreen } from '@/features/onboarding/screens/NameScreen';
import { ReadyToExploreScreen } from '@/features/onboarding/screens/ReadyToExploreScreen';
import { OnboardingLoginScreen } from '@/features/onboarding/screens/OnboardingLoginScreen';
import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { OnboardingFlowContext } from '@/features/onboarding/context/OnboardingFlowContext';
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
  OnboardingLogin: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type OnboardingNavigatorProps = {
  onComplete: () => Promise<void>;
};

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  useEffect(() => {
    void preloadOnboardingIllustrations();
  }, []);

  return (
    <OnboardingFlowContext.Provider value={{ completeOnboarding: onComplete }}>
      <Stack.Navigator
        screenOptions={{ animation: 'fade', headerShown: false }}
      >
        <Stack.Screen
          component={NameScreen}
          name="Name"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen component={CountryScreen} name="Country" />
        <Stack.Screen component={WelcomeScreen} name="Welcome" />
        <Stack.Screen
          component={CalendarPreviewScreen}
          name="CalendarPreview"
        />
        <Stack.Screen component={JuntosScreen} name="Juntos" />
        <Stack.Screen
          component={CreateFirstCategoryScreen}
          name="CreateFirstCategory"
        />
        <Stack.Screen component={AddFirstIncomeScreen} name="AddFirstIncome" />
        <Stack.Screen
          component={AddFirstExpenseScreen}
          name="AddFirstExpense"
        />
        <Stack.Screen component={ReadyToExploreScreen} name="ReadyToExplore" />
        <Stack.Screen name="OnboardingLogin">
          {(props) => (
            <OnboardingLoginScreen {...props} onComplete={onComplete} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </OnboardingFlowContext.Provider>
  );
}
