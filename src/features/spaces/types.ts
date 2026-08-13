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

/**
 * Un invitado nuevo arranca solo con el espacio Personal. Un espacio
 * `type: 'couple'` real solo existe tras crearlo o aceptarlo de verdad vía
 * `useSpaces`/`supabaseInvitationGateway` — nunca como valor de fábrica, para
 * no consumir en silencio el cupo de "un espacio juntos por usuario" que
 * aplica el servidor.
 */
export const initialSpacesState: SpacesState = {
  activeSpaceId: personalSpace.id,
  spaces: [personalSpace],
};
