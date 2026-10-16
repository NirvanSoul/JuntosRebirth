# GOOGLE_DATA_SAFETY_CHECKLIST.md

> Checklist de publicación. Última actualización: 2026-10-16.

- [ ] **Privacy Policy** — pendiente de publicar `Legal/site/privacy.html` en `aoraestudio.com` (paso manual).
- [ ] **Data Safety** — declarar los datos financieros y de identificación del servicio y, para usuarios que consientan Microsoft Clarity, _Device or other IDs_, _App interactions_ y _Performance data_ con finalidad de analítica. Confirmar con revisión legal si el tratamiento de Microsoft entra en la excepción de proveedor de servicios o debe marcarse como datos compartidos.
- [x] **SDKs incluidos** — `@microsoft/react-native-clarity` presta analítica opcional; no hay SDKs publicitarios.
- [x] **Eliminación dentro de la app** — `Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos`.
- [ ] **URL web de eliminación** — generada en `Legal/site/account-delete.html`; pendiente de publicar en `aoraestudio.com/account/delete` (o ruta equivalente) y enlazarla en Play Console.
- [ ] **Financial Features Declaration** — `PLAY_CONSOLE_FINANCIAL_FEATURES_REVIEW_REQUIRED`: Juntos organiza gastos/ingresos introducidos manualmente y no mueve dinero real ni ofrece préstamos/inversión, pero Google trata las funciones financieras de forma amplia; confirmar en consola si corresponde declarar la app como financiera antes de publicar.
- [x] **Target audience** — audiencia objetivo definida: a partir de 14 años, sin contenido sensible ni dirigido a menores. Declarar en Play Console según https://support.google.com/googleplay/android-developer/answer/9867159.
- [x] **Ads declaration** — no aplica: no hay anuncios.
- [x] **Families** — no aplica mientras la audiencia objetivo no incluya menores.
- [ ] **Prominent disclosures** — la preferencia explica la captura de pantallas, interacción, rendimiento e identificador técnico; verificar el flujo y el texto final en el build de tienda.
- [x] **Permisos justificados** — solo se solicita el permiso de notificaciones, y solo cuando el usuario activa un recordatorio.
- [ ] **CMP/UMP** — no aplica todavía; obligatorio antes de mostrar anuncios personalizados en EEE/UK/Suiza.
- [x] **Cifrado en tránsito** — HTTPS con Juntoss API.
- [ ] **Política = código** — revisar esta lista completa cada vez que cambien datos, SDKs o permisos, antes de cada release.
