import { OnboardingProgressIndicator } from '@/features/onboarding/components/OnboardingProgressIndicator';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('OnboardingProgressIndicator', () => {
  it('rellena el segmento actual desde una pista gris sin perder el progreso previo', async () => {
    const screen = await renderWithTheme(
      <OnboardingProgressIndicator currentStep={4} testID="onboarding-story" />,
    );

    expect(screen.getByTestId('onboarding-story-segment-3-fill')).toBeTruthy();
    expect(screen.getByTestId('onboarding-story-segment-4-fill')).toBeTruthy();
    expect(screen.getByTestId('onboarding-story-segment-5-fill')).toBeTruthy();
  });
});
