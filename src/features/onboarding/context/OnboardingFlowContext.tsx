import { createContext, type MutableRefObject, useContext } from 'react';

type OnboardingFlowContextValue = {
  completeOnboarding: () => Promise<void>;
  /**
   * Pila con un valor por lámina montada: si su barra superior mostraba
   * `Omitir`. La lámina que se monta consulta la cima (la lámina anterior)
   * para decidir si anima la aparición o desaparición del botón, y la retira
   * al desmontarse para que volver atrás conserve el historial correcto.
   */
  topBarSkipHistory?: MutableRefObject<boolean[]>;
};

export const OnboardingFlowContext =
  createContext<OnboardingFlowContextValue | null>(null);

export function useOnboardingFlow(): OnboardingFlowContextValue | null {
  return useContext(OnboardingFlowContext);
}
