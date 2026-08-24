import { fireEvent, waitFor } from '@testing-library/react-native';

import { LegalSessionGateScreen } from '@/features/legal/screens/LegalSessionGateScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('LegalSessionGateScreen — solo los documentos que faltan', () => {
  it('exige únicamente el documento pendiente y entrega la decisión sin arrastrar el otro (B4)', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = await renderWithTheme(
      <LegalSessionGateScreen
        error={null}
        missingDocuments={['privacy-policy']}
        onAbandon={jest.fn()}
        onRetry={jest.fn()}
        onSubmit={onSubmit}
        variant="required"
      />,
    );

    // Solo la Política falta; los Términos ya constan y no se vuelven a exigir.
    expect(screen.queryByTestId('legal-gate-terms-toggle')).toBeNull();
    expect(screen.getByTestId('legal-gate-privacy-toggle')).toBeTruthy();

    // Sin confirmar la Política no se puede continuar.
    await fireEvent.press(screen.getByTestId('legal-gate-submit'));
    expect(
      await screen.findByText(
        'Confirma que has podido consultar la Política de privacidad para continuar.',
      ),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('legal-gate-privacy-toggle'));
    await fireEvent.press(screen.getByTestId('legal-gate-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        acceptedTerms: false,
        consultedPrivacy: true,
      }),
    );
  });

  it('un nuevo episodio de la puerta no arrastra la decisión del episodio anterior (B4)', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = await renderWithTheme(
      <LegalSessionGateScreen
        error={null}
        missingDocuments={['privacy-policy']}
        onAbandon={jest.fn()}
        onRetry={jest.fn()}
        onSubmit={onSubmit}
        variant="required"
      />,
    );

    await fireEvent.press(screen.getByTestId('legal-gate-privacy-toggle'));
    await fireEvent.press(screen.getByTestId('legal-gate-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        acceptedTerms: false,
        consultedPrivacy: true,
      }),
    );

    // Cambian los pendientes: ahora solo faltan los Términos y la decisión
    // previa (Política marcada) no puede contar como aceptación de Términos.
    await screen.rerender(
      <LegalSessionGateScreen
        error={null}
        missingDocuments={['terms-of-service']}
        onAbandon={jest.fn()}
        onRetry={jest.fn()}
        onSubmit={onSubmit}
        variant="required"
      />,
    );

    expect(screen.queryByTestId('legal-gate-privacy-toggle')).toBeNull();
    expect(screen.getByTestId('legal-gate-terms-toggle')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('legal-gate-submit'));
    expect(
      await screen.findByText(
        'Acepta los Términos de servicio para continuar.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('legal-gate-terms-toggle'));
    await fireEvent.press(screen.getByTestId('legal-gate-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenLastCalledWith({
        acceptedTerms: true,
        consultedPrivacy: false,
      }),
    );
  });

  it('durante la comprobación la superficie queda bloqueada (B5): indicador visible y sin acciones', async () => {
    const screen = await renderWithTheme(
      <LegalSessionGateScreen
        error={null}
        missingDocuments={[]}
        onAbandon={jest.fn()}
        onRetry={jest.fn()}
        onSubmit={jest.fn()}
        variant="checking"
      />,
    );

    expect(screen.getByTestId('legal-gate-checking')).toBeTruthy();
    expect(screen.getByText('Comprobando tu confirmación legal')).toBeTruthy();
    // La superficie no expone acciones durante la verificación.
    expect(screen.queryByTestId('legal-gate-submit')).toBeNull();
    expect(screen.queryByTestId('legal-gate-terms-toggle')).toBeNull();
    expect(screen.queryByTestId('legal-gate-privacy-toggle')).toBeNull();
  });
});
