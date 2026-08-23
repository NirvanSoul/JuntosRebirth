import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
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
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'CreateFirstCategory'
>;

const categoryIllustrationAspectRatio = 1268 / 1208;
const minimumOnboardingCategories = 3;

function categoryRequirementMessage(remainingCategories: number): string {
  if (remainingCategories === 1) {
    return 'Te falta 1 categoría para continuar.';
  }

  return `Te faltan ${remainingCategories} categorías para continuar.`;
}

function appendMissingCategories(
  current: readonly Category[],
  incoming: readonly Category[],
): readonly Category[] {
  const currentIds = new Set(current.map((category) => category.id));

  return [
    ...current,
    ...incoming.filter((category) => !currentIds.has(category.id)),
  ];
}

/** Si el usuario escribió nombre y apellido (o varios nombres), solo se usa el primero. */
function firstNameFrom(displayName: string | null): string {
  if (!displayName) return '';
  const [first] = displayName.trim().split(/\s+/);
  return first ?? '';
}

export function CreateFirstCategoryScreen({ navigation }: Props) {
  const { activeSpace } = useSpaces();
  const [firstName, setFirstName] = useState('');
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [isQuickCreateVisible, setQuickCreateVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isCustomVisible, setCustomVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getLocalProfile().then((profile) => {
      if (isMounted) setFirstName(firstNameFrom(profile.displayName));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Parte de lo que ya existe en la base de datos, no de un array local
  // vacío: así el estado de "ya creada" que deshabilita una plantilla en el
  // selector siempre refleja la realidad y no permite crear la misma
  // categoría dos veces.
  useEffect(() => {
    let isMounted = true;
    void listLocalCategories().then((all) => {
      if (!isMounted) return;
      setCategories((current) =>
        appendMissingCategories(
          current,
          all.filter(
            (category) =>
              category.spaceId === activeSpace.id && !category.isArchived,
          ),
        ),
      );
    });
    return () => {
      isMounted = false;
    };
  }, [activeSpace.id]);

  const finishWithCategories = (created: readonly Category[]) => {
    const nextCategories = appendMissingCategories(categories, created);
    setCategories(nextCategories);
    setCustomVisible(false);
    setPickerVisible(false);

    if (nextCategories.length >= minimumOnboardingCategories) {
      navigation.navigate('AddFirstIncome');
    }
  };

  const remainingCategories = Math.max(
    0,
    minimumOnboardingCategories - categories.length,
  );

  const handleCreateTemplates = async (
    definitions: readonly DefaultCategoryDefinition[],
  ) => {
    setError(null);
    try {
      const created = await createLocalCategories(
        definitions.map((definition) =>
          createDefaultCategoryInputForSpace(activeSpace.id, definition),
        ),
      );
      finishWithCategories(created);
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
      finishWithCategories([created]);
    } catch {
      setError('No pudimos crear la categoría. Inténtalo de nuevo.');
    }
  };

  return (
    <>
      <OnboardingScreenLayout
        footerAccessory={
          <FloatingCreateButton
            onPress={() => setQuickCreateVisible(true)}
            placement="inline"
          />
        }
        onBack={() => navigation.goBack()}
        currentStep={6}
        illustrationAspectRatio={categoryIllustrationAspectRatio}
        illustrationSource={require('../../../../assets/Onboarding/6 Crea tu categoria.png')}
        subtitle="Crea al menos 3 categorías para organizar tus gastos e ingresos y entender mejor en qué usas tu dinero."
        testID="onboarding-create-category"
        title={
          firstName
            ? `¡Empecemos, ${firstName}!\nCrea tus primeras categorías`
            : 'Empecemos\nCrea tus primeras categorías'
        }
      >
        {remainingCategories > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            align="center"
            testID="onboarding-category-requirement"
            tone="secondary"
            variant="footnote"
          >
            {categoryRequirementMessage(remainingCategories)}
          </Text>
        ) : null}
        {error ? (
          <Text align="center" tone="expense" variant="footnote">
            {error}
          </Text>
        ) : null}
      </OnboardingScreenLayout>
      <QuickCreateMenu
        disabledActionTypes={['income', 'expense', 'import']}
        onClose={() => setQuickCreateVisible(false)}
        onSelect={(action) => {
          if (action !== 'category') return;
          setQuickCreateVisible(false);
          setPickerVisible(true);
        }}
        visible={isQuickCreateVisible}
      />
      <CategoryPickerModal
        categories={categories}
        mode="create"
        onClose={() => setPickerVisible(false)}
        onCreateCategory={() => setCustomVisible(true)}
        onCreateTemplates={(definitions) =>
          void handleCreateTemplates(definitions)
        }
        onSelect={() => undefined}
        selectedCategoryId={null}
        visible={isPickerVisible}
      />
      <CreateCategoryModal
        categories={categories}
        onClose={() => setCustomVisible(false)}
        onSubmit={(input) => void handleCreateCustomCategory(input)}
        spaceId={activeSpace.id}
        spaceName={activeSpace.name}
        visible={isCustomVisible}
      />
    </>
  );
}
