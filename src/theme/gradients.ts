const hexColorPattern = /^#([0-9a-f]{6})$/i;

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase();
}

export function lightenHexColor(color: string, amount = 0.28): string {
  const match = hexColorPattern.exec(color);

  if (!match) {
    return color;
  }

  const normalizedAmount = Math.min(Math.max(amount, 0), 1);
  const hex = match[1]!;
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  const lighterChannels = channels.map(
    (channel) => channel + (255 - channel) * normalizedAmount,
  );

  return `#${lighterChannels.map(toHexChannel).join('')}`;
}

export function createDiagonalGradient(
  color: string,
): readonly [string, string] {
  return [color, lightenHexColor(color)] as const;
}
