export const createActionTypes = [
  'income',
  'expense',
  'category',
  'moneyAccount',
  'import',
] as const;

export type CreateActionType = (typeof createActionTypes)[number];
