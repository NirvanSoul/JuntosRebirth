import { StepProgressBar } from '@/components/ui/StepProgressBar/StepProgressBar';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('StepProgressBar', () => {
  it('expone el paso actual de forma accesible', async () => {
    const screen = await renderWithTheme(
      <StepProgressBar
        currentStep={2}
        testID="wizard-progress"
        totalSteps={4}
      />,
    );

    const track = screen.getByTestId('wizard-progress');
    expect(track.props.accessibilityValue).toEqual({
      min: 1,
      max: 4,
      now: 2,
      text: 'Paso 2 de 4',
    });
    expect(screen.getByTestId('wizard-progress-fill')).toBeTruthy();
  });
});
