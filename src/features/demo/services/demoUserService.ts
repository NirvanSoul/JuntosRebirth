import { randomUUID } from 'expo-crypto';

import { createLocalMoneyAccount } from '@/features/accounts/repositories/localMoneyAccountRepository';
import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { createLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import { assignDemoAuthorship } from '@/features/demo/repositories/demoAuthorshipRepository';
import { applyDemoExchangeSnapshots } from '@/features/demo/repositories/demoExchangeSnapshotRepository';
import {
  buildDemoScenario,
  type DemoScenario,
} from '@/features/demo/scenario/demoScenario';
import type { DemoSpacePlan } from '@/features/demo/scenario/demoScenarioTools';
import { buildDemoExchangeSnapshot } from '@/features/demo/utils/demoVenezuelaRates';
import {
  restoreRemoteProfileDisplayName,
  saveLocalProfileCountry,
} from '@/features/profile/repositories/localProfileRepository';
import { replaceSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { saveSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { personalSpace } from '@/features/spaces/types';
import { claimLocalCacheOwnership } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  createLocalTransaction,
  createLocalTransactions,
  updateLocalTransactionNote,
} from '@/features/transactions/repositories/localTransactionRepository';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { normalizeSearchText } from '@/lib/text/normalizeSearchText';
import {
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from '@/state/appPreferences/currencyPreferencesRepository';
import {
  clearDemoSession,
  getDemoSession,
  loadDemoSession,
  saveDemoSession,
} from '@/state/demoSession/demoSessionStore';

type SeededSpace = {
  partnerTransactionIds: string[];
  partnerSeriesIds: string[];
};

/**
 * Escribe un espacio del guion con los mismos repositorios que usa la app, de
 * modo que el demo pasa por las mismas validaciones que un dato real.
 */
async function seedSpace(
  spaceId: string,
  currency: CurrencyCode,
  plan: DemoSpacePlan,
): Promise<SeededSpace> {
  const categories = await createLocalCategories(
    plan.categories.map(({ key: _key, budgetMinor, ...category }) => ({
      ...category,
      ...(budgetMinor ? { budgets: { [currency]: { budgetMinor } } } : {}),
      spaceId,
    })),
  );
  const categoryIds = new Map(
    plan.categories.map((category, index) => [
      category.key,
      categories[index]!.id,
    ]),
  );
  const accountIds = new Map<string, string>();
  for (const { key, openingBalanceMinor, ...account } of plan.accounts) {
    const created = await createLocalMoneyAccount({
      ...account,
      spaceId,
      balances: [{ currency, openingBalanceMinor }],
    });
    accountIds.set(key, created.id);
  }

  const seeded: SeededSpace = {
    partnerTransactionIds: [],
    partnerSeriesIds: [],
  };
  const notes: { id: string; note: string }[] = [];
  const toDraft = (plan: DemoSpacePlan['transactions'][number]) => ({
    spaceId,
    type: plan.type,
    amountMinor: plan.amountMinor,
    currency: plan.currency ?? currency,
    title: plan.title,
    categoryId: categoryIds.get(plan.categoryKey)!,
    moneyAccountId: plan.accountKey
      ? accountIds.get(plan.accountKey)
      : undefined,
    occurredOn: plan.occurredOn,
    recurrence: plan.recurrence,
    customOccurrenceDates: plan.customOccurrenceDates,
  });

  const recurring = plan.transactions.filter((t) => t.recurrence !== 'once');
  for (const entry of recurring) {
    const created = await createLocalTransaction(toDraft(entry));
    if (entry.note) notes.push({ id: created[0]!.id, note: entry.note });
    if (entry.author !== 'partner') continue;
    seeded.partnerTransactionIds.push(...created.map((row) => row.id));
    const seriesId = created[0]!.recurrenceSeriesId;
    if (seriesId) seeded.partnerSeriesIds.push(seriesId);
  }

  const once = plan.transactions.filter((t) => t.recurrence === 'once');
  const created = await createLocalTransactions(once.map(toDraft));
  once.forEach((entry, index) => {
    const id = created[index]!.id;
    if (entry.note) notes.push({ id, note: entry.note });
    if (entry.author === 'partner') seeded.partnerTransactionIds.push(id);
  });

  for (const { id, note } of notes) {
    await updateLocalTransactionNote(id, spaceId, note);
  }
  return seeded;
}

async function seedDemoScenario(
  scenario: DemoScenario,
  ids: { selfUserId: string; partnerUserId: string; coupleSpaceId: string },
): Promise<void> {
  const { currency } = scenario;
  await saveCurrencyPreferences({ currencies: scenario.activeCurrencies });
  await saveSpaces({
    activeSpaceId: personalSpace.id,
    spaces: [
      { ...personalSpace, currency },
      {
        id: ids.coupleSpaceId,
        name: scenario.coupleSpaceName,
        type: 'couple',
        currency,
        isAwaitingPartner: false,
      },
    ],
  });
  await restoreRemoteProfileDisplayName(scenario.selfName);
  await saveLocalProfileCountry(scenario.countryCode);
  await replaceSpaceMemberProfiles(
    ids.coupleSpaceId,
    [
      { userId: ids.selfUserId, displayName: scenario.selfName },
      { userId: ids.partnerUserId, displayName: scenario.partnerName },
    ].map((member) => ({
      ...member,
      avatarPath: null,
      avatarUpdatedAt: null,
      avatarUri: null,
      defaultCurrency: currency,
    })),
  );

  await seedSpace(personalSpace.id, currency, scenario.personal);
  const couple = await seedSpace(ids.coupleSpaceId, currency, scenario.couple);
  await assignDemoAuthorship({
    selfUserId: ids.selfUserId,
    partnerUserId: ids.partnerUserId,
    ...couple,
  });
  if (scenario.isVenezuela) {
    await applyDemoExchangeSnapshots(buildDemoExchangeSnapshot);
  }
  // Si alguien llegara a iniciar sesión con una cuenta real sobre esta caché,
  // el marcador prueba que es de otra cuenta y la inicialización la descarta
  // en vez de subirla.
  await claimLocalCacheOwnership(await getLocalDatabase(), ids.selfUserId);
}

/**
 * Crea el usuario demo y abre su sesión local. Parte de una caché vacía: en
 * Acceso no hay ninguna cuenta real cuyos datos conservar.
 */
export async function createDemoUser(currency: CurrencyCode): Promise<void> {
  if (!__DEV__) throw new Error('El usuario demo solo existe en desarrollo.');
  if (await loadDemoSession())
    throw new Error('Ya hay un usuario demo activo.');

  const previousPreferences = await loadCurrencyPreferences();
  const scenario = buildDemoScenario({
    currency,
    today: getLocalTodayKey(),
    seed: Date.now() >>> 0,
  });
  const ids = {
    selfUserId: `demo-${randomUUID()}`,
    partnerUserId: `demo-${randomUUID()}`,
    coupleSpaceId: randomUUID(),
  };

  await discardBackedLocalSessionCache();
  try {
    await seedDemoScenario(scenario, ids);
  } catch (error) {
    await discardBackedLocalSessionCache().catch(() => undefined);
    await saveCurrencyPreferences(previousPreferences).catch(() => undefined);
    throw error;
  }

  // La sesión se abre al final: hasta aquí la navegación sigue en Acceso.
  await saveDemoSession({
    userId: ids.selfUserId,
    displayName: scenario.selfName,
    // `.invalid` es un dominio reservado: este correo nunca puede existir.
    email: `${normalizeSearchText(scenario.selfName)}@demo.juntoss.invalid`,
    partnerUserId: ids.partnerUserId,
    partnerDisplayName: scenario.partnerName,
    currency,
    createdAt: new Date().toISOString(),
    previousCurrencyPreferences: JSON.stringify(previousPreferences.currencies),
  });
}

/** Cierra la sesión demo y borra todo lo que creó en el dispositivo. */
export async function deleteDemoUser(): Promise<void> {
  const demoSession = getDemoSession();
  // Primero se cierra la sesión: la navegación vuelve a Acceso antes de que la
  // base desaparezca, igual que al cerrar una sesión real.
  await clearDemoSession();
  await discardBackedLocalSessionCache();
  const previous = demoSession?.previousCurrencyPreferences;
  if (previous) {
    const currencies = JSON.parse(previous) as CurrencyCode[];
    await saveCurrencyPreferences({ currencies });
  }
}
