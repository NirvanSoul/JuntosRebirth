import { render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { HomeEntrance } from '@/features/dashboard/components/HomeEntrance';

describe('HomeEntrance', () => {
  it('renders children wrapped in animated containers', async () => {
    const { getByText } = await render(
      <HomeEntrance>
        <Text>Bloque 1</Text>
        <Text>Bloque 2</Text>
      </HomeEntrance>,
    );

    expect(getByText('Bloque 1')).toBeTruthy();
    expect(getByText('Bloque 2')).toBeTruthy();
  });

  it('handles null or undefined children gracefully', async () => {
    const { getByText, queryByText } = await render(
      <HomeEntrance startIndex={2}>
        <Text>Bloque A</Text>
        {null}
        {undefined}
      </HomeEntrance>,
    );

    expect(getByText('Bloque A')).toBeTruthy();
    expect(queryByText('Bloque B')).toBeNull();
  });

  it('remounts each block when revealKey changes so the entrance replays', async () => {
    const onMount = jest.fn();
    function Block() {
      useEffect(() => {
        onMount();
      }, []);
      return <Text>Bloque</Text>;
    }

    const { rerender } = await render(
      <HomeEntrance revealKey="personal:USD">
        <Block />
      </HomeEntrance>,
    );
    expect(onMount).toHaveBeenCalledTimes(1);

    await rerender(
      <HomeEntrance revealKey="personal:USD">
        <Block />
      </HomeEntrance>,
    );
    expect(onMount).toHaveBeenCalledTimes(1);

    await rerender(
      <HomeEntrance revealKey="personal:EUR">
        <Block />
      </HomeEntrance>,
    );
    expect(onMount).toHaveBeenCalledTimes(2);
  });
});
