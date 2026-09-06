import { createContext, useContext } from 'react';

type OnboardingFlowContextValue = {
  completeOnboarding: () => Promise<void>;
};

export const OnboardingFlowContext =
  createContext<OnboardingFlowContextValue | null>(null);

export function useOnboardingFlow(): OnboardingFlowContextValue | null {
  return useContext(OnboardingFlowContext);
}
