import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { CategoryPickerModal } from '@/features/categories/components/CategoryPickerModal/CategoryPickerModal';
import { CreateCategoryModal } from '@/features/categories/components/CreateCategoryModal/CreateCategoryModal';
import {
  createDefaultCategoryInputForSpace,
  type DefaultCategoryDefinition,
} from '@/features/categories/constants/defaultCategories';
import {
  createLocalCategories,
  createLocalCategory,
  listLocalCategories,
} from '@/features/categories/repositories/localCategoryRepository';
import type {
  Category,
  CreateCategoryInput,
} from '@/features/categories/types';
import { validateCategoryName } from '@/features/categories/utils/categoryCatalog';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import { CreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import { createLocalTransaction } from '@/features/transactions/repositories/localTransactionRepository';
import type {
  CreateTransactionDraft,
  TransactionType,
} from '@/features/transactions/types';
import { defaultCurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencyPreferences } from '@/state/appPreferences/useCurrencyPreferences';

type AddFirstTransactionStepProps = {
  actionLabel: string;
  currentStep: number;
  illustrationAspectRatio?: number;
  illustrationScale?: number;
  illustrationSource?: ImageSourcePropType;
  onBack: () => void;
  onSaved: () => void;
  spaceId: string;
  spaceName: string;
  subtitle: string;
  testID: string;
  title: string;
  type: TransactionType;
};

/**
 * Paso compartido de "añade tu primer ingreso/gasto": reutiliza los mismos
 * `CreateTransactionModal`, `CategoryPickerModal` y `CreateCategoryModal` del
 * resto de la app, solo con el selector de tipo del formulario oculto.
 */
export function AddFirstTransactionStep({
  actionLabel,
  currentStep,
  illustrationAspectRatio,
  illustrationScale,
  illustrationSource,
  onBack,
  onSaved,
  spaceId,
  spaceName,
  subtitle,
  testID,
  title,
  type,
}: AddFirstTransactionStepProps) {
  const { activeCurrencies, isReady } = useCurrencyPreferences();
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isCustomVisible, setCustomVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void listLocalCategories().then((all) => {
      if (!isMounted) return;
      const spaceCategories = all.filter(
        (category) => category.spaceId === spaceId && !category.isArchived,
      );
      setCategories(spaceCategories);
    });
    return () => {
      isMounted = false;
    };
  }, [spaceId]);

  const handleCreateTemplates = async (
    definitions: readonly DefaultCategoryDefinition[],
  ) => {
    const existingKeys = new Set(
      categories.map((category) => category.templateKey),
    );
    const pending = definitions.filter(
      (definition) => !existingKeys.has(definition.key),
    );
    if (pending.length === 0) return;

    setError(null);
    try {
      const created = await createLocalCategories(
        pending.map((definition) =>
          createDefaultCategoryInputForSpace(spaceId, definition),
        ),
      );
      setCategories((current) => [...current, ...created]);
      setSelectedCategory(created[0] ?? null);
      setPickerVisible(false);
    } catch {
      setError('No pudimos crear las categorías. Inténtalo de nuevo.');
    }
  };

  const handleCreateCustomCategory = async (input: CreateCategoryInput) => {
    const validation = validateCategoryName(
      input.name,
      categories,
      input.spaceId,
    );
    if (!validation.valid) return;

    setError(null);
    try {
      const created = await createLocalCategory({
        spaceId: input.spaceId,
        name: validation.name,
        icon: input.icon,
        colorToken: input.colorToken,
        isDefault: false,
      });
      setCategories((current) => [...current, created]);
      setSelectedCategory(created);
      setCustomVisible(false);
      setPickerVisible(false);
    } catch {
      setError('No pudimos crear la categoría. Inténtalo de nuevo.');
    }
  };

  const handleSubmit = async (draft: CreateTransactionDraft) => {
    if (draft.spaceId !== spaceId) return;

    setError(null);
    try {
      await createLocalTransaction(draft);
      setModalVisible(false);
      onSaved();
    } catch {
      setError('No pudimos guardar el movimiento. Inténtalo de nuevo.');
    }
  };

  return (
    <>
      <OnboardingScreenLayout
        actionDisabled={!isReady}
        actionLabel={actionLabel}
        onAction={() => {
          if (isReady) {
            setModalVisible(true);
          }
        }}
        onBack={onBack}
        currentStep={currentStep}
        illustrationAspectRatio={illustrationAspectRatio}
        illustrationScale={illustrationScale}
        illustrationSource={illustrationSource}
        subtitle={subtitle}
        testID={testID}
        title={title}
      >
        {error ? (
          <Text align="center" tone="expense" variant="footnote">
            {error}
          </Text>
        ) : null}
      </OnboardingScreenLayout>
      <CreateTransactionModal
        activeSpaceId={spaceId}
        availableCurrencies={activeCurrencies}
        hideTypeToggle
        onClose={() => setModalVisible(false)}
        onOpenCategoryPicker={() => setPickerVisible(true)}
        onSubmit={(draft) => void handleSubmit(draft)}
        onTypeChange={() => undefined}
        selectedCategory={selectedCategory}
        spaceCurrency={activeCurrencies[0] ?? defaultCurrencyCode}
        type={type}
        visible={isModalVisible}
      />
      <CategoryPickerModal
        categories={categories}
        mode="select"
        onClose={() => setPickerVisible(false)}
        onCreateCategory={() => setCustomVisible(true)}
        onCreateTemplates={(definitions) =>
          void handleCreateTemplates(definitions)
        }
        onSelect={(selection) => {
          if (selection) {
            const found = categories.find(
              (category) => category.id === selection.categoryId,
            );
            if (found) setSelectedCategory(found);
          }
          setPickerVisible(false);
        }}
        selectedCategoryId={selectedCategory?.id ?? null}
        visible={isPickerVisible}
      />
      <CreateCategoryModal
        categories={categories}
        onClose={() => setCustomVisible(false)}
        onSubmit={(input) => void handleCreateCustomCategory(input)}
        spaceId={spaceId}
        spaceName={spaceName}
        visible={isCustomVisible}
      />
    </>
  );
}
