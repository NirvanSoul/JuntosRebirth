export function distributeDonutSegmentLengths(
  values: readonly number[],
  circumference: number,
  minimumAllocation: number,
): number[] {
  const lengths = values.map(() => 0);
  const positiveIndices = values
    .map((value, index) => ({ index, value }))
    .filter(({ value }) => value > 0)
    .map(({ index }) => index);
  const totalValue = positiveIndices.reduce(
    (total, index) => total + values[index]!,
    0,
  );

  if (circumference <= 0 || totalValue <= 0) {
    return lengths;
  }

  const effectiveMinimum = Math.min(
    Math.max(minimumAllocation, 0),
    circumference / positiveIndices.length,
  );
  let remainingIndices = positiveIndices;
  let remainingCircumference = circumference;
  let remainingValue = totalValue;

  while (remainingIndices.length > 0) {
    const undersizedIndices = remainingIndices.filter(
      (index) =>
        (values[index]! / remainingValue) * remainingCircumference <
        effectiveMinimum,
    );

    if (undersizedIndices.length === 0) {
      remainingIndices.forEach((index) => {
        lengths[index] =
          (values[index]! / remainingValue) * remainingCircumference;
      });
      break;
    }

    undersizedIndices.forEach((index) => {
      lengths[index] = effectiveMinimum;
      remainingCircumference -= effectiveMinimum;
      remainingValue -= values[index]!;
    });
    const undersizedSet = new Set(undersizedIndices);
    remainingIndices = remainingIndices.filter(
      (index) => !undersizedSet.has(index),
    );
  }

  const allocatedCircumference = lengths.reduce(
    (total, length) => total + length,
    0,
  );
  const correction = circumference - allocatedCircumference;
  const largestIndex = positiveIndices.reduce((largest, index) =>
    values[index]! > values[largest]! ? index : largest,
  );
  lengths[largestIndex] = lengths[largestIndex]! + correction;

  return lengths;
}
