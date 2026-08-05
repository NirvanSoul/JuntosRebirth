import type {
  SessionTransaction,
  TransactionRecurrence,
} from '@/features/transactions/types';

export type AutomaticTransactionRecurrence = Exclude<
  TransactionRecurrence,
  'custom' | 'once'
>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const projectedTransactionIdPrefix = 'projected-occurrence:';

export type ProjectedTransactionIdentity = {
  occurredOn: string;
  seriesId: string;
};

export function createProjectedTransactionId(
  seriesId: string,
  occurredOn: string,
): string {
  return `${projectedTransactionIdPrefix}${seriesId}:${occurredOn}`;
}

export function parseProjectedTransactionId(
  transactionId: string,
): ProjectedTransactionIdentity | null {
  if (!transactionId.startsWith(projectedTransactionIdPrefix)) return null;

  const identity = transactionId.slice(projectedTransactionIdPrefix.length);
  const separatorIndex = identity.lastIndexOf(':');
  if (separatorIndex <= 0) return null;

  const seriesId = identity.slice(0, separatorIndex);
  const occurredOn = identity.slice(separatorIndex + 1);
  if (!seriesId || !isValidLocalDate(occurredOn)) return null;

  return { occurredOn, seriesId };
}

export function isValidLocalDate(date: string): boolean {
  if (!datePattern.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const candidate = new Date(year!, month! - 1, day!);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month! - 1 &&
    candidate.getDate() === day
  );
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(year!, month! - 1, day!);
  result.setDate(result.getDate() + days);
  return formatLocalDate(result);
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const firstOfTargetMonth = new Date(year!, month! - 1 + months, 1);
  const lastDay = new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth() + 1,
    0,
  ).getDate();
  firstOfTargetMonth.setDate(Math.min(day!, lastDay));
  return formatLocalDate(firstOfTargetMonth);
}

export function getRecurrenceOccurrenceDate(
  startsOn: string,
  frequency: AutomaticTransactionRecurrence,
  occurrenceIndex: number,
): string {
  if (!isValidLocalDate(startsOn) || occurrenceIndex < 0) {
    throw new Error('La fecha de recurrencia no es válida');
  }

  if (frequency === 'weekly') return addDays(startsOn, occurrenceIndex * 7);
  if (frequency === 'biweekly') return addDays(startsOn, occurrenceIndex * 15);
  return addMonths(startsOn, occurrenceIndex);
}

export function normalizeCustomOccurrenceDates(
  dates: readonly string[],
): string[] {
  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.some((date) => !isValidLocalDate(date))) {
    throw new Error('Las fechas personalizadas no son válidas');
  }
  return uniqueDates.sort((left, right) => left.localeCompare(right));
}

type UpcomingTransactionDatesInput = {
  count: number;
  today?: string;
  transaction: SessionTransaction;
  transactions: readonly SessionTransaction[];
};

export function getLocalToday(): string {
  return formatLocalDate(new Date());
}

export function getUpcomingTransactionDates({
  count,
  today = getLocalToday(),
  transaction,
  transactions,
}: UpcomingTransactionDatesInput): string[] {
  const requestedCount = Math.max(0, Math.floor(count));
  if (requestedCount === 0 || transaction.recurrence === 'once') return [];

  if (transaction.recurrence === 'custom') {
    if (!transaction.recurrenceGroupId) return [];

    const futureDates = transactions
      .filter(
        (candidate) =>
          candidate.recurrenceGroupId === transaction.recurrenceGroupId &&
          candidate.occurredOn > today,
      )
      .map((candidate) => candidate.occurredOn);
    return [...new Set(futureDates)]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, requestedCount);
  }

  if (!transaction.nextOccurrenceOn) return [];

  const frequency = transaction.recurrence as AutomaticTransactionRecurrence;
  const startsOn = transaction.recurrenceStartsOn ?? transaction.occurredOn;
  let occurrenceIndex = 0;
  let occurrenceDate = getRecurrenceOccurrenceDate(
    startsOn,
    frequency,
    occurrenceIndex,
  );

  while (occurrenceDate < transaction.nextOccurrenceOn) {
    occurrenceIndex += 1;
    occurrenceDate = getRecurrenceOccurrenceDate(
      startsOn,
      frequency,
      occurrenceIndex,
    );
  }

  return Array.from({ length: requestedCount }, (_, offset) =>
    offset === 0
      ? transaction.nextOccurrenceOn!
      : getRecurrenceOccurrenceDate(
          startsOn,
          frequency,
          occurrenceIndex + offset,
        ),
  );
}

type ProjectRecurringTransactionsInput = {
  endOn: string;
  startOn?: string;
  transactions: readonly SessionTransaction[];
};

export function projectRecurringTransactions({
  endOn,
  startOn,
  transactions,
}: ProjectRecurringTransactionsInput): SessionTransaction[] {
  const projected = [...transactions];
  const templatesBySeries = new Map<string, SessionTransaction>();
  const existingOccurrences = new Set<string>();

  for (const transaction of transactions) {
    if (
      !transaction.recurrenceSeriesId ||
      (transaction.recurrence !== 'weekly' &&
        transaction.recurrence !== 'biweekly' &&
        transaction.recurrence !== 'monthly')
    ) {
      continue;
    }

    existingOccurrences.add(
      `${transaction.recurrenceSeriesId}:${transaction.occurredOn}`,
    );
    const currentTemplate = templatesBySeries.get(
      transaction.recurrenceSeriesId,
    );
    if (
      !currentTemplate ||
      transaction.occurredOn > currentTemplate.occurredOn
    ) {
      templatesBySeries.set(transaction.recurrenceSeriesId, transaction);
    }
  }

  for (const [seriesId, template] of templatesBySeries) {
    if (!template.nextOccurrenceOn || template.nextOccurrenceOn > endOn) {
      continue;
    }

    const frequency = template.recurrence as AutomaticTransactionRecurrence;
    const startsOn = template.recurrenceStartsOn ?? template.occurredOn;
    let occurrenceIndex = 0;
    let occurrenceDate = getRecurrenceOccurrenceDate(
      startsOn,
      frequency,
      occurrenceIndex,
    );

    while (occurrenceDate < template.nextOccurrenceOn) {
      occurrenceIndex += 1;
      occurrenceDate = getRecurrenceOccurrenceDate(
        startsOn,
        frequency,
        occurrenceIndex,
      );
    }

    while (occurrenceDate <= endOn) {
      const occurrenceKey = `${seriesId}:${occurrenceDate}`;
      if (
        (!startOn || occurrenceDate >= startOn) &&
        !existingOccurrences.has(occurrenceKey)
      ) {
        projected.push({
          ...template,
          id: createProjectedTransactionId(seriesId, occurrenceDate),
          occurredOn: occurrenceDate,
          nextOccurrenceOn: getRecurrenceOccurrenceDate(
            startsOn,
            frequency,
            occurrenceIndex + 1,
          ),
        });
        existingOccurrences.add(occurrenceKey);
      }
      occurrenceIndex += 1;
      occurrenceDate = getRecurrenceOccurrenceDate(
        startsOn,
        frequency,
        occurrenceIndex,
      );
    }
  }

  return projected.sort((left, right) =>
    right.occurredOn.localeCompare(left.occurredOn),
  );
}
