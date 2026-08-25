// Edge Function: send-space-invitation-push
//
// Quien creó una invitación dirigida puede solicitar su aviso una sola vez.
// La función no confía en un correo ni en un token enviados por el cliente:
// valida la invitación con el JWT y resuelve los dispositivos mediante una
// función reservada a service_role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ExpoPushTicket = {
  status?: 'ok' | 'error';
  details?: { error?: string };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Falta Authorization' }, 401);

  const body = await req.json().catch(() => null);
  const invitationId =
    body && typeof body === 'object' && 'invitationId' in body
      ? body.invitationId
      : null;
  if (typeof invitationId !== 'string') {
    return json({ error: 'Falta invitationId' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

  const { data: invitation, error: invitationError } = await userClient
    .from('space_invitations')
    .select('id')
    .eq('id', invitationId)
    .eq('invited_by', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (invitationError || !invitation) {
    return json({ error: 'Invitación no disponible' }, 404);
  }

  const { data: claimed, error: claimError } = await adminClient.rpc(
    'claim_space_invitation_push',
    { p_invitation_id: invitationId },
  );
  const recipientUserId =
    claimed && typeof claimed === 'object' && 'recipientUserId' in claimed
      ? claimed.recipientUserId
      : null;
  if (claimError) return json({ error: 'No pudimos preparar el aviso' }, 500);
  if (typeof recipientUserId !== 'string') {
    return json({ notifiedDevices: 0 });
  }

  const { data: devices, error: devicesError } = await adminClient
    .from('user_push_tokens')
    .select('expo_push_token')
    .eq('user_id', recipientUserId)
    .limit(100);
  if (devicesError)
    return json({ error: 'No pudimos leer los dispositivos' }, 500);
  if (!devices?.length) return json({ notifiedDevices: 0 });

  const messages = devices.map(({ expo_push_token }) => ({
    to: expo_push_token,
    title: 'Nueva invitación en Juntoss',
    body: 'Te invitaron a compartir un espacio. Abre la app para responder.',
    sound: 'default',
    channelId: 'space-invitations',
    data: { type: 'space_invitation', invitationId },
  }));
  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!expoResponse.ok) return json({ error: 'Expo rechazó el aviso' }, 502);

  const expoBody = (await expoResponse.json()) as { data?: ExpoPushTicket[] };
  const invalidTokens = devices
    .filter(
      (_, index) =>
        expoBody.data?.[index]?.details?.error === 'DeviceNotRegistered',
    )
    .map(({ expo_push_token }) => expo_push_token);
  if (invalidTokens.length > 0) {
    await adminClient
      .from('user_push_tokens')
      .delete()
      .in('expo_push_token', invalidTokens);
  }

  const notifiedDevices =
    expoBody.data?.filter((ticket) => ticket.status === 'ok').length ?? 0;
  return json({ notifiedDevices });
});
