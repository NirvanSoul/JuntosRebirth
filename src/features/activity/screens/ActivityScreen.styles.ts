import { StyleSheet } from 'react-native';

import { minTouchTarget } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

export function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    movementsHeader: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xxl,
      marginBottom: spacing.md,
    },
    movementSummary: {
      marginBottom: spacing.lg,
    },
    filterLink: {
      minHeight: minTouchTarget,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingLeft: spacing.lg,
    },
    filterLinkPressed: {
      opacity: 0.64,
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
