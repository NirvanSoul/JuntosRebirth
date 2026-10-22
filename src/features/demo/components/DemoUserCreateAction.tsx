import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { HomeCurrencyPickerModal } from '@/features/dashboard/components/HomeCurrencyPickerModal/HomeCurrencyPickerModal';
import { demoCurrencies } from '@/features/demo/constants/demoCurrencyProfiles';
import { createDemoUser } from '@/features/demo/services/demoUserService';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { spacing } from '@/theme/spacing';

type CreationState =
  { step: 'idle' } | { step: 'creating' } | { step: 'error'; message: string };

/**
 * Acceso de desarrollo para crear un usuario demo con datos ficticios en la
 * moneda elegida. Al terminar, la navegación entra sola en su sesión local.
 */
export function DemoUserCreateAction({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    demoCurrencies[0]!,
  );
  const [state, setState] = useState<CreationState>({ step: 'idle' });
  const isCreating = state.step === 'creating';

  const handleSelect = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    setPickerVisible(false);
    setState({ step: 'creating' });
    // Con éxito, la sesión demo desmonta Acceso: no queda estado que limpiar.
    createDemoUser(currency).catch((error: unknown) => {
      console.error('[demo] No se pudo crear el usuario demo', error);
      setState({
        step: 'error',
        message: 'No pudimos crear el usuario demo. Inténtalo de nuevo.',
      });
    });
  };

  return (
    <View style={styles.container} testID="demo-user-create">
      <ModalPrimaryAction
        accessibilityLabel="Crear usuario demo"
        disabled={disabled || isCreating}
        label={isCreating ? 'Creando usuario demo…' : 'Crear usuario demo'}
        onPress={() => setPickerVisible(true)}
        testID="demo-user-create-open"
        variant="surface"
      />
      <Text align="center" tone="muted" variant="caption">
        Solo en desarrollo. Datos ficticios guardados en este dispositivo, sin
        conexión con Juntos.
      </Text>
      {state.step === 'error' ? (
        <Text align="center" tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}
      <HomeCurrencyPickerModal
        currencies={demoCurrencies}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelect}
        selectedCurrency={selectedCurrency}
        visible={isPickerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});
