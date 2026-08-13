-- Bloqueo temporal tras intentos fallidos de inicio de sesión
-- (Bible/ROADMAP.md Fase 7, ADR-075). Registra intentos fallidos por
-- correo y bloquea 1 hora al llegar a 9. La tabla no expone ninguna
-- política a `anon`/`authenticated`: solo la Edge Function
-- `login-with-lockout` la toca, usando la service role key (que ignora
-- RLS). Esto es intencional: el conteo de intentos solo tiene sentido si
-- se actualiza junto con la validación real de la contraseña contra
-- GoTrue, que ocurre dentro de esa función, no en una llamada RPC que un
-- cliente pudiera invocar por separado.

create table public.login_attempts (
  email text primary key check (email = lower(btrim(email))),
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;

-- Sin políticas: ni anon ni authenticated pueden leer ni escribir esta
-- tabla directamente. Solo la service role (Edge Function) la usa.
revoke all on public.login_attempts from anon, authenticated;
