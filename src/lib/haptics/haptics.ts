import * as Haptics from 'expo-haptics';

export type HapticEvent =
  | 'fabPress'
  | 'modalOpen'
  | 'categorySelect'
  | 'transactionSave'
  | 'keypadPress';

function safeTrigger(action: () => Promise<void>): void {
  action().catch(() => {});
}

export function triggerHaptic(event: HapticEvent): void {
  switch (event) {
    case 'fabPress':
      safeTrigger(() =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      );
      return;
    case 'modalOpen':
      safeTrigger(() =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      );
      return;
    case 'categorySelect':
      safeTrigger(() => Haptics.selectionAsync());
      return;
    case 'transactionSave':
      safeTrigger(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      );
      return;
    case 'keypadPress':
      safeTrigger(() => Haptics.selectionAsync());
      return;
  }
}
