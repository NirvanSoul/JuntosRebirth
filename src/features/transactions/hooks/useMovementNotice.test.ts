import { act, renderHook } from '@testing-library/react-native';

import {
  createdMovementNotice,
  useMovementNotice,
} from '@/features/transactions/hooks/useMovementNotice';
import type { SessionTransaction } from '@/features/transactions/types';
import { motion } from '@/theme/motion';

const category = { colorToken: 'green', icon: 'money' } as const;

function movement(type: SessionTransaction['type'], id = 'tx-1') {
  return { id, type } as SessionTransaction;
}

describe('createdMovementNotice', () => {
  it('nombra el tipo del movimiento y al tocarla abre su detalle', () => {
    const openDetail = jest.fn();
    const notice = createdMovementNotice(
      [movement('expense')],
      category,
      openDetail,
    );

    expect(notice).toMatchObject({
      category,
      message: 'Gasto agregado',
      placement: 'bottom',
      pressHint: 'Abre el detalle del movimiento',
      tone: 'success',
    });
    notice.onPress?.();
    expect(openDetail).toHaveBeenCalledWith('tx-1');
    expect(
      createdMovementNotice([movement('income')], category, openDetail).message,
    ).toBe('Ingreso agregado');
  });

  it('agrupa los dos movimientos de un cambio de divisa sin abrir ninguno', () => {
    const notice = createdMovementNotice(
      [movement('expense', 'ves'), movement('income', 'usd')],
      category,
      jest.fn(),
    );

    expect(notice.message).toBe('Movimientos agregados');
    expect(notice.onPress).toBeUndefined();
  });
});

describe('useMovementNotice', () => {
  it('confirma abajo qué se eliminó', async () => {
    const { result } = await renderHook(() => useMovementNotice(jest.fn()));

    await act(() => result.current.announceDeleted('transaction'));
    expect(result.current.notice).toMatchObject({
      message: 'Movimiento eliminado',
      placement: 'bottom',
      tone: 'success',
    });
    await act(() => result.current.announceDeleted('category'));
    expect(result.current.notice?.message).toBe('Categoría eliminada');
    await act(() => result.current.announceDeleted('moneyAccount'));
    expect(result.current.notice?.message).toBe('Cuenta eliminada');
  });

  it('confirma el movimiento editado con el icono de su categoría', async () => {
    const { result } = await renderHook(() => useMovementNotice(jest.fn()));

    await act(() =>
      result.current.announceSaved(
        [movement('expense')],
        { colorToken: 'blue', icon: 'car' },
        'updated',
      ),
    );
    expect(result.current.notice).toMatchObject({
      category: { colorToken: 'blue', icon: 'car' },
      message: 'Movimiento editado',
      placement: 'bottom',
      tone: 'success',
    });
  });

  it('confirma la cuenta creada con su nombre, icono y color', async () => {
    const { result } = await renderHook(() => useMovementNotice(jest.fn()));

    await act(() =>
      result.current.announceCreatedMoneyAccount({
        colorToken: 'blue',
        icon: 'bank',
        name: 'Caixa',
      }),
    );
    expect(result.current.notice).toMatchObject({
      message: 'Cuenta «Caixa» creada',
      moneyAccount: { colorToken: 'blue', icon: 'bank' },
      placement: 'bottom',
      tone: 'success',
    });
  });

  it('dura lo justo para leerlo salvo que el aviso pida otra duración', async () => {
    const { result } = await renderHook(() => useMovementNotice(jest.fn()));

    await act(() => result.current.announce({ message: 'Gasto agregado' }));
    expect(result.current.notice?.durationMs).toBe(
      motion.movementNoticeVisibleDuration,
    );

    await act(() =>
      result.current.announce({ durationMs: 5000, message: 'Otro' }),
    );
    expect(result.current.notice?.durationMs).toBe(5000);
  });

  it('sustituye el aviso anterior y solo retira el aviso vigente', async () => {
    const { result } = await renderHook(() => useMovementNotice(jest.fn()));

    await act(() => result.current.announce({ message: 'Primero' }));
    const firstId = result.current.notice!.id;
    await act(() => result.current.announce({ message: 'Segundo' }));

    expect(result.current.notice?.message).toBe('Segundo');
    await act(() => result.current.dismissNotice(firstId));
    expect(result.current.notice?.message).toBe('Segundo');
    await act(() => result.current.dismissNotice(result.current.notice!.id));
    expect(result.current.notice).toBeNull();
  });
});
