import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

export type Space = {
  id: string;
  name: string;
  type: 'personal' | 'couple' | 'other';
  currency: CurrencyCode;
  /**
   * Solo en `type: 'couple'`: la invitación sigue pendiente y la otra persona
   * todavía no ha entrado (`spaces.activated_at is null` en el servidor). Un
   * espacio juntos de una sola persona no admite movimientos: Inicio muestra
   * la pantalla de espera en su lugar.
   */
  isAwaitingPartner?: boolean;
};

/** Un espacio juntos donde la otra persona todavía no ha aceptado. */
export function isAwaitingPartnerSpace(space: Space): boolean {
  return space.type === 'couple' && space.isAwaitingPartner === true;
}

export type SpacesState = {
  activeSpaceId: string;
  spaces: readonly Space[];
};

export const personalSpace: Space = {
  id: 'personal',
  name: 'Personal',
  type: 'personal',
  currency: defaultCurrencyCode,
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
