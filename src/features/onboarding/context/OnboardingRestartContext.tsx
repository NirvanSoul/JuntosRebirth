import { createContext, useContext } from 'react';

type OnboardingRestartAction = () => Promise<void>;

export const OnboardingRestartContext = createContext<OnboardingRestartAction>(
  async () => undefined,
);

export function useOnboardingRestart(): OnboardingRestartAction {
  return useContext(OnboardingRestartContext);
}
