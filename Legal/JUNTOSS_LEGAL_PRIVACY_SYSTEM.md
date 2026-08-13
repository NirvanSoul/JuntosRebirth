# JUNTOSS_LEGAL_PRIVACY_SYSTEM.md

> **Última revisión de investigación:** 7 de agosto de 2026  
> **Ámbito:** React Native · iOS · Android · Supabase · datos financieros · privacidad · consentimiento · publicidad  
> **Importante:** esta guía no sustituye asesoramiento jurídico. Los textos definitivos, bases legales, edades, transferencias, retención y jurisdicción deben revisarse antes del lanzamiento.

---

## 1. Objetivo

Este documento define cómo debe construirse el sistema legal y de privacidad de `juntoss`.

Debe ser leído antes de modificar:

- Política de privacidad.
- Términos de servicio.
- Consentimientos.
- Publicidad.
- Permisos.
- Eliminación de cuenta.
- Exportación de datos.
- Integraciones de terceros.
- App Store Connect.
- Google Play Console.
- Supabase.
- Analítica, logs y crash reporting.

La meta es que **lo que declara juntoss coincida con lo que realmente hace el código**.

---

## 2. Regla principal para agentes

> **NO redactar ni publicar textos legales definitivos antes de hacer un inventario real de datos, SDKs y flujos.**

Antes de generar una política, el agente debe inspeccionar:

- `package.json`
- dependencias nativas
- configuración iOS
- configuración Android
- Supabase
- tablas y funciones
- autenticación
- almacenamiento local
- notificaciones
- publicidad
- analítica
- crash reporting
- pagos
- permisos
- servicios externos

Debe separar siempre:

1. Datos locales.
2. Datos enviados al backend.
3. Datos recogidos por juntoss.
4. Datos recogidos por terceros.
5. Datos usados para funcionalidad.
6. Datos usados para publicidad, analítica o tracking.

---

## 3. La privacidad NO es un único checkbox

No implementar un checkbox genérico de:

> “Acepto los términos y la política de privacidad”

como sustituto de todo el consentimiento.

Separar:

### Términos de servicio

Pueden requerir aceptación para crear una cuenta o utilizar el servicio.

### Política de privacidad

Es principalmente un aviso de transparencia.

### Consentimientos opcionales

Deben pedirse por separado cuando correspondan:

- anuncios personalizados
- tracking
- marketing
- analítica opcional
- permisos no esenciales

### Permisos del sistema

Son independientes:

- notificaciones
- cámara
- fotos
- contactos
- ubicación

No solicitar permisos que la app no necesita.

---

## 4. Inventario inicial que debe verificarse

### Cuenta

Posibles datos:

- nombre
- correo
- ID de usuario
- metadatos de autenticación
- fechas técnicas

Supabase Auth debe gestionar credenciales. Nunca almacenar ni loggear contraseñas en texto plano.

### Modo invitado

Debe verificarse que:

- movimientos y categorías permanezcan locales
- no se escriba en Supabase antes del registro
- la migración a cuenta sea explícita
- no se envíen identificadores innecesarios

### Datos financieros

juntoss puede tratar:

- importe
- gasto o ingreso
- título
- categoría
- fecha
- recurrencia
- espacio
- autor
- reparto de gastos
- cantidades pendientes
- metas futuras

Google Play considera los datos financieros dentro de sus categorías de datos personales/sensibles.

### Regla interna de privacidad

No enviar por defecto importes, títulos, nombres de categorías, balances o nombres de espacios a:

- logs
- crash reports
- analítica
- URLs
- nombres de eventos
- herramientas de soporte

---

## 5. Pantalla legal dentro de Ajustes

Actualmente existe:

`Ajustes → Ayuda → Política de privacidad`

Esa fila debe reutilizarse como entrada al sistema legal.

### Regla visual

**NO rediseñar la tarjeta de Ayuda.**

No cambiar sin una tarea específica:

- radios
- colores
- tipografía
- chevrons
- separadores
- padding
- iconografía
- comportamiento táctil

La fila actual debe abrir una pantalla equivalente a:

`PrivacyLegalScreen`

---

## 6. Estructura de `PrivacyLegalScreen`

### Tu privacidad

- Cómo usamos tus datos
- Preferencias de privacidad
- Publicidad y consentimiento
- Permisos de la aplicación

### Tus datos

- Descargar mis datos
- Corregir información
- Eliminar cuenta y datos

### Documentos

- Política de privacidad
- Términos de servicio
- Licencias de código abierto

### Información

- Última actualización
- Versión del documento
- Contactar con privacidad

No mostrar filas sin funcionalidad real.

---

## 7. Reutilización del sistema de diseño — OBLIGATORIA

Antes de crear UI, buscar componentes existentes equivalentes a:

- `Screen`
- `SettingsSection`
- `SettingsCard`
- `SettingsRow`
- `ListRow`
- `IconContainer`
- `Chevron`
- `Divider`
- `ScreenHeader`
- `Text`
- `Button`
- `Modal`
- `ConfirmDialog`

Los nombres reales pueden ser distintos.

> Si ya existe un componente que resuelve el patrón de Ajustes, debe reutilizarse.

Está prohibido crear componentes duplicados como:

- `LegalSettingsRow`
- `PrivacySettingsRow`
- `NewSettingsCard`

solo porque la pantalla nueva sea legal.

### Componente nuevo justificable

Puede existir un componente genérico:

`LegalDocumentScreen`

para mostrar:

- Política de privacidad
- Términos
- otros avisos

No crear una pantalla diferente si el layout es idéntico.

---

## 8. Tokens visuales

No introducir:

- hexadecimales nuevos
- spacing inventado
- radios nuevos
- tamaños tipográficos nuevos
- sombras nuevas
- otra librería de iconos

Usar exclusivamente el sistema visual ya existente de juntoss.

---

## 9. Contenido mínimo de la Política de Privacidad

La política debe incluir:

1. Identidad del responsable.
2. Datos de contacto.
3. Qué datos se recogen.
4. De dónde provienen.
5. Para qué se usan.
6. Base jurídica cuando aplique.
7. Terceros y encargados.
8. Transferencias internacionales.
9. Retención.
10. Seguridad.
11. Derechos del usuario.
12. Retirada del consentimiento.
13. Eliminación de cuenta.
14. Publicidad y tracking.
15. Menores y edad objetivo.
16. Cambios de política.
17. Contacto y reclamaciones.

No inventar nombre legal, dirección, periodos de retención ni bases jurídicas.

Usar `LEGAL_REVIEW_REQUIRED` cuando una decisión no esté confirmada.

---

## 10. Terceros

Para cada proveedor crear una ficha:

```text
Proveedor:
Función:
Datos tratados:
Finalidad:
Ubicación:
Transferencia internacional:
DPA:
Retención:
Política:
```

Verificar al menos:

- Supabase
- proveedor de hosting
- AdMob
- analítica
- crash reporting
- correo
- push notifications
- tiendas
- pagos futuros

---

## 11. Transferencias internacionales

Verificar:

- región real de Supabase
- hosting
- subprocesadores
- ads
- analítica
- soporte
- correo

No asumir que usar un proveedor “compatible con GDPR” elimina las obligaciones del responsable.

---

## 12. Retención

Crear una tabla interna:

| Tipo            | Retención | Motivo        | Eliminación    |
| --------------- | --------- | ------------- | -------------- |
| Cuenta          | TBD       | servicio      | cuenta         |
| Movimientos     | TBD       | funcionalidad | usuario/cuenta |
| Logs            | TBD       | seguridad     | automática     |
| Consentimientos | TBD       | evidencia     | política       |
| Ads             | proveedor | publicidad    | proveedor      |

No publicar ningún `TBD` crítico.

---

## 13. Derechos del usuario

Diseñar un baseline que permita:

- conocer qué datos existen
- acceder
- corregir
- descargar
- eliminar
- eliminar la cuenta
- retirar consentimientos
- cambiar preferencias publicitarias
- contactar con privacidad

Esto cubre patrones comunes de GDPR, UK GDPR, LGPD, PIPEDA, APPs australianos y otras normativas.

---

## 14. Eliminación de cuenta — Apple

Apple exige que las apps que permiten crear cuentas permitan **iniciar su eliminación dentro de la app**.

No basta con:

- cerrar sesión
- desactivar
- pausar

La opción debe ser fácil de encontrar.

Fuente oficial:
https://developer.apple.com/support/offering-account-deletion-in-your-app/

---

## 15. Eliminación de cuenta — Google Play

Google Play exige, si la app permite crear cuentas:

1. una ruta dentro de la app para eliminar/solicitar eliminación
2. una URL web para solicitar la eliminación de cuenta y datos

Fuente:
https://support.google.com/googleplay/android-developer/answer/13327111

### Rutas recomendadas

```text
Ajustes → Cuenta → Eliminar cuenta
```

y

```text
Privacidad y datos → Eliminar cuenta y datos
```

Ambas reutilizan el mismo flujo.

---

## 16. Flujo de eliminación

1. Explicar consecuencias.
2. Confirmar.
3. Reautenticar si hace falta.
4. Ejecutar backend.
5. Eliminar/anonimizar según política.
6. Revocar sesiones.
7. Limpiar almacenamiento local.
8. Confirmar resultado.

No utilizar dark patterns.

---

## 17. Espacios compartidos

Eliminar una cuenta no implica necesariamente borrar sin contexto todos los datos compartidos.

Debe definirse:

- qué pasa con movimientos compartidos
- autoría
- integridad del espacio
- datos que ve el otro miembro
- qué se anonimiza
- qué debe eliminarse
- qué puede conservarse por obligación legal

Este punto requiere revisión legal y de producto.

---

## 18. Exportación de datos

Preparar:

`Descargar mis datos`

Posibles formatos:

- JSON
- CSV
- ZIP

No incluir datos personales de otros miembros salvo justificación clara.

---

# 19. Apple App Store

## Privacy Policy URL

Apple exige una URL pública de privacidad para iOS.

Debe:

- funcionar sin login
- usar HTTPS
- permanecer disponible
- coincidir con el comportamiento real

Fuente:
https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy

## App Privacy Details

Declarar datos recogidos por la app **y por terceros**.

Revisar especialmente, solo cuando corresponda:

- Contact Info
- User Content
- Financial Info
- Identifiers
- Usage Data
- Diagnostics
- Purchases
- Advertising Data

Fuente:
https://developer.apple.com/app-store/app-privacy-details/

---

## 20. Apple Privacy Manifest

Mantener:

`PrivacyInfo.xcprivacy`

Revisar:

- datos declarados
- Required Reason APIs
- SDK manifests
- firmas de SDKs requeridas
- reporte de privacidad de Xcode

Apple rechaza manifests inválidos y exige razones válidas para ciertas APIs.

Fuentes:

https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk

https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api

https://developer.apple.com/support/third-party-SDK-requirements/

---

## 21. App Tracking Transparency

Si juntoss o un SDK realiza tracking entre apps/sitios o utiliza datos para tracking según la definición de Apple, implementar ATT.

Debe existir:

`NSUserTrackingUsageDescription`

ATT no sustituye GDPR ni una CMP.

Fuente:
https://developer.apple.com/documentation/AppTrackingTransparency

---

## 22. Apple EULA

Apple aplica su EULA estándar si no se proporciona una personalizada.

Una EULA personalizada no es obligatoria por defecto.

No confundir:

- EULA
- Términos de juntoss
- Política de privacidad

Fuente:
https://developer.apple.com/help/app-store-connect/manage-app-information/provide-a-custom-license-agreement

---

# 23. Google Play

## Política de datos

Google exige transparencia sobre:

- acceso
- recogida
- uso
- tratamiento
- compartición

y exige proteger los datos personales/sensibles.

Fuente:
https://support.google.com/googleplay/android-developer/answer/10144311

---

## 24. Data Safety

Debe coincidir con:

- código
- SDKs
- backend
- anuncios
- analítica
- almacenamiento

Google deja claro que el desarrollador también es responsable por los SDKs integrados.

Fuente:
https://support.google.com/googleplay/android-developer/answer/10787469

### Regla de release

```text
Cambio de SDK/datos
→ DATA_INVENTORY
→ Política
→ Google Data Safety
→ Apple App Privacy
→ Release
```

---

## 25. Financial Features Declaration

Google Play considera servicios financieros de forma amplia, incluyendo funciones relacionadas con la gestión del dinero.

Antes de publicar:

`PLAY_CONSOLE_FINANCIAL_FEATURES_REVIEW_REQUIRED`

No asumir que no mover dinero real elimina la obligación de declarar.

Fuentes:

https://support.google.com/googleplay/android-developer/answer/9876821

https://support.google.com/googleplay/android-developer/answer/13849271

---

## 26. Divulgación destacada

Cuando una recogida de datos sensibles no sea razonablemente esperable, Google exige explicación dentro de la app **antes** del permiso/consentimiento.

Debe indicar:

- qué dato
- para qué
- si se comparte

No esconderlo solo en la política.

Fuente:
https://support.google.com/googleplay/android-developer/answer/10144311

---

# 27. AdMob y consentimiento

Si se usa AdMob:

- inventariar datos del SDK
- revisar consentimiento antes de inicializar ads
- no crear un CMP casero
- permitir cambiar preferencias

Google exige una **CMP certificada integrada con IAB TCF** para anuncios personalizados en:

- EEE
- Reino Unido
- Suiza

Google ofrece CMP + UMP.

Fuentes:

https://support.google.com/admob/answer/13554116

https://support.google.com/admob/answer/16918505

---

## 28. React Native + AdMob

Proyecto investigado:

`invertase/react-native-google-mobile-ads`

https://github.com/invertase/react-native-google-mobile-ads

Es un wrapper open source de Google Mobile Ads para iOS/Android y su proyecto actual incluye soporte de User Messaging Platform.

Si ya se utiliza para anuncios, preferir reutilizar su capa de consentimiento en lugar de instalar otra solución paralela.

---

## 29. Flujo de consentimiento de anuncios

```text
App inicia
→ actualizar estado de consentimiento
→ ¿se requiere mensaje?
   → sí: mostrar CMP
→ determinar si pueden pedirse anuncios
→ inicializar Mobile Ads
→ mostrar formato permitido
```

La funcionalidad esencial de juntoss debe seguir disponible si el usuario rechaza anuncios personalizados.

---

## 30. Preferencias

Añadir:

`Privacidad y datos → Preferencias de privacidad`

Debe permitir volver a abrir opciones de privacidad cuando la CMP lo permita.

No obligar a reinstalar la app para cambiar una decisión.

---

# 31. Menores y audiencia

Antes del release debe definirse la audiencia real.

Google Play exige declarar grupos de edad objetivo.

Si se incluyen menores, pueden activarse requisitos adicionales:

- Families Policy
- SDKs publicitarios certificados
- anuncios no personalizados para menores
- pantalla neutral de edad
- consentimiento parental según jurisdicción
- tratamiento especial de datos

No seleccionar grupos infantiles solo para estar “disponible para todos”.

Fuentes:

https://support.google.com/googleplay/android-developer/answer/9867159

https://support.google.com/googleplay/android-developer/answer/9893335

---

# 32. Baseline global

## Unión Europea — GDPR

Contemplar:

- responsable
- finalidades
- bases jurídicas
- destinatarios
- transferencias
- retención
- acceso
- rectificación
- supresión
- limitación
- portabilidad
- oposición
- retirada de consentimiento
- reclamación

Fuentes:

https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en

https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en

---

## Reino Unido

Mantener capacidades equivalentes al baseline europeo y revisar guías actualizadas del ICO.

https://ico.org.uk/

---

## California — CCPA/CPRA

Cuando aplique, revisar:

- acceso/conocimiento
- eliminación
- corrección
- opt-out de venta/sharing
- limitaciones sobre determinados usos sensibles

No mostrar “Do Not Sell or Share” si no corresponde jurídicamente.

https://oag.ca.gov/privacy/ccpa

---

## Brasil — LGPD

Soportar:

- información
- acceso
- corrección
- eliminación/bloqueo cuando proceda
- portabilidad
- información sobre compartición
- revocación de consentimiento

https://www.gov.br/anpd/

---

## Canadá — PIPEDA

Baseline:

- consentimiento significativo
- minimización
- finalidad
- seguridad
- acceso
- corrección
- retención limitada
- transparencia

https://www.priv.gc.ca/

---

## Australia — APPs

Revisar:

- categorías de datos
- finalidad
- acceso
- corrección
- reclamaciones
- transferencias internacionales
- seguridad

https://www.oaic.gov.au/privacy/australian-privacy-principles

---

## Singapur — PDPA

Revisar:

- finalidad
- notificación
- consentimiento
- acceso
- corrección
- seguridad
- retención
- transferencias
- incidentes

https://www.pdpc.gov.sg/

---

## Japón — APPI

Revisar:

- propósito
- terceros
- transferencias
- seguridad
- divulgación
- corrección
- cese/eliminación cuando corresponda

https://www.ppc.go.jp/en/

---

## India — DPDP

India publicó las Digital Personal Data Protection Rules 2025 y un calendario de entrada en vigor.

Revisar antes de lanzamiento:

- avisos
- consentimiento
- menores
- seguridad
- derechos
- transferencias
- obligaciones del Data Fiduciary

https://www.meity.gov.in/

---

# 33. Versionado legal

Cada documento debe tener:

```text
document_id
version
effective_date
last_updated
locale
```

Ejemplo:

```text
privacy-policy
2026.1
2026-09-01
2026-08-20
es-ES
```

---

## 34. Evidencia de aceptación de términos

Puede existir:

`legal_acceptances`

Campos sugeridos:

```text
id
user_id
document_type
document_version
accepted_at
app_version
locale
source
```

No recopilar IP, fingerprint o identificadores persistentes solo para “tener más evidencia” sin justificación legal.

---

## 35. Cambios materiales

No pedir nueva aceptación por una corrección ortográfica.

Revisar consentimiento/aceptación cuando haya:

- nueva finalidad
- nuevo tipo de dato
- nuevo tercero relevante
- tracking
- nueva publicidad
- cambio contractual importante

---

# 36. URLs legales

Los documentos deben existir públicamente.

Ejemplos:

```text
https://juntoss.app/privacy
https://juntoss.app/terms
https://juntoss.app/privacy/choices
https://juntoss.app/account/delete
```

El dominio final debe ser controlado por el publisher.

---

# 37. Open source investigado

## App Privacy Policy Generator

https://github.com/nisrulz/app-privacy-policy-generator

Observado:

- Android
- iOS
- web
- Privacy Policy
- Terms & Conditions
- modo GDPR
- exportación HTML/Markdown
- licencia AGPL-3.0

### Uso

Usarlo como:

- checklist
- estructura inicial
- borrador

No publicarlo sin adaptar y revisar.

Si se incorpora su código, revisar obligaciones AGPL-3.0.

---

## Privado

https://github.com/Privado-Inc/privado

Puede ayudar con:

- inventario
- flujos de datos
- terceros
- reportes de privacidad
- Data Safety

### Limitación observada

La versión OSS consultada indica Java/Python en GA y JS/TS como trabajo en progreso.

Como juntoss es React Native/TypeScript, verificar cobertura actual antes de depender de él.

---

## SDK Privacy Report

https://github.com/Privado-Inc/SDK-Privacy-Report

Proyecto comunitario con licencia MIT para consultar prácticas de privacidad de SDKs.

Usarlo solo como fuente secundaria.

Verificar siempre contra documentación oficial de cada SDK.

---

# 38. Inventarios internos obligatorios

Crear cuando se implemente esta fase:

```text
docs/privacy/DATA_INVENTORY.md
docs/privacy/SDK_INVENTORY.md
docs/privacy/PROCESSING_REGISTER.md
docs/privacy/APPLE_PRIVACY_CHECKLIST.md
docs/privacy/GOOGLE_DATA_SAFETY_CHECKLIST.md
docs/privacy/CONSENT_MATRIX.md
```

### DATA_INVENTORY

```md
| Dato | Fuente | Local/Cloud | Propósito | Proveedor | Compartido | Retención | Región | Base legal |
```

### SDK_INVENTORY

```md
## SDK

- Package:
- Version:
- Propósito:
- Datos:
- Tracking:
- Ads:
- Privacy manifest:
- Data Safety docs:
- DPA:
- Región:
- Licencia:
- Revisado:
```

---

# 39. Arquitectura React Native sugerida

```text
src/features/privacy/
├── screens/
│   ├── PrivacyLegalScreen.tsx
│   ├── LegalDocumentScreen.tsx
│   ├── PrivacyChoicesScreen.tsx
│   └── DataRightsScreen.tsx
├── components/
├── hooks/
├── services/
│   ├── consentService.ts
│   └── privacyRequestService.ts
├── model/
└── index.ts
```

Crear únicamente lo necesario para la fase actual.

---

# 40. No dispersar reglas regionales

Evitar:

```ts
if (country === "ES") ...
```

en componentes.

Centralizar lógica de privacidad/consentimiento en una capa única.

---

# 41. Notificaciones

Solicitar permiso cuando el usuario active una función que lo necesite.

Texto previo posible:

> Activa las notificaciones para que podamos recordarte los movimientos que tú elijas.

No usar frases vagas.

Como juntoss contiene datos financieros, añadir una opción futura:

`Mostrar importes en notificaciones`

Si está desactivada:

> Tienes un movimiento pendiente. Abre juntoss para ver los detalles.

---

# 42. Analítica

No enviar por defecto:

- importes
- balances
- títulos
- categorías personalizadas
- nombres de espacios

Eventos aceptables:

```text
transaction_created
category_created
onboarding_completed
```

Sin propiedades financieras sensibles.

---

# 43. Crash reporting y logs

Sanitizar:

- URLs
- request bodies
- breadcrumbs
- objetos de Supabase
- tokens
- movimientos
- categorías
- espacios

Prohibir:

```ts
console.log(transaction);
console.log(session);
```

en producción.

---

# 44. Supabase

Revisar:

- región
- DPA
- subprocesadores
- backups
- Auth
- Storage
- Edge Functions
- logs
- retención
- RLS

RLS debe proteger los datos aunque la UI falle.

---

# 45. Términos de servicio — estructura

Incluir:

1. proveedor
2. elegibilidad
3. cuenta
4. credenciales
5. licencia
6. uso permitido
7. uso prohibido
8. contenido del usuario
9. espacios compartidos
10. recordatorios
11. disponibilidad
12. publicidad
13. pagos futuros
14. propiedad intelectual
15. terceros
16. no asesoramiento financiero
17. terminación
18. eliminación
19. cambios
20. ley aplicable
21. contacto

Jurisdicción y limitaciones de responsabilidad requieren revisión legal.

---

# 46. No asesoramiento financiero

Los términos deben aclarar que juntoss:

- organiza información
- no garantiza resultados
- no sustituye asesoramiento profesional
- no es un banco
- no custodia fondos salvo futura modificación
- no ejecuta pagos salvo futura modificación

No repetir este disclaimer en cada pantalla.

---

# 47. Publicidad

La política debe explicar:

- que existe publicidad
- proveedor
- personalización
- opciones
- consentimiento regional
- cómo cambiar preferencias

Si se ofrece pago para quitar anuncios, explicar exactamente qué cambia.

---

# 48. Copy recomendado para la nueva pantalla

## Título

**Privacidad y datos**

## Subtítulo

> Tú decides cómo se utiliza tu información. Aquí puedes consultar nuestras políticas y gestionar tus datos.

### Cómo usamos tus datos

> Entiende qué información utiliza juntoss y para qué.

### Preferencias de privacidad

> Revisa o cambia tus decisiones de privacidad.

### Permisos de la aplicación

> Consulta por qué juntoss solicita determinados permisos.

### Descargar mis datos

> Obtén una copia de la información asociada a tu cuenta.

### Eliminar cuenta y datos

> Solicita la eliminación de tu cuenta y de los datos que correspondan.

### Política de privacidad

> Consulta cómo tratamos y protegemos tu información.

### Términos de servicio

> Revisa las condiciones de uso de juntoss.

### Licencias de código abierto

> Consulta las licencias de las tecnologías utilizadas.

---

# 49. Copy legal dentro de UI

Evitar lenguaje como:

> Tratamos datos según las bases legitimadoras del artículo 6...

Preferir:

> Utilizamos algunos datos para mantener tu cuenta y ofrecer las funciones que eliges usar.

El detalle jurídico vive en el documento completo.

---

# 50. Prohibiciones para agentes

- No copiar políticas de competidores.
- No inventar una empresa.
- No inventar dirección.
- No inventar retención.
- No decir “100% seguro”.
- No afirmar “GDPR compliant” automáticamente.
- No asumir que Supabase resuelve todo.
- No ignorar SDKs.
- No crear componentes duplicados.
- No rediseñar Ajustes.
- No pedir permisos nuevos sin necesidad.
- No añadir tracking.
- No mezclar ads consent con términos.
- No generar EULA personalizada sin necesidad.
- No publicar documentos sin revisión.

---

# 51. Orden de implementación

### Fase 1 — Auditoría

- datos
- SDKs
- permisos
- servicios

### Fase 2 — UI

- PrivacyLegalScreen
- LegalDocumentScreen
- navegación

### Fase 3 — Derechos

- eliminación
- exportación
- corrección

### Fase 4 — Consentimiento

- ads
- tracking
- preferencias

### Fase 5 — Documentos

- privacidad
- términos
- licencias

### Fase 6 — Stores

- Apple
- Google

### Fase 7

- revisión jurídica final

---

# 52. Checklist Apple

- [ ] Privacy Policy URL
- [ ] App Privacy actualizado
- [ ] SDKs incluidos
- [ ] PrivacyInfo.xcprivacy válido
- [ ] Required Reason APIs
- [ ] SDK privacy manifests
- [ ] ATT si aplica
- [ ] eliminación dentro de app
- [ ] textos de permisos
- [ ] age rating
- [ ] anuncios declarados
- [ ] documentos accesibles

---

# 53. Checklist Google Play

- [ ] Privacy Policy
- [ ] Data Safety
- [ ] SDKs incluidos
- [ ] eliminación dentro de app
- [ ] URL web de eliminación
- [ ] Financial Features Declaration
- [ ] target audience
- [ ] ads declaration
- [ ] Families si aplica
- [ ] prominent disclosures
- [ ] permisos justificados
- [ ] CMP/UMP
- [ ] cifrado en tránsito
- [ ] política = código

---

# 54. Checklist global

- [ ] responsable identificado
- [ ] correo de privacidad
- [ ] inventario de datos
- [ ] inventario de SDKs
- [ ] finalidades
- [ ] bases legales
- [ ] retención
- [ ] terceros
- [ ] transferencias
- [ ] derechos
- [ ] exportación
- [ ] eliminación
- [ ] revocación
- [ ] menores
- [ ] ads
- [ ] seguridad
- [ ] incidentes
- [ ] versionado
- [ ] revisión final

---

# 55. Fuentes oficiales

## Apple

- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/documentation/AppTrackingTransparency
- https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk
- https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- https://developer.apple.com/support/third-party-SDK-requirements/
- https://developer.apple.com/help/app-store-connect/manage-app-information/provide-a-custom-license-agreement

## Google Play

- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/9876821
- https://support.google.com/googleplay/android-developer/answer/13849271
- https://support.google.com/googleplay/android-developer/answer/9867159
- https://support.google.com/googleplay/android-developer/answer/9893335

## AdMob

- https://support.google.com/admob/answer/13554116
- https://support.google.com/admob/answer/16918505

## Reguladores

- EU: https://commission.europa.eu/law/law-topic/data-protection_en
- UK: https://ico.org.uk/
- California: https://oag.ca.gov/privacy/ccpa
- Brasil: https://www.gov.br/anpd/
- Canadá: https://www.priv.gc.ca/
- Australia: https://www.oaic.gov.au/privacy/australian-privacy-principles
- Singapur: https://www.pdpc.gov.sg/
- Japón: https://www.ppc.go.jp/en/
- India: https://www.meity.gov.in/

---

# 56. Recursos open source

- App Privacy Policy Generator: https://github.com/nisrulz/app-privacy-policy-generator
- Privado: https://github.com/Privado-Inc/privado
- SDK Privacy Report: https://github.com/Privado-Inc/SDK-Privacy-Report
- React Native Google Mobile Ads: https://github.com/invertase/react-native-google-mobile-ads

---

# 57. Regla final

> La privacidad no debe ser una página añadida al final. Debe ser una propiedad verificable de cómo funciona juntoss.

Antes de añadir cualquier dato, SDK, permiso o integración, responder:

1. **¿Lo necesitamos?**
2. **¿El usuario lo entiende?**
3. **¿Lo protegemos?**
4. **¿Lo hemos declarado donde corresponde?**
