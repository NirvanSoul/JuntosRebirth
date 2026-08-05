import type { AppearancePreference } from '@/theme/types';

export type AppPreferences = {
  appearance: AppearancePreference;
};

export const defaultAppPreferences: AppPreferences = {
  appearance: 'system',
};
