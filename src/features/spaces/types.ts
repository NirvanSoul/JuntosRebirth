export type Space = {
  id: string;
  name: string;
  type: 'personal' | 'couple' | 'other';
};

export type SpacesState = {
  activeSpaceId: string;
  spaces: readonly Space[];
};

export const personalSpace: Space = {
  id: 'personal',
  name: 'Personal',
  type: 'personal',
};

export const coupleSpace: Space = {
  id: 'juntos',
  name: 'Juntos',
  type: 'couple',
};

export const initialSpacesState: SpacesState = {
  activeSpaceId: personalSpace.id,
  spaces: [personalSpace, coupleSpace],
};
