export function parseAmountMinor(value: string): number {
  const [whole = '0', decimals = ''] = value.split(',');
  const normalizedDecimals = `${decimals}00`.slice(0, 2);

  return Number(whole) * 100 + Number(normalizedDecimals);
}

export function formatAmountInputForDisplay(value: string): string {
  const [whole = '0', decimals] = value.split(',');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimals === undefined) return groupedWhole;

  return `${groupedWhole},${decimals || '0'}`;
}

export function amountMinorToInput(amountMinor: number): string {
  const safeAmount = Math.max(0, Math.round(amountMinor));
  const whole = Math.floor(safeAmount / 100);
  const decimals = safeAmount % 100;

  return decimals === 0
    ? String(whole)
    : `${whole},${String(decimals).padStart(2, '0').replace(/0$/, '')}`;
}

export function appendAmountKey(value: string, key: string): string {
  if (key === ',') return value.includes(',') ? value : `${value},`;

  const [, decimals = ''] = value.split(',');
  if (value.includes(',') && decimals.length >= 2) return value;
  if (value === '0') return key;

  return `${value}${key}`;
}
