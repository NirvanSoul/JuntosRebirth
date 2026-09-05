import { render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { useDepsChanged } from '@/hooks/useDepsChanged';

/**
 * `useDepsChanged` solo tiene sentido consumido en el mismo render (para
 * ajustar estado, como en `you-might-not-need-an-effect`): un `renderHook`
 * aislado no puede observar ese valor transitorio, porque React lo colapsa
 * en cuanto el `setState` interno del hook se asienta. Por eso se prueba a
 * través de un componente que, igual que los usos reales, consume el
 * resultado para ajustar su propio estado.
 */
function Probe({ value }: { value: string | null }) {
  const [applied, setApplied] = useState<string | null>(null);
  if (useDepsChanged([value]) && value !== null) {
    setApplied(value);
  }
  return <Text testID="applied">{applied ?? ''}</Text>;
}

describe('useDepsChanged', () => {
  it('aplica el ajuste ya en el primer render, aunque las props lleguen listas', async () => {
    await render(<Probe value="cuenta-1" />);
    expect(screen.getByTestId('applied').props.children).toBe('cuenta-1');
  });

  it('no repite el ajuste si el valor se mantiene igual entre renders', async () => {
    const { rerender } = await render(<Probe value="cuenta-1" />);
    await rerender(<Probe value="cuenta-1" />);
    expect(screen.getByTestId('applied').props.children).toBe('cuenta-1');
  });

  it('reaplica el ajuste cuando el valor cambia', async () => {
    const { rerender } = await render(<Probe value="cuenta-1" />);
    await rerender(<Probe value="cuenta-2" />);
    expect(screen.getByTestId('applied').props.children).toBe('cuenta-2');
  });
});
