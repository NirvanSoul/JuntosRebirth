export const createActionTypes = [
  'income',
  'expense',
  'category',
  'import',
  'currency-exchange',
] as const;

export type CreateActionType = (typeof createActionTypes)[number];
