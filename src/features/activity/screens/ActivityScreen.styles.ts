import { StyleSheet } from 'react-native';

import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

export function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    movementSummary: {
      marginBottom: spacing.lg,
    },
    categoryGroupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
    },
    categoryGroup: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 2,
    },
    categorySeparator: {
      height: 1,
      backgroundColor: colors.categoryPreviewBorder,
    },
    categoryDetailTitle: {
      marginBottom: spacing.md,
      marginTop: spacing.xl,
    },
  });
}
