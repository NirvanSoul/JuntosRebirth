const combiningDiacriticalMarksStart = 0x0300;
const combiningDiacriticalMarksEnd = 0x036f;

/** Minúsculas y sin diacríticos, para comparar sin importar acentos. */
export function normalizeSearchText(value: string): string {
  return Array.from(value.normalize('NFD'))
    .filter((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return (
        codePoint < combiningDiacriticalMarksStart ||
        codePoint > combiningDiacriticalMarksEnd
      );
    })
    .join('')
    .toLowerCase();
}
