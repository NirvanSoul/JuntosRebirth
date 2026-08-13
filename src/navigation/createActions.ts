export const createActionTypes = [
  'income',
  'expense',
  'category',
  'import',
] as const;

export type CreateActionType = (typeof createActionTypes)[number];
