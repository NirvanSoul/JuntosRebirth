# GOOGLE_DATA_SAFETY_CHECKLIST.md

> Checklist del §53 de `Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md`. Última actualización: 2026-08-07.

- [ ] **Privacy Policy** — pendiente de publicar `Legal/site/privacy.html` en `aoraestudio.com` (paso manual).
- [ ] **Data Safety** — inventario listo en `docs/privacy/DATA_INVENTORY.md`; declarar en Play Console: datos financieros y de identificación recogidos y procesados, no compartidos con terceros, cifrado en tránsito, el usuario puede solicitar el borrado.
- [x] **SDKs incluidos** — `docs/privacy/SDK_INVENTORY.md`; sin SDKs de terceros con fines publicitarios o analíticos hoy.
- [x] **Eliminación dentro de la app** — `Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos`.
- [ ] **URL web de eliminación** — generada en `Legal/site/account-delete.html`; pendiente de publicar en `aoraestudio.com/account/delete` (o ruta equivalente) y enlazarla en Play Console.
- [ ] **Financial Features Declaration** — `PLAY_CONSOLE_FINANCIAL_FEATURES_REVIEW_REQUIRED`: Juntos organiza gastos/ingresos introducidos manualmente y no mueve dinero real ni ofrece préstamos/inversión, pero Google trata las funciones financieras de forma amplia; confirmar en consola si corresponde declarar la app como financiera antes de publicar.
- [x] **Target audience** — audiencia objetivo definida: a partir de 14 años, sin contenido sensible ni dirigido a menores. Declarar en Play Console según https://support.google.com/googleplay/android-developer/answer/9867159.
- [x] **Ads declaration** — no aplica: no hay anuncios.
- [x] **Families** — no aplica mientras la audiencia objetivo no incluya menores.
- [ ] **Prominent disclosures** — no hay recogida de datos sensibles inesperada hoy; revisar de nuevo si se añade una función nueva que lo requiera.
- [x] **Permisos justificados** — solo se solicita el permiso de notificaciones, y solo cuando el usuario activa un recordatorio.
- [ ] **CMP/UMP** — no aplica todavía; obligatorio antes de mostrar anuncios personalizados en EEE/UK/Suiza (ver `SDK_INVENTORY.md`).
- [x] **Cifrado en tránsito** — HTTPS con Supabase.
- [ ] **Política = código** — revisar esta lista completa cada vez que cambien datos, SDKs o permisos, antes de cada release (regla de la sección 24 del documento legal).
