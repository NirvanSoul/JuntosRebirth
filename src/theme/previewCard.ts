import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const previewScale = 1.1;

export const previewCardLayout = {
  scale: previewScale,
  listGap: spacing.sm,
  minHeight: 56 * previewScale,
  iconSize: 40 * previewScale,
  glyphSize: iconSize.md * previewScale,
  gap: spacing.sm * previewScale,
  borderRadius: radii.lg * previewScale,
  iconRadius: radii.md * previewScale,
  directionIconRadius: radii.sm + spacing.xxs,
  paddingHorizontal: spacing.sm * previewScale,
  paddingVertical: spacing.xs * previewScale,
  metadataGap: spacing.xs * previewScale,
} as const;
