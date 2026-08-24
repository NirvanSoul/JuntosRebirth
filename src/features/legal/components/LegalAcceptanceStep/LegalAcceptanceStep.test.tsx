import { fireEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { LegalAcceptanceStep } from '@/features/legal/components/LegalAcceptanceStep/LegalAcceptanceStep';
import { layout } from '@/theme/layout';
import { renderWithTheme } from '@/test/renderWithTheme';

function Harness() {
  const [decision, setDecision] = useState({
    acceptedTerms: false,
    consultedPrivacy: false,
  });
  return <LegalAcceptanceStep onChange={setDecision} value={decision} />;
}

describe('LegalAcceptanceStep — semántica y accesibilidad', () => {
  it('expone las dos acciones diferenciadas como checkboxes con su estado', async () => {
    const screen = await renderWithTheme(<Harness />);

    const terms = screen.getByTestId('legal-step-terms-toggle');
    expect(terms.props.accessibilityRole).toBe('checkbox');
    expect(terms.props.accessibilityLabel).toBe(
      'Acepto los Términos de servicio',
    );
    expect(terms.props.accessibilityState.checked).toBe(false);

    const privacy = screen.getByTestId('legal-step-privacy-toggle');
    expect(privacy.props.accessibilityRole).toBe('checkbox');
    expect(privacy.props.accessibilityLabel).toBe(
      'Confirmo que he podido consultar la Política de privacidad',
    );
    expect(privacy.props.accessibilityState.checked).toBe(false);

    // La Política no se presenta como «consentimiento» genérico.
    expect(privacy.props.accessibilityLabel).not.toContain('consiento');
  });

  it('marca las acciones al tocarlas y respeta el objetivo táctil mínimo', async () => {
    const screen = await renderWithTheme(<Harness />);

    await fireEvent.press(screen.getByTestId('legal-step-terms-toggle'));
    await fireEvent.press(screen.getByTestId('legal-step-privacy-toggle'));

    await waitFor(() => {
      expect(
        screen.getByTestId('legal-step-terms-toggle').props.accessibilityState
          .checked,
      ).toBe(true);
      expect(
        screen.getByTestId('legal-step-privacy-toggle').props.accessibilityState
          .checked,
      ).toBe(true);
    });

    const rowStyle = screen.getByTestId('legal-step-terms-toggle').props.style;
    const flattenedStyle = Array.isArray(rowStyle)
      ? Object.assign({}, ...rowStyle)
      : rowStyle;
    expect(flattenedStyle.minHeight).toBeGreaterThanOrEqual(
      layout.minTouchTarget,
    );
  });

  it('solo expone y valida las acciones de los documentos requeridos (B4)', async () => {
    const screen = await renderWithTheme(
      <LegalAcceptanceStep
        onChange={jest.fn()}
        requiredDocuments={['terms-of-service']}
        value={{ acceptedTerms: false, consultedPrivacy: true }}
      />,
    );

    // La Política ya consta: no se vuelve a pedir.
    expect(screen.queryByTestId('legal-step-privacy-toggle')).toBeNull();
    expect(screen.getByTestId('legal-step-terms-toggle')).toBeTruthy();
    expect(screen.getByTestId('legal-step-open-terms')).toBeTruthy();
  });

  it('permite abrir y cerrar ambos documentos desde sus enlaces', async () => {
    const screen = await renderWithTheme(<Harness />);

    const openTerms = screen.getByTestId('legal-step-open-terms');
    expect(openTerms.props.accessibilityRole).toBe('link');
    expect(openTerms.props.accessibilityLabel).toBe(
      'Leer Términos de servicio',
    );

    await fireEvent.press(openTerms);
    expect(screen.getByTestId('legal-document-screen')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));
    await waitFor(() =>
      expect(screen.queryByTestId('legal-document-screen')).toBeNull(),
    );

    const openPrivacy = screen.getByTestId('legal-step-open-privacy');
    expect(openPrivacy.props.accessibilityRole).toBe('link');
    expect(openPrivacy.props.accessibilityLabel).toBe(
      'Leer Política de privacidad',
    );

    await fireEvent.press(openPrivacy);
    expect(screen.getByTestId('legal-document-screen')).toBeTruthy();
  });
});
