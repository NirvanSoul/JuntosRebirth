export type ActivitySectionsPreference = {
  accountsExpanded: boolean;
  categoriesExpanded: boolean;
  categoryView: 'grid' | 'list';
};

export const defaultActivitySectionsPreference: ActivitySectionsPreference = {
  accountsExpanded: false,
  categoriesExpanded: false,
  categoryView: 'list',
};
