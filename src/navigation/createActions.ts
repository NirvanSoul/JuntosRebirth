export const createActionTypes = ['income', 'expense', 'category'] as const;

export type CreateActionType = (typeof createActionTypes)[number];
