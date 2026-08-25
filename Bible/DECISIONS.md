# DECISIONS.md

## 1. Propósito

Este archivo registra decisiones importantes de producto y arquitectura.

Su función es conservar:

- Qué se decidió.
- Por qué se decidió.
- Qué alternativas existían.
- Qué consecuencias tiene.
- Qué cuestiones siguen abiertas.

No debe utilizarse para registrar cada pequeño cambio visual. Debe utilizarse cuando una decisión afecte varias features, el modelo de datos, el mantenimiento o la experiencia principal.

---

## 2. Estados

- **Propuesta:** todavía no aprobada.
- **Aceptada:** debe aplicarse.
- **Reemplazada:** sustituida por una decisión posterior.
- **Descartada:** evaluada y rechazada.
- **Pendiente:** requiere investigación o definición.

---

# ADR-001 — Reconstruir la aplicación con alcance reducido

**Estado:** Aceptada

## Contexto

La versión anterior acumuló demasiadas funcionalidades, código duplicado, jerarquía inconsistente y responsabilidades mezcladas.

## Decisión

Reconstruir `juntoss` con una arquitectura nueva y un alcance inicial reducido.

## Consecuencias

- No se migrará código automáticamente.
- Cada pieza heredada debe evaluarse antes de reutilizarse.
- El roadmap prioriza el núcleo.
- Las funcionalidades no esenciales se posponen.
- La documentación se trata como parte del sistema.

---

# ADR-002 — React Native como tecnología móvil principal

**Estado:** Aceptada

## Contexto

Se necesita una aplicación para iOS y Android con una base de código compartida y capacidad de incorporar comportamientos nativos.

## Decisión

Utilizar React Native con TypeScript.

## Consecuencias

- Cada cambio debe considerar ambas plataformas.
- Las diferencias nativas deben encapsularse.
- No se permite optimizar una plataforma rompiendo la otra.
- La selección concreta de herramientas de compilación y navegación debe confirmarse al iniciar el repositorio.

---

# ADR-003 — Experiencia nativa con paridad funcional

**Estado:** Aceptada

## Contexto

La experiencia de iOS debe poder aprovechar efectos y animaciones nativas contemporáneas. Android no debe quedar olvidado.

## Decisión

Permitir diferencias visuales intencionales por plataforma conservando paridad funcional.

## Consecuencias

- iOS puede usar efectos avanzados cuando estén disponibles.
- Android debe recibir una alternativa propia y cuidada.
- Las APIs específicas de plataforma deben aislarse.
- Toda implementación visual transversal debe verificarse en ambas plataformas.
- Las diferencias relevantes deben documentarse.

---

# ADR-004 — Arquitectura organizada por features

**Estado:** Aceptada

## Contexto

La estructura anterior repartía componentes, pantallas, hooks, store, servicios, contextos y estilos en carpetas globales difíciles de mantener.

## Decisión

Organizar el código por dominios funcionales dentro de `src/features/`, manteniendo carpetas globales únicamente para piezas transversales.

## Consecuencias

- Los componentes específicos viven dentro de su feature.
- `src/components/` se reserva para componentes reutilizables entre dominios.
- Las pantallas viven dentro de la feature correspondiente.
- Todo el código de aplicación vive dentro de `src/`.
- No se crean carpetas nuevas sin responsabilidad clara.

---

# ADR-005 — Reutilización obligatoria antes de creación

**Estado:** Aceptada

## Contexto

Distintos asistentes recreaban componentes existentes, como acciones inferiores de modales, en lugar de reutilizarlos.

## Decisión

Antes de crear código nuevo se debe buscar, reutilizar o extender una solución interna existente.

## Consecuencias

- Se prohíbe duplicar componentes para diferencias configurables.
- Deben existir primitivas reutilizables para patrones repetidos.
- Las tareas deben indicar qué se reutilizó.
- La extensión no debe producir APIs confusas.

---

# ADR-006 — Evaluar librerías antes de implementar interacciones complejas

**Estado:** Aceptada

## Contexto

Se invirtió demasiado tiempo en resolver desde cero comportamientos complejos ya solucionados por librerías mantenidas, especialmente scroll, gestos y modales.

## Decisión

Para problemas complejos o ampliamente resueltos, investigar primero soluciones maduras.

## Consecuencias

- Las tareas pequeñas no requieren investigación innecesaria.
- Las tareas medianas o grandes evalúan librerías según riesgo.
- Deben revisarse mantenimiento, licencia, compatibilidad y accesibilidad.
- Copiar código de GitHub requiere revisión de licencia y origen.
- Las dependencias transversales se documentan.

---

# ADR-007 — Clasificar tareas por tamaño

**Estado:** Aceptada

## Contexto

Aplicar el mismo proceso a centrar un elemento y a cambiar la arquitectura genera fricción o falta de rigor.

## Decisión

Clasificar las tareas como pequeñas, medianas o grandes.

## Consecuencias

- Las tareas pequeñas aplican un proceso mínimo.
- Las medianas revisan reutilización y comportamiento.
- Las grandes requieren investigación, riesgos, migración y decisión documentada.
- La clasificación no autoriza ignorar reglas básicas.

---

# ADR-008 — Prohibir refactors no solicitados

**Estado:** Aceptada

## Contexto

Los asistentes pueden ampliar el alcance al encontrar código mejorable, aumentando riesgos y dificultando la revisión.

## Decisión

No modificar código fuera del alcance solicitado.

## Consecuencias

- Las mejoras laterales se mencionan, no se implementan.
- Los cambios de formato masivos deben separarse.
- Las tareas deben declarar qué queda fuera de alcance.
- Una corrección pequeña no se convierte en reescritura.

---

# ADR-009 — Entrada inicial como invitado

**Estado:** Aceptada

## Contexto

Solicitar registro inmediatamente puede aumentar la fricción y reducir la posibilidad de probar el producto.

## Decisión

Permitir que el usuario entre como invitado después de indicar su nombre y completar un onboarding breve.

## Consecuencias

- No se exige correo al abrir la app.
- El invitado recibe un espacio personal local.
- Puede probar el flujo principal.
- Se aplican límites suaves.
- El registro se solicita al necesitar sincronización, compartir o superar límites.

---

# ADR-010 — Datos de invitado exclusivamente locales

**Estado:** Aceptada

## Contexto

El usuario invitado todavía no tiene una identidad remota confirmada.

## Decisión

Guardar movimientos, categorías y configuración del invitado únicamente en el dispositivo.

## Consecuencias

- No se escriben filas en Supabase.
- Se necesita persistencia local estructurada.
- La lógica debe funcionar independientemente del backend.
- La pérdida del dispositivo puede implicar pérdida de datos antes del registro.
- Esta limitación debe explicarse con claridad.

---

# ADR-011 — Migración de datos al crear una cuenta

**Estado:** Aceptada

## Contexto

El usuario debe conservar lo creado como invitado al registrarse.

## Decisión

Migrar los datos locales al espacio personal remoto después del registro y verificación.

## Consecuencias

- La migración debe ser idempotente.
- Debe conservar una copia local hasta confirmar éxito.
- Debe manejar fallos parciales.
- Debe evitar mezclar datos con una cuenta equivocada.
- Los identificadores locales deben ser estables.

---

# ADR-012 — Onboarding de dos a cuatro pantallas

**Estado:** Aceptada

## Contexto

La aplicación necesita explicar su valor sin convertirse en un tutorial largo.

## Decisión

Utilizar un onboarding de un máximo de cuatro láminas, además de la captura mínima del nombre.

> **Nota (estado vigente):** esta decisión fue ampliada a nueve pantallas; ver
> «Ampliación — láminas 6 a 9» más abajo en esta misma ADR.

## Mensajes principales

- Registrar ingresos y gastos.
- Organizar mediante categorías.
- Elegir una moneda principal.
- Compartir cuando el usuario decida.
- Probar localmente y sincronizar más adelante.

## Consecuencias

- No se solicitan datos financieros en el onboarding.
- Debe poder completarse rápidamente.
- No debe repetirse sin motivo.
- Su efectividad puede medirse.

## Ampliación — láminas 6 a 9, acción real en vez de solo mensaje

El límite pasa de cuatro a ocho láminas de valor (además de la captura de
nombre): se añaden cuatro pantallas al final del flujo, antes de la de
acceso, que hacen que el invitado termine el onboarding con datos reales en
su espacio personal local, no solo con mensajes:

- **6 — Crear al menos tres categorías.** Reutiliza sin modificar
  `CategoryPickerModal` (catálogo de 18 plantillas) y `CreateCategoryModal`
  (categoría personalizada), los mismos componentes que usa la app ya
  autenticada, contra el espacio local `personal` del invitado (`useSpaces()`,
  disponible sin sesión). Botón `Crear categoría`.
- **7 — Añadir el primer ingreso** y **8 — Añadir el primer gasto.** Ambas
  reutilizan sin modificar `CreateTransactionModal`. Para esto se añadió el
  único cambio de comportamiento a un componente existente: un prop opcional
  `hideTypeToggle` que, solo cuando está activo, oculta el selector
  interactivo de gasto/ingreso y muestra el `type` recibido como una
  insignia fija — necesario porque cada una de estas dos láminas debe
  registrar exactamente un tipo, sin dejar cambiarlo. Ninguna otra pantalla
  de la app pasa este prop, así que el comportamiento por defecto (selector
  interactivo) no cambia en ningún otro lugar. Botones `Añadir ingreso` /
  `Añadir gasto`.
- **9 — Cierre.** Solo mensaje («Creces tan rápido…»). Botón `Empezar`,
  el que de verdad completa el onboarding.

Cada lámina de acción real avanza el flujo al completar su acción (crear al
menos tres categorías, guardar el movimiento), no mediante un botón `Continuar`
independiente. Ver `Bible/JUNTOSS_ONBOARDING_GUIDE.md` §6.1–§6.4 para el copy
exacto y el detalle de cada componente.

Esta ampliación supera la consecuencia original de que el onboarding no solicita
datos financieros: las láminas 7 y 8 piden un primer ingreso y un primer gasto,
que quedan registrados en el espacio personal local del invitado.

---

# ADR-013 — El espacio es contexto global

**Estado:** Aceptada

## Contexto

Modelar los espacios como una pantalla o pestaña obligaría a navegar para cambiar de contexto y podría causar confusión.

## Decisión

El espacio activo es un estado global que afecta todas las pantallas.

## Consecuencias

- Los espacios no ocupan una pestaña principal.
- El espacio activo debe ser visible.
- Debe poder cambiarse desde cualquier pantalla.
- Cambiarlo actualiza los datos sin mezclar contextos.
- La pantalla actual debe mantenerse cuando sea posible.

---

# ADR-014 — Espacios personal y de pareja primero

**Estado:** Aceptada

## Contexto

La visión futura incluye familias y grupos, pero implementarlos desde el inicio aumentaría demasiado el alcance.

## Decisión

La primera etapa contempla:

- Un espacio personal.
- Un espacio compartido de pareja.

La arquitectura de datos no debe impedir múltiples miembros o múltiples espacios futuros.

## Consecuencias

- La interfaz inicial puede hablar de pareja.
- La base no debe codificar “exactamente dos miembros” como supuesto universal.
- Familias, viajes y grupos quedan para fases posteriores.
- Los límites comerciales se implementarán mediante capacidades centralizadas.

---

# ADR-015 — Movimientos y categorías comparten sección de actividad

**Estado:** Propuesta aceptada para validación

## Contexto

Tener pantallas principales separadas para movimientos y categorías puede consumir demasiado espacio de navegación.

## Decisión

Utilizar `Actividad` como nombre de trabajo para una sección que agrupe:

- Movimientos.
- Balance.
- Filtros.
- Búsqueda.
- Categorías.
- Detalle por categoría.

## Consecuencias

- La jerarquía interna debe validarse mediante diseño.
- Categorías no debe quedar escondida.
- El nombre definitivo puede cambiar.
- La barra principal puede reservarse para funciones de mayor valor.

---

# ADR-016 — Inicio enfocado en respuestas rápidas

**Estado:** Aceptada

## Contexto

Las gráficas complejas añaden trabajo y no siempre ayudan a una decisión inmediata.

## Decisión

La pantalla Inicio prioriza:

- Dinero disponible o balance.
- Gasto mensual.
- Progreso visual simple.
- Categorías principales.
- Movimientos recientes.

## Consecuencias

- No se incluyen gráficas complejas en el núcleo inicial.
- Las visualizaciones futuras deben responder una pregunta concreta.
- Los números y estados deben ser comprensibles sin abrir otra pantalla.
- Puede mantenerse un indicador circular sencillo.

---

# ADR-017 — Una categoría puede contener ingresos y gastos

**Estado:** Aceptada

## Contexto

Una categoría como Casa puede contener tanto reparaciones como ingresos por vender un objeto.

## Decisión

No separar las categorías obligatoriamente por tipo de movimiento.

## Consecuencias

- La relación no impone tipo.
- Los filtros pueden separar gasto e ingreso.
- Los totales deben dejar clara la métrica mostrada.
- La interfaz no debe asumir que toda categoría representa consumo.

---

# ADR-018 — El espacio activo determina el destino del movimiento

**Estado:** Aceptada

## Contexto

Preguntar dentro del modal si el movimiento es personal o compartido añade fricción cuando el usuario ya trabaja dentro de un espacio.

## Decisión

Crear el movimiento en el espacio activo.

## Consecuencias

- El espacio debe estar visible antes de abrir el modal.
- El modal no muestra un selector redundante por defecto.
- Puede ofrecerse una forma segura de cambiar el espacio si las pruebas muestran necesidad.
- Toda escritura valida espacio y membresía.

---

# ADR-019 — Modal de movimiento como flujo prioritario

**Estado:** Aceptada

## Contexto

Registrar dinero es la acción principal de la aplicación.

## Decisión

Implementar el modal de creación temprano en el roadmap.

## Contenido base

- Alternar gasto o ingreso.
- Importe.
- Categoría.
- Título.
- Fecha.
- Recurrencia opcional.
- Guardar.
- Cerrar.

## Consecuencias

- El sistema de diseño debe soportarlo.
- Gestos, teclado y scroll deben investigarse.
- No se añadirán campos obligatorios innecesarios.
- Se reutilizarán acciones inferiores y primitivas de modal.

---

# ADR-020 — Supabase con migraciones versionadas

**Estado:** Aceptada

## Contexto

Una carpeta SQL suelta no garantiza reproducibilidad ni historial.

## Decisión

Organizar la base dentro de `supabase/` con migraciones, seeds, funciones y pruebas.

## Consecuencias

- No se modifican migraciones aplicadas.
- No se hacen cambios manuales sin reflejo en el repositorio.
- RLS forma parte del esquema.
- Los tipos se regeneran.
- Las operaciones complejas deben ser transaccionales.

---

# ADR-021 — Todo dato financiero pertenece a un espacio

**Estado:** Aceptada

## Contexto

La aplicación debe aislar información personal y compartida.

## Decisión

Movimientos y categorías contienen una referencia explícita a su espacio.

## Consecuencias

- Toda consulta filtra por espacio.
- RLS valida membresía.
- Cambiar el espacio visual no concede permisos.
- No se permiten categorías de un espacio en movimientos de otro.
- Los agregados se calculan dentro de un contexto.

---

# ADR-022 — Conservar autoría

**Estado:** Aceptada

## Contexto

En espacios compartidos es necesario saber quién creó una operación y aplicar reglas de edición o separación.

## Decisión

Movimientos, categorías y operaciones relevantes conservan `created_by`.

## Consecuencias

- El cliente no puede falsificar autoría.
- La base debe validar identidad.
- La interfaz puede mostrar autor cuando aporte claridad.
- La separación puede aplicar reglas según autoría.

---

# ADR-023 — Copiar categorías, no movimientos, durante separación

**Estado:** Propuesta pendiente de política final

## Contexto

Al disolver una pareja, las categorías creadas durante la relación pueden seguir siendo útiles para ambos, pero los movimientos no deberían aparecer automáticamente en finanzas personales ajenas.

## Decisión propuesta

- No copiar automáticamente movimientos compartidos a espacios personales.
- Copiar categorías elegibles a ambos espacios personales.
- Evitar duplicados.
- Conservar referencia al origen.
- Archivar o conservar el espacio compartido según política.

## Pendientes

- Visibilidad del historial compartido.
- Derecho de cada miembro a exportar.
- Diferencia entre abandonar y disolver.
- Tratamiento de categorías predeterminadas.
- Política de edición antes de separación.

---

# ADR-024 — Importes en unidades menores

**Estado:** Aceptada

## Contexto

Los números en punto flotante pueden producir errores de precisión.

## Decisión

Guardar importes como enteros en unidades menores y conservar moneda.

## Consecuencias

- `10,50 EUR` se guarda como `1050`.
- El tipo de movimiento no se representa mediante signo.
- El formateo se realiza en presentación.
- Deben definirse reglas de redondeo.

---

# ADR-025 — Estrategia inicial de sincronización simple

**Estado:** Reemplazada por ADR-050

## Contexto

Un enfoque completamente local-first aporta ventajas offline, pero aumenta mucho la complejidad inicial.

## Decisión propuesta

- Invitado: persistencia local.
- Registro: migración explícita.
- Autenticado: Supabase como fuente principal con caché limitada.
- Local-first completo: fase posterior si las métricas lo justifican.

## Consecuencias

- Reduce complejidad inicial.
- La experiencia offline autenticada puede ser limitada.
- La capa de repositorios mantiene abierta una evolución futura.

---

# ADR-026 — No incluir pestañas vacías

**Estado:** Aceptada

## Contexto

La navegación principal no debe tener cuatro botones únicamente por simetría.

## Decisión

Añadir un destino principal solo cuando tenga una funcionalidad útil.

## Consecuencias

- La navegación inicial se limita a Inicio, Actividad y Extras.
- Ahorros o Planes no se convierten en pestaña sin una nueva decisión de producto.
- Extras incorpora utilidades secundarias solo cuando tengan funcionalidad real.
- Los espacios no rellenan ese lugar.

---

# ADR-027 — Capacidades centralizadas para monetización

**Estado:** Propuesta

## Contexto

Los límites futuros, como cantidad de espacios, no deben quedar dispersos en la interfaz.

## Decisión propuesta

Crear una capa de capacidades asociada al plan.

## Ejemplos

- `canCreateSpace`
- `maxSpaces`
- `canInviteMembers`
- `canUseAdvancedAnalytics`

## Consecuencias

- La interfaz consulta capacidades.
- El backend valida derechos.
- Stripe o la plataforma de pagos actualiza el estado mediante procesos seguros.
- Los límites pueden cambiar sin reescribir múltiples pantallas.

---

# ADR-028 — Stripe y pagos se posponen

**Estado:** Aceptada

## Contexto

Los pagos no son necesarios para validar el núcleo de registro, organización y espacios.

## Decisión

Posponer monetización hasta que la experiencia principal sea estable.

## Consecuencias

- No se añade Stripe en las primeras fases.
- Se mantiene una arquitectura compatible con capacidades.
- La estrategia debe revisarse según requisitos vigentes de distribución móvil.

---

# ADR-029 — Documentación como fuente de contexto para asistentes

**Estado:** Aceptada

## Contexto

Se utilizarán distintos asistentes de programación para tareas pequeñas y etapas del roadmap.

## Decisión

Todos deben leer la documentación antes de modificar código.

## Consecuencias

- `README.md` enlaza el resto.
- `PROJECT_RULES.md` define comportamiento obligatorio.
- Las instrucciones auxiliares no pueden contradecir fuentes principales.
- Una decisión que cambie el sistema debe actualizar documentación.
- Los agentes deben indicar alcance, reutilización y validaciones.

---

# ADR-030 — No crear carpetas futuras vacías

**Estado:** Aceptada

## Contexto

Una arquitectura demasiado anticipada añade ruido y conceptos sin uso.

## Decisión

Crear únicamente las carpetas requeridas por la fase activa.

## Consecuencias

- `ARCHITECTURE.md` muestra una estructura objetivo, no una obligación inmediata.
- Las features futuras se añaden cuando entren al roadmap.
- Las carpetas deben tener responsabilidad concreta.

---

# ADR-031 — Expo con development builds y generación nativa continua

**Estado:** Reemplazada por ADR-033

## Contexto

La Fase 0 necesita concretar cómo compilar React Native para iOS y Android sin perder acceso a módulos nativos ni mantener proyectos nativos generados antes de necesitarlos.

## Opciones consideradas

1. React Native Community CLI con proyectos `ios/` y `android/` versionados desde el inicio.
2. Expo con development builds y Continuous Native Generation.

## Decisión

Utilizar Expo SDK 57 con TypeScript, development builds y Continuous Native Generation. Los proyectos `ios/` y `android/` se generan desde `app.json` y `package.json` y no se versionan mientras no exista código nativo manual que requiera otra estrategia.

## Motivo

- Conserva acceso a librerías y configuración nativas mediante development builds.
- Reduce archivos generados y simplifica actualizaciones iniciales.
- Mantiene un flujo local reproducible para ambas plataformas.
- No obliga a adoptar Expo Router; la herramienta de navegación continúa como decisión independiente.

Referencias: [flujo de desarrollo de Expo](https://docs.expo.dev/workflow/overview/) y [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Consecuencias positivas

- La configuración nativa queda declarada y reproducible.
- Se pueden generar y compilar proyectos locales con `expo run:ios` y `expo run:android`.
- Se mantiene abierta la incorporación de código nativo y config plugins.

## Consecuencias negativas

- El proyecto depende de la compatibilidad entre la versión de Expo SDK y React Native.
- Un cambio nativo manual exigiría decidir si se crea un config plugin o se versionan los proyectos nativos.
- Las development builds requieren toolchains nativos o un servicio de compilación.

## Riesgos

- Introducir cambios manuales en carpetas generadas y perderlos al regenerar.
- Añadir dependencias nativas incompatibles con la versión activa del SDK.

## Validación

- Ejecutar `expo-doctor` y `expo install --check`.
- Generar ambos proyectos con `expo prebuild` en un entorno temporal.
- Compilar iOS y Android cuando sus toolchains estén disponibles.

---

# ADR-032 — React Navigation para la navegación declarada por código

**Estado:** Aceptada

## Contexto

La aplicación necesita navegación tipada, pestañas inferiores personalizadas, deep links y una evolución posterior hacia flujos de invitado, autenticación y modales globales. `src/app/` ya está reservado por la arquitectura para bootstrap, proveedores y composición, no exclusivamente para rutas.

## Opciones consideradas

1. Expo Router con rutas derivadas del sistema de archivos.
2. React Navigation con navegadores y rutas declarados explícitamente en código.

## Decisión

Utilizar React Navigation 7 con rutas TypeScript explícitas y un tab bar personalizado. La navegación comienza con Inicio, Actividad y Extras. El selector de creación se compone fuera de las pestañas y podrá abrir flujos globales más adelante.

## Motivo

- Respeta la responsabilidad actual de `src/app/` y la estructura por features.
- Permite centralizar nombres, linking y tipos dentro de `src/navigation/`.
- Soporta personalización del tab bar sin acoplar las pantallas a la navegación.
- Mantiene abierta una futura composición de stacks para invitado y autenticación.
- Los paquetes seleccionados tienen licencia MIT y mantenimiento activo en la versión 7.

Referencias: [React Navigation](https://reactnavigation.org/docs/getting-started/) y [bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/).

## Consecuencias positivas

- Rutas y parámetros revisables en un contrato TypeScript.
- Control directo de la jerarquía de navegación.
- Integración con deep links y comportamiento nativo en iOS y Android.

## Consecuencias negativas

- Los deep links y tipos se mantienen explícitamente en lugar de generarse desde archivos.
- Un tab bar personalizado debe conservar eventos y accesibilidad de React Navigation.

## Riesgos

- Añadir rutas sin actualizar tipos o linking.
- Introducir lógica de permisos dentro de pantallas en lugar del navegador raíz.

## Validación

- Typecheck de las rutas.
- Pruebas del menú de creación.
- Bundle y generación nativa para iOS y Android.
- Verificación manual de safe areas y pulsaciones en simuladores cuando estén disponibles.

---

# ADR-033 — Expo SDK 54 para pruebas físicas mediante Expo Go

**Estado:** Aceptada

## Contexto

Durante la transición actual a Expo SDK 57, la aplicación Expo Go distribuida para dispositivos físicos utiliza SDK 54. El flujo con SDK 57 requiere una development build, lo que impide al responsable del proyecto abrir inmediatamente el QR estándar en iOS y Android.

## Opciones consideradas

1. Mantener SDK 57 y distribuir development builds específicas para cada plataforma.
2. Utilizar temporalmente SDK 54 y abrir el proyecto directamente en Expo Go.

## Decisión

Utilizar Expo SDK 54 mientras se necesite validar rápidamente la aplicación mediante Expo Go físico. El comando `npm run start` fuerza Expo Go mediante la red local y existe un comando de túnel alternativo. `expo-dev-client` se elimina de esta etapa.

## Motivo

- Permite escanear el mismo QR desde Expo Go en iOS y Android.
- No requiere compilar ni firmar una aplicación nativa para cada dispositivo.
- El túnel queda disponible como alternativa cuando la red local no sea accesible.
- Mantiene React Navigation y la arquitectura por features sin cambios.

Referencia: [crear un proyecto compatible con Expo Go físico](https://docs.expo.dev/get-started/create-a-project/) y [túneles de Expo CLI](https://docs.expo.dev/more/expo-cli/#tunneling).

## Consecuencias positivas

- Validación visual inmediata en dispositivos reales.
- Un único flujo de inicio para ambas plataformas.
- No se necesitan CocoaPods, JDK ni Android SDK para esta previsualización.

## Consecuencias negativas

- El proyecto utiliza temporalmente React Native 0.81 y React 19.1, versiones asociadas a SDK 54.
- No pueden probarse módulos nativos que no estén incluidos en Expo Go.
- El túnel alternativo puede ser más lento o depender de la disponibilidad de ngrok.

## Riesgos

- Permanecer demasiado tiempo en SDK 54 después de que Expo Go adopte una versión posterior.
- Confundir la compatibilidad de Expo Go con una validación completa de builds de producción.

## Validación

- `expo install --check` y `expo-doctor` sin errores.
- QR con runtime de Expo Go y esquema `exp://`.
- Bundle correcto para iOS y Android.
- Prueba manual del mismo QR desde ambos dispositivos.

---

# ADR-034 — Bottom sheets gestuales como primitiva de modal

**Estado:** Aceptada

## Contexto

El modal de creación de movimientos es un flujo prioritario y debe abrirse, cerrarse y responder al arrastre de la forma esperada en iOS y Android. La primitiva `Modal` de React Native no incorpora interacción gestual de bottom sheet ni coordinación avanzada con el teclado.

## Opciones consideradas

1. Mantener `Modal` de React Native y construir manualmente el gesto, la animación y la coordinación con teclado.
2. Utilizar `@gorhom/bottom-sheet` sobre React Native Gesture Handler y Reanimated.

## Decisión

Utilizar `@gorhom/bottom-sheet` v5 como implementación encapsulada de `AppModal`. Instalar Gesture Handler, Reanimated y Worklets mediante Expo para conservar versiones compatibles con SDK 54. El backdrop común utiliza `expo-blur` con intensidad reducida y una capa translúcida de contraste.

## Motivo

- Proporciona arrastre para cerrar, backdrop, animaciones y teclado en iOS y Android.
- Respeta reducción de movimiento y ofrece soporte de accesibilidad.
- Evita duplicar lógica gestual entre el menú rápido y los modales de features.
- Mantiene a las features desacopladas de la librería mediante `AppModal`.

## Consecuencias positivas

- Los modales comparten un comportamiento táctil consistente.
- El menú rápido y el modal de movimiento usan la misma primitiva.
- La coordinación con teclado queda preparada para formularios posteriores.
- El fondo se desenfoca de forma consistente al abrir cualquier modal.

## Consecuencias negativas

- Se añaden tres dependencias nativas relacionadas.
- El desenfoque real en Android utiliza una implementación marcada como experimental por Expo.
- La raíz de la aplicación requiere `GestureHandlerRootView` y `BottomSheetModalProvider`.
- Los tests de overlays deben renderizar los proveedores globales.

## Riesgos

- Una actualización de Expo debe comprobar compatibilidad con Gesture Handler y Reanimated.
- Los contenidos con scroll complejo deben usar los componentes integrados de la librería.
- Una lista horizontal con páginas que envuelven varias filas debe declarar la
  altura de su viewport a partir de los tokens de sus filas; el dimensionado
  dinámico no puede inferir esas filas desde el eje horizontal.
- El blur de Android debe mantener intensidad moderada y verificarse en dispositivos de rendimiento medio; la capa translúcida actúa como degradación visual.

## Validación

- Typecheck, lint y pruebas.
- `expo install --check` y `expo-doctor`.
- Verificación manual de arrastre, backdrop, teclado y botón atrás en iOS y Android.

## Corrección — reabrir el mismo modal exigía dos toques

`AppModal` desmonta el `BottomSheetModal` (`isMounted`) cuando `visible` pasa a
`false`, y su callback `onDismiss` decidía si avisar al padre (`onClose`)
comprobando el valor de `visible` en ese momento. Ese valor podía quedar
obsoleto: si el usuario reabría el mismo modal (por ejemplo, el mismo día en
`MapDayModal`) mientras la animación de cierre todavía estaba en curso,
`visible` ya volvía a ser `true` cuando `onDismiss` finalmente llegaba, y la
comprobación disparaba `onClose()` igualmente, cerrando lo que el usuario
acababa de reabrir. Hacía falta un segundo toque, ya con el ciclo de cierre
completamente asentado, para que la reapertura funcionara.

La corrección sustituye esa comprobación por `dismissRequestedByParentRef`, un
ref que se marca en el efecto que llama a `modalRef.current?.dismiss()`
(cierre pedido por el padre) y se lee en `onDismiss`: si el cierre no fue
pedido por el padre, se asume gesto del usuario (deslizar o tocar el backdrop)
y se notifica con `onClose()`; si sí fue pedido por el padre, no se notifica
de nuevo. A diferencia de leer `visible`, este ref no queda invalidado por una
reapertura ocurrida durante la animación.

### Validación de la corrección

- `npm run validate` completo (typecheck, lint, formato, pruebas) sin
  regresiones en los consumidores existentes de `AppModal`.
- Verificación manual en Mapa: abrir un día, cerrar y volver a tocar el mismo
  día debe reabrir el detalle con un solo toque.

## Corrección — la primera apertura no debe depender de frames externos

`BottomSheetModal` ya programa internamente su montaje mediante un
`requestAnimationFrame`. Añadir otro ciclo de montaje, dos frames y reintentos
desde `AppModal` retrasaba la primera apertura y podía cruzarse con un cierre
anterior. En particular, una hoja creada inicialmente con `visible=false`
podía llegar a tratar su primer cambio a `true` como si aún estuviera
cerrándose, sin solicitar la presentación.

`AppModal` mantiene ahora su instancia de `BottomSheetModal` montada desde el
primer render —la librería conserva vacío su portal hasta `present()`— y usa
`useLayoutEffect` para invocar `modalRef.current?.present()` directamente al
recibir `visible=true`. `hasPresentedRef` impide solicitar `dismiss()` para una
hoja que nunca se presentó; `dismissRequestedByParentRef` sigue distinguiendo
el cierre del padre de un gesto y, si una reapertura coincide con el cierre,
solicita la presentación una vez que este termina. Así el botón de filtros no
depende de un segundo toque ni de una espera temporal arbitraria.

### Validación de la corrección

- `AppModal.test.tsx` cubre que una hoja inicialmente oculta invoca `present()`
  en su primer cambio a visible y que una reapertura durante el cierre vuelve a
  solicitarla al terminar.
- `npm run validate` completo sin regresiones.
- Verificación manual en Mapa: tocar un día debe abrir su detalle en un solo
  toque, sin importar si ese día ya estaba marcado como seleccionado.

---

# ADR-035 — Escala tipográfica, espaciado y densidad de disposición

**Estado:** Aceptada

## Contexto

El tema definía seis tamaños de fuente sin interlineado, sin tracking y sin límite de escalado del sistema, y una escala de espaciado incompleta. Las pantallas los completaban con números sueltos: `fontSize: 11`, `fontSize: 34`, `fontSize: 64`, alturas de `50`, `58`, `62`, radios de `19`, `23`, `29` y tamaños de icono de `21`, `23`, `25`, `27`.

El efecto era visible sobre todo en el modal de movimiento: cotas fijas que no se adaptaban a la altura de la pantalla, una columna de operadores por debajo del objetivo táctil mínimo y acciones inferiores sin aire suficiente. En pantallas cortas el contenido quedaba comprimido y en pantallas altas sobraba espacio sin repartir.

La aplicación no tiene consultas de medios: React Native obliga a decidir explícitamente cómo se adapta el diseño al tamaño de pantalla.

## Opciones consideradas

1. **Escalado proporcional continuo** con `react-native-size-matters` o `react-native-responsive-fontsize`: multiplican cada medida por la relación entre la pantalla actual y una de referencia.
2. **Tokens semánticos con dos densidades**: una escala fija derivada de las guías de plataforma y una única variable de densidad calculada a partir de la altura de la ventana.
3. **Mantener valores fijos** y corregir el modal caso por caso.

## Decisión

Se adopta la opción 2.

- `src/theme/typography.ts` define once variantes semánticas con tamaño, interlineado, tracking y peso. Los pasos (11, 12, 13, 15, 17, 20, 28, 34, 40, 52) reproducen los estilos de texto de iOS en tamaño Large y se corresponden con los roles de Material 3.
- `maxFontScale` fija, por variante, el tope de escalado del sistema: 1.5–1.6 en texto corriente y 1.1–1.25 en cifras y titulares.
- `src/theme/spacing.ts` completa la rejilla de 8 pt con sub-rejilla de 4 pt sin alterar el valor de ningún paso existente.
- `src/theme/layout.ts` añade objetivo táctil mínimo, alturas de control, márgenes, separaciones, tamaños de icono y el punto de corte de densidad.
- `useLayoutDensity` resuelve `compact` o `regular` según la altura de la ventana (corte en 820 pt).
- `src/components/ui/Text` es el único lugar donde se declara un tamaño de fuente en la interfaz.

## Motivo

- El escalado proporcional continuo produce tamaños intermedios sin control (14.7 pt), rompe el ritmo de la rejilla de 8 pt y se multiplica con el escalado de accesibilidad del sistema, de modo que un usuario con texto grande en una pantalla grande recibe dos aumentos encadenados.
- Apple y Google definen escalas discretas precisamente para que el texto sea legible sin reescalar por dispositivo; las guías de ambas plataformas y la práctica habitual de los sistemas de diseño coinciden en la rejilla de 8 pt.
- El objetivo táctil mínimo se fija en 48 para cumplir a la vez los 44 pt de Apple y los 48 dp de Material, muy por encima de los 24 px del criterio 2.5.8 de WCAG 2.2.
- Dos densidades cubren el problema real (altura disponible en el modal) sin introducir una dependencia nueva ni un sistema de puntos de corte que nadie mantendría.

Referencias: [Typography — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/typography), [Type scale tokens — Material Design 3](https://m3.material.io/styles/typography/type-scale-tokens), [WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) y [`maxFontSizeMultiplier` en React Native](https://reactnative.dev/docs/text#maxfontsizemultiplier).

## Consecuencias positivas

- Un cambio de tamaño de texto se hace en un archivo y afecta a toda la aplicación.
- El escalado de accesibilidad ya no puede romper la calculadora ni las acciones del modal.
- Todos los controles interactivos alcanzan el objetivo táctil mínimo en ambas plataformas.
- El modal reparte el espacio sobrante en el importe en lugar de comprimir el teclado.

## Consecuencias negativas

- Todo texto nuevo debe usar la primitiva `Text`; un `Text` de React Native se salta los topes de escalado.
- Añadir una variante o un paso de espaciado obliga a justificar el hueco en la escala.
- La densidad depende solo de la altura: una tableta en horizontal se resuelve como compacta hasta que se decida un criterio por anchura.

## Riesgos

- Con el escalado de texto al máximo y densidad compacta, el modal de movimiento sigue sin poder desplazarse; los topes por variante lo mitigan pero no lo eliminan.
- Reintroducir `fontSize` crudo en un componente pasaría desapercibido en revisión si no se comprueba.

## Validación

- `npm run validate`: typecheck, lint, formato y 36 pruebas.
- Pruebas de la escala tipográfica, de los tokens de disposición y de la primitiva `Text`.
- Prueba de objetivos táctiles en el modal de movimiento.
- Pendiente: verificación manual en iOS y Android con tamaño de texto por defecto y con tamaño accesible.

---

# ADR-036 — Phosphor para iconos semánticos de categoría

**Estado:** Aceptada

## Contexto

Las plantillas de categoría y las categorías personalizadas necesitan un
catálogo coherente de iconos disponible en iOS y Android. Dibujar o descargar archivos independientes
duplicaría activos, dificultaría aplicar color y permitiría mezclar estilos de
trazo y relleno.

## Opciones consideradas

1. Mantener Ionicons y limitar la selección a sus glifos disponibles.
2. Descargar y mantener SVG independientes dentro del repositorio.
3. Usar `phosphor-react-native`, apoyado en `react-native-svg`, y encapsular el
   subconjunto permitido.

## Decisión

Se adopta la opción 3. `CategoryIcon` es la única puerta de renderizado para
iconos de categoría, expone nombres de dominio tipados y fuerza siempre
`weight="fill"`. El selector personalizado reutiliza el mismo catálogo que las
tarjetas y el modal de movimiento. Los controles de navegación no forman parte
de este catálogo. El adaptador importa únicamente los 18 módulos de icono
permitidos mediante los subpaths públicos del paquete; importar su índice raíz
incorporaba el catálogo completo al bundle.

## Motivo

Phosphor ofrece los símbolos requeridos mediante una API uniforme, permite
color y tamaño dinámicos y distribuye licencia MIT. La versión instalada es
compatible con React Native y usa `react-native-svg`, que Expo SDK 54 puede
resolver con una versión compatible.

Referencias: [paquete de Phosphor React Native](https://app.unpkg.com/phosphor-react-native%403.0.0/files/package.json) y [licencia MIT](https://app.unpkg.com/phosphor-react-native%403.0.0/files/LICENSE).

## Consecuencias positivas

- No se mantienen 18 SVG duplicados.
- Un solo componente garantiza el estilo relleno.
- Categorías iniciales y personalizadas comparten iconos tipados.

## Consecuencias negativas

- Se añaden `phosphor-react-native` y `react-native-svg` al grafo de dependencias.
- El catálogo permitido debe actualizarse explícitamente para añadir símbolos.

## Riesgos

- Una importación indiscriminada podría aumentar el bundle; se comprobarán las
  exportaciones de ambas plataformas.
- Una actualización mayor puede cambiar nombres o tipos de iconos.
- Expo SDK 54 fija una versión de `react-native-svg` cuyo tipo `SvgProps` aún no
  declara `className`; la ampliación local de tipos se retira cuando Expo lo
  incorpore, sin modificar código de la dependencia.

## Validación

- Typecheck y pruebas del catálogo.
- Exportación de iOS y Android.
- Inspección visual del selector y del editor personalizado.

## Plan de retirada

Mantener la interfaz de `CategoryIcon` y sustituir internamente sus componentes
por SVG locales u otra librería sin cambiar el modelo de dominio.

---

# ADR-037 — Categoría obligatoria para crear movimientos

**Estado:** Aceptada

## Contexto

Una categoría opcional permite guardar movimientos que Inicio y Actividad no
pueden organizar ni agregar correctamente. También hace ambiguo el flujo
principal cuando el usuario todavía no ha creado categorías.

## Decisión

Todo movimiento nuevo debe seleccionar una categoría existente del espacio
activo. El formulario mantiene deshabilitada la acción de guardar hasta tener
un importe válido y una categoría, y el contrato de creación exige
`categoryId`.

## Consecuencias positivas

- Inicio y Actividad pueden agregar todos los movimientos por categoría.
- La relación entre movimiento, categoría y espacio es explícita.
- El usuario recibe una restricción predecible antes de intentar guardar.

## Consecuencias negativas

- Un usuario sin categorías debe crear primero una desde el propio selector del
  movimiento.
- Una futura importación de movimientos sin categoría necesitará asignar una
  categoría antes de crear las filas.

## Riesgos

- La persistencia remota futura debe reflejar la obligatoriedad y rechazar una
  categoría perteneciente a otro espacio.

## Validación

- Pruebas del modal sin categoría y con categoría seleccionada.
- Prueba integrada de creación y visualización en Inicio.
- Typecheck para impedir borradores con `categoryId` nulo.

---

# ADR-038 — Inicio sin tarjeta de balance y categorías orientadas al gasto

**Estado:** Aceptada

## Contexto

La tarjeta de balance, el titular introductorio y su subtítulo ocupaban la
primera parte de Inicio antes de mostrar la información mensual y las
categorías. Las vistas previas de categoría mostraban balance y número de
movimientos, pero no respondían de forma directa cuánto se había gastado.

## Decisión

- Inicio conserva visible el espacio activo y el perfil, pero elimina el
  titular introductorio, su subtítulo y la tarjeta independiente de balance.
- Las vistas previas de categoría de Inicio usan el color de la categoría como
  fondo y muestran el gasto acumulado debajo del icono.
- El anillo de progreso solo aparece si la categoría tiene un presupuesto
  válido mayor que cero.
- Actividad y Extras muestran también el encabezado de espacio activo y perfil.

## Consecuencias positivas

- Inicio llega antes a los datos mensuales y a las categorías.
- Una categoría sin presupuesto no comunica un progreso inexistente.
- El contexto del espacio permanece visible en las tres pestañas principales.

## Consecuencias negativas

- El balance deja de estar disponible directamente en Inicio y permanece como
  responsabilidad de Actividad.
- El flujo para crear o editar presupuestos sigue pendiente; la presentación
  únicamente admite el dato opcional.

## Validación

- Pruebas de Inicio con y sin presupuesto.
- Pruebas del encabezado en las pantallas principales.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

## Reemplaza

La parte de ADR-016 que exigía mostrar dinero disponible o balance en Inicio.

---

# ADR-039 — Distribución circular ligera y plegable en Actividad

**Estado:** Aceptada

## Contexto

Actividad necesita mostrar arriba cómo se distribuyen los gastos e ingresos
entre categorías, sin ocultar el listado ni convertir una pantalla todavía
simple en una dependencia transversal de estadísticas. La gráfica y el listado
deben compartir una jerarquía compacta para reducir controles repetidos.

## Opciones consideradas

1. Victory Native XL, mantenida activamente y con licencia MIT, sobre D3, Skia
   y Reanimated.
2. `react-native-gifted-charts`, con donut, licencia MIT y dependencias en su
   core, SVG y gradientes.
3. Encapsular el donut con `react-native-svg`, dependencia MIT ya instalada y
   usada por los indicadores de categoría.

## Decisión

Se adopta la opción 3 para esta visualización acotada. Actividad muestra un
donut segmentado por color de categoría, alterna entre gastos e ingresos y
presenta el total en el centro. Su leyenda y etiqueta accesible exponen la misma
información en texto. La gráfica y el listado forman una sola sección plegable,
abierta por defecto, con el donut primero y el detalle de categorías debajo.
Esta sección y el panel de filtros usan una transición breve de disposición y
opacidad mediante Reanimated, respetando la reducción de movimiento del sistema.

## Motivo

- No añade peso ni configuración nativa a Expo SDK 54.
- Reutiliza los colores, el formateo monetario y la agregación existentes.
- La API local permite sustituir la implementación si la Fase 18 requiere
  interacción, series temporales u otras gráficas avanzadas.
- Victory Native XL sería más apropiada para un sistema amplio de gráficas,
  pero añadir Skia no se justifica para un único donut.
- Gifted Charts reduce código de dibujo, pero añade dependencias y una API mucho
  más amplia que la necesidad actual.

Referencias: [Victory Native XL](https://github.com/FormidableLabs/victory-native-xl),
[`react-native-gifted-charts`](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts)
y [`react-native-svg`](https://github.com/software-mansion/react-native-svg).

## Consecuencias positivas

- La gráfica funciona con la misma dependencia en iOS y Android.
- La alternativa textual no depende del reconocimiento de colores.
- Un único control plegable reduce decisiones y desplazamiento sin separar dos
  representaciones de los mismos datos.
- La transición conserva la relación espacial entre el control y su contenido.

## Consecuencias negativas

- La implementación local solo cubre esta distribución circular y no pretende
  ser un motor genérico de gráficas.
- La salida animada mantiene brevemente el contenido en el árbol visual antes
  de completar su retirada.

## Riesgos

- Categorías con proporciones diminutas pueden percibirse como un punto; la
  leyenda textual conserva nombre y porcentaje.
- Cuando se implementen filtros de Actividad, la pantalla deberá pasar a la
  gráfica el mismo conjunto filtrado para mantener coherencia.

## Validación

- Pruebas de totales de gastos e ingresos.
- Pruebas del plegado conjunto, del panel de filtros y de sus estados de
  accesibilidad.
- Typecheck, lint, formato, pruebas y exportación de iOS y Android.

---

# ADR-040 — Cuatro frecuencias de movimiento

**Estado:** Reemplazada por ADR-052

## Contexto

El selector de movimientos ofrecía opciones diarias y anuales que no forman
parte del alcance deseado, mientras faltaba la frecuencia quincenal. El filtro
de Actividad y el formulario deben compartir exactamente el mismo dominio.

## Decisión

Todo movimiento usa una de cuatro frecuencias: `once`, `weekly`, `biweekly` o
`monthly`, presentadas como Único, Semanal, Quincenal y Mensual. El mismo
catálogo se refleja en la creación de gastos e ingresos y en Actividad.

## Consecuencias

- Se eliminan Diario y Anual de la interfaz y del tipo TypeScript.
- Único sustituye al valor interno anterior `none`.
- La persistencia futura debe validar estos cuatro valores y contemplar una
  migración si ya existieran filas con el catálogo anterior.

## Validación

- Pruebas del selector de recurrencia y del filtro de Actividad.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

---

# ADR-041 — Movimiento orgánico y formato de importe durante la entrada

**Estado:** Aceptada

## Contexto

El cambio entre gasto e ingreso y la escritura del importe respondían de forma
instantánea, mientras Actividad ya utilizaba un muelle amortiguado. Además, los
millares se presentaban sin agrupación y resultaban difíciles de leer.

## Decisión

El selector Gasto/Ingreso desplaza un indicador con el mismo muelle amortiguado
de Actividad. Cada pulsación numérica aplica una respuesta breve de escala y
elevación, respetando la reducción de movimiento. El texto visible agrupa
millares con puntos y conserva la coma decimal, mientras el valor interno sigue
siendo una cadena sin formato que se convierte a unidades menores al operar o
guardar.

## Consecuencias

- La calculadora no analiza separadores visuales ni cambia su precisión.
- Gasto e ingreso comparten una transición coherente sin duplicar otro sistema
  de movimiento.
- Importes como `1000`, `10000` y `1000000` se muestran como `1.000`, `10.000`
  y `1.000.000`.

## Validación

- Pruebas del formateo de enteros y decimales.
- Prueba integrada del importe visible y del cambio de tipo.
- Validación de bundles iOS y Android.

---

# ADR-042 — Tipografía responsive con énfasis moderado

**Estado:** Aceptada

## Contexto

La escala semántica de ADR-035 respetaba el escalado accesible, pero aplicaba el
mismo tamaño base en ventanas regulares y compactas. Además, overlines,
subtítulos, titulares e importes usaban peso bold por defecto y varias features
volvían a forzar bold. La combinación hacía que la jerarquía se percibiera más
pesada y que los estilos grandes consumieran demasiado espacio en dispositivos
de poca altura.

## Opciones consideradas

1. Escalar todos los textos proporcionalmente según ancho o altura.
2. Reducir todo el catálogo, incluido el cuerpo, en pantallas compactas.
3. Mantener estable el texto de lectura y adaptar únicamente estilos grandes,
   conservando el escalado del sistema y asignando una rampa semántica de
   Dynamic Type en iOS.

## Decisión

Se adopta la opción 3.

- Cuerpo, labels, footnotes y captions conservan sus tamaños legibles.
- `subheading`, `heading`, `title`, `amount` y `amountHero` tienen medidas
  compactas resueltas por la misma densidad de disposición de ADR-035.
- La primitiva `Text` asigna a cada variante su `dynamicTypeRamp` de iOS y
  conserva `allowFontScaling` junto con el tope accesible existente.
- El peso base máximo pasa de bold (`700`) a semibold (`600`); labels y
  overlines usan medium (`500`). Los énfasis bold repetidos en features pasan a
  semibold.
- Se elimina el escalado manual de fuente de `TransactionPreviewCard`; el texto
  vuelve a depender exclusivamente de la variante semántica.

## Motivo

Apple recomienda usar estilos de texto, mantener la jerarquía relativa y hacer
que la disposición responda a Dynamic Type; su tamaño recomendado por defecto
en iOS es 17 pt y el mínimo es 11 pt. Material 3 organiza la tipografía en roles
semánticos y permite que los estilos display cambien según el contexto del
dispositivo. React Native ofrece `allowFontScaling`, `maxFontSizeMultiplier` y
`dynamicTypeRamp` para expresar este comportamiento sin una dependencia.

Referencias: [Typography — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/typography), [Material Design 3 en Compose](https://developer.android.com/develop/ui/compose/designsystems/material3) y [`Text` de React Native](https://reactnative.dev/docs/text).

## Consecuencias positivas

- Las pantallas cortas ganan espacio sin reducir el texto corriente.
- La jerarquía se percibe más ligera y consistente en toda la aplicación.
- iOS escala cada variante dentro de la rampa de Dynamic Type correspondiente.
- Android conserva el escalado de fuente del sistema y los mismos roles.
- No se añade una dependencia ni se crean tamaños proporcionales arbitrarios.

## Consecuencias negativas

- Cada `Text` consulta la densidad mediante la primitiva compartida.
- Los importes y titulares cambian de medida al cruzar el punto de densidad.
- La verificación visual con tamaños accesibles sigue siendo necesaria en
  dispositivos físicos de ambas plataformas.

## Riesgos

- Un texto grande dentro de una fila rígida aún puede truncarse con una escala
  accesible elevada; las filas deben permitir envolver o crecer cuando aplique.
- Una feature que vuelva a declarar `fontSize` o a forzar bold puede romper la
  coherencia central.

## Validación

- Pruebas de tamaños compactos y regulares, pesos máximos y rampas Dynamic Type.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.
- Verificación manual pendiente en iOS y Android, con texto estándar y grande.

## Reemplaza

Amplía la parte tipográfica de ADR-035; conserva su escala regular, sus topes de
accesibilidad y su modelo de dos densidades.

---

# ADR-043 — Gilroy como familia tipográfica global

**Estado:** Aceptada

## Contexto

La aplicación utilizaba la fuente del sistema aunque el repositorio ya incluía
los pesos Light, Regular, Medium, Bold y Heavy de Gilroy en formato WOFF. Ese
formato no ofrece paridad nativa: Expo lo admite en iOS, pero no en Android, y
la fase actual debe seguir siendo compatible con Expo Go.

## Opciones consideradas

1. Cargar directamente los WOFF y aceptar una fuente alternativa en Android.
2. Incrustar fuentes mediante el plugin nativo de `expo-font` y abandonar Expo
   Go para este cambio.
3. Convertir los pesos necesarios a TTF estático y cargarlos en runtime con
   alias explícitos mediante `expo-font`.

## Decisión

Se adopta la opción 3. Toda la interfaz usa Gilroy desde los puntos centrales
del sistema de diseño:

- Light para el cuerpo de lectura.
- Regular para captions y footnotes, donde prima la legibilidad en tamaños
  pequeños.
- Medium para labels y overlines.
- Bold para texto fuerte, titulares e importes.

Las sobrescrituras semánticas de `Text` cambian de familia en lugar de pedir al
sistema que sintetice un peso. `TextInput` recibe la familia de su token de
cuerpo y React Navigation usa las mismas familias. Heavy no se carga porque no
forma parte de la jerarquía moderada establecida en ADR-042.

## Motivo

- TTF funciona en iOS, Android y web con Expo.
- La carga en runtime mantiene la validación física mediante Expo Go decidida
  en ADR-033.
- Los alias explícitos evitan diferencias entre el nombre interno de la fuente
  en iOS y el nombre de archivo usado por Android.
- La selección por archivo conserva pesos reales y evita falsos bolds o lights
  generados por la plataforma.

Referencia: [fuentes personalizadas en Expo](https://docs.expo.dev/develop/user-interface/fonts/).

## Consecuencias positivas

- Toda la aplicación comparte la misma identidad tipográfica.
- Los pesos mantienen una intención semántica y una salida consistente en
  ambas plataformas.
- No se añade ninguna dependencia.

## Consecuencias negativas

- El arranque espera a que cuatro assets locales terminen de cargarse.
- Los TTF conviven con los WOFF originales aportados al repositorio.
- Semibold se representa con Medium para conservar el énfasis moderado de
  ADR-042, ya que no existe un archivo semibold entre los assets disponibles.

## Riesgos

- Un fallo al cargar los assets impide montar la navegación y se deriva al
  límite global de errores.
- La métrica propia de Gilroy puede requerir ajustes visuales después de una
  revisión en dispositivos físicos, sin cambiar la escala semántica.

## Validación

- Pruebas de familias por variante y sobrescritura de énfasis.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.
- Exportación de iOS y Android.
- Verificación visual pendiente en dispositivos físicos con tamaño de texto
  estándar y accesible.

## Reemplaza

Amplía la selección de pesos de ADR-042: conserva su jerarquía moderada, pero
la expresa mediante archivos estáticos de Gilroy en lugar de pesos numéricos
de la fuente del sistema.

---

# ADR-044 — Balance como cifra principal de Inicio

**Estado:** Aceptada

## Contexto

Inicio mostraba ingresos y gastos mensuales, pero el balance disponible había
quedado relegado a Actividad. Al entrar, la persona necesita reconocer primero
cuánto dinero tiene disponible sin buscarlo en otra pantalla ni añadir otra
tarjeta a una interfaz ya compuesta por varias secciones.

## Decisión

Inicio muestra el balance disponible como la primera cifra financiera, libre
sobre el fondo y con jerarquía tipográfica principal. Debajo aparecen dos
indicadores compactos con los ingresos y los gastos del mes. Ninguna de estas
tres cifras se presenta como una tarjeta de balance independiente.

## Consecuencias positivas

- La situación financiera principal se reconoce al entrar en la aplicación.
- Ingresos y gastos conservan contexto mensual sin competir con el balance.
- Se respeta la regla de no saturar Inicio con tarjetas ni gráficas complejas.

## Consecuencias negativas

- Inicio vuelve a compartir la responsabilidad de mostrar el balance con
  Actividad, por lo que ambas pantallas deben usar el mismo cálculo.

## Validación

- Pruebas del balance y de los totales mensuales con y sin movimientos.
- Verificación visual en iOS y Android.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

## Reemplaza

La consecuencia de ADR-038 que retiraba el balance de Inicio. Conserva su
decisión de no usar una tarjeta independiente para esa cifra.

---

# ADR-045 — Selector fijo y drawer persistente de espacios

**Estado:** Aceptada

## Contexto

El encabezado de espacio se renderizaba dentro del scroll de Inicio, Actividad
y Extras. Desaparecía al desplazarse, repetía composición en tres features y no
permitía cambiar ni crear espacios. El proyecto todavía no dispone de la base
local estructurada definitiva para todo el dominio.

## Opciones consideradas

1. Construir manualmente el panel, sus gestos y sus animaciones.
2. Usar `react-native-drawer-layout` directamente.
3. Usar `@react-navigation/drawer` dentro de la navegación existente y
   encapsular un contenido propio para espacios.

## Decisión

Se adopta la opción 3. El encabezado se compone una sola vez, fijo por encima
de las pestañas, con un botón que muestra únicamente el nombre del espacio y el
avatar existente. El drawer permite seleccionar espacios y crear otros con un
nombre. Ajustes aparece como acción inferior y abre una pantalla independiente.
Sus capacidades todavía no disponibles se presentan con un punto rojo y un
aviso explícito al tocarlas; las acciones operativas no llevan ese indicador.
El menú de espacios usa el violeta del CTA para selección, iconos y acciones,
en lugar del verde de marca anterior.

El catálogo local y `activeSpaceId` se guardan como un documento versionado
mediante `@react-native-async-storage/async-storage` 2.2.0 detrás de
`localSpaceRepository`. Este uso no contiene información financiera ni
reemplaza la futura persistencia estructurada de movimientos y categorías.

## Motivo

- El drawer oficial se integra con React Navigation 7 y reutiliza Gesture
  Handler, Reanimated y Worklets ya instalados.
- Evita mantener una implementación propia de gestos, backdrop y botón atrás.
- AsyncStorage está incluido en Expo Go para SDK 54 y es suficiente para un
  catálogo pequeño que se lee y escribe completo.
- El repositorio mantiene sustituible la infraestructura de persistencia.

Referencias: [Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
y [AsyncStorage en Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/async-storage/).

## Consecuencias positivas

- El contexto activo permanece visible al desplazar cualquier pestaña.
- Crear y seleccionar espacios tiene persistencia entre aperturas.
- Cambiar el espacio invalida inmediatamente los agregados visibles.
- El menú lateral funciona mediante la misma navegación en iOS y Android.

## Consecuencias negativas

- Se añaden dos dependencias directas.
- Los movimientos y categorías actuales todavía viven en memoria; únicamente
  persisten el catálogo de espacios y la selección activa.
- Los espacios adicionales locales no son espacios compartidos ni conceden
  permisos remotos.

## Riesgos

- Un documento local corrupto debe rechazarse sin mezclar identificadores.
- La futura migración remota deberá mapear los espacios locales sin duplicarlos.
- El drawer no debe quedar cubierto por botones flotantes u otros overlays.

## Validación

- Pruebas del repositorio, selección, creación y persistencia.
- Prueba del encabezado al cambiar entre pestañas.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.
- Exportación de los bundles de iOS y Android.

## Reemplaza

La ubicación del encabezado repetida por pantalla descrita en ADR-038; conserva
la obligación de mostrar siempre el espacio activo.

---

# ADR-046 — Calendario mensual embebido para la fecha del movimiento

**Estado:** Aceptada

## Contexto

El modal de movimiento ofrecía cuatro fechas rápidas, pero no permitía elegir
un día arbitrario ni navegar entre meses. La selección debe vivir en un
submodal coherente con `AppModal`, funcionar igual en iOS y Android y conservar
la fecha económica como cadena local `YYYY-MM-DD`.

## Opciones consideradas

1. `@react-native-community/datetimepicker` 8.4.4, versión recomendada por Expo
   SDK 54 y disponible en Expo Go. Usa la interfaz nativa, pero Android abre un
   diálogo del sistema en lugar de un calendario embebido equivalente al de
   iOS.
2. `react-native-calendars` 1.1314.0, calendario mensual declarativo, puro
   JavaScript y compatible con Expo, iOS y Android.
3. Construir manualmente la cuadrícula, navegación mensual y reglas de fechas.

## Decisión

Usar `react-native-calendars` dentro de un componente específico de
movimientos, apilado sobre el modal principal mediante `AppModal`. El selector
muestra el mes, permite navegar con flechas o gesto horizontal, localiza nombres
al español y devuelve directamente el `dateString` de la librería sin convertir
la fecha mediante UTC.

## Motivo

- Ofrece en ambas plataformas el mismo submodal solicitado.
- Resuelve navegación mensual, días de cada mes, selección y localización sin
  reimplementar lógica de calendario.
- Es compatible con Expo sin enlazado nativo y contiene declaraciones de
  TypeScript.
- La versión evaluada se publicó recientemente, tiene uso amplio y licencia
  MIT.

Referencias: [documentación de React Native Calendars](https://wix.github.io/react-native-calendars/docs/Intro),
[API de Calendar](https://wix.github.io/react-native-calendars/docs/Components/Calendar)
y [DateTimePicker recomendado por Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/date-time-picker/).

## Consecuencias positivas

- Cualquier fecha puede seleccionarse sin abandonar el flujo del movimiento.
- Mes, día seleccionado y acción para volver a hoy comparten el sistema visual
  existente.
- La dependencia queda encapsulada y no se filtra al modelo de dominio.

## Consecuencias negativas

- Se añaden la librería y sus dependencias JavaScript transitivas al bundle.
- La localización se configura mediante el registro global que expone la
  librería.

## Riesgos

- Una actualización puede modificar estilos internos o el comportamiento de
  accesibilidad; debe comprobarse el calendario en ambas plataformas.
- El modal debe verificarse con texto accesible y en pantallas compactas.
- El selector no impone todavía una fecha mínima o máxima porque el producto no
  ha definido esa restricción.

## Validación

- Pruebas de apertura, selección de fecha y envío del movimiento.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.
- Exportación de los bundles de iOS y Android y verificación manual cuando haya
  simuladores o dispositivos disponibles.

## Plan de retirada

Mantener la API de `TransactionDatePickerModal` y sustituir internamente el
calendario por el selector nativo u otra librería sin cambiar el formulario ni
el modelo de movimientos.

---

# ADR-047 — Distribución mensual y detalle operativo de categoría

**Estado:** Aceptada

## Contexto

La distribución de Actividad agregaba todo el historial y sus filas repetían
icono, balance y cantidad de movimientos. No existía un lugar único para
comprender y operar sobre una categoría.

## Decisión

- El donut conserva su implementación SVG y añade navegación por meses, limitada
  al mes actual como extremo futuro.
- La fila de categoría de Actividad muestra el icono y el nombre y, cuando
  existe presupuesto, el gasto acumulado y su progreso lineal. No muestra la
  cantidad de movimientos y abre un modal de detalle.
- El detalle muestra identidad, únicamente totales con actividad, presupuesto
  condicional con progreso lineal y movimientos asociados.
- Sus acciones permiten editar, archivar, añadir o retirar presupuesto, crear un
  movimiento preseleccionado y copiar la categoría a otro espacio local.
- Presupuesto y copia usan submodales apilados mediante la primitiva existente;
  la copia no se muestra cuando no existe otro espacio local.
- Copiar una categoría no copia movimientos y rechaza un nombre equivalente en
  el espacio de destino. Archivar conserva los movimientos asociados.

## Motivo

La gráfica mensual responde a una ventana temporal concreta y el detalle evita
cargar la vista previa con información y controles secundarios. Se reutilizan
`AppModal`, el editor de categoría, el formulario de movimiento, las tarjetas de
movimiento y el donut existente sin añadir dependencias.

## Consecuencias positivas

- La comparación histórica se realiza sin abandonar Actividad.
- La lista de categorías gana claridad y un objetivo táctil explícito.
- Las operaciones relacionadas quedan reunidas en un solo contexto.
- Las acciones actuales respetan el aislamiento por espacio del estado local.

## Consecuencias negativas

- El detalle concentra varias acciones y requiere scroll en pantallas compactas.
- Compartir en esta fase crea una copia local; la sincronización y los permisos
  remotos siguen perteneciendo a las fases de Supabase y espacios compartidos.

## Riesgos

- La futura persistencia debe representar el archivado, el presupuesto y el
  origen de las copias sin alterar los contratos visuales.
- Los movimientos de una categoría archivada deben conservarse aunque la
  categoría deje de aparecer en selectores activos.

## Validación

- Pruebas de cambio de mes y agregación temporal.
- Pruebas del detalle, presupuesto, copia, edición, archivado y alta de
  movimiento.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

---

# ADR-048 — Detalle y copia independiente de movimientos

**Estado:** Aceptada

## Contexto

Las tarjetas de movimiento no abrían ningún detalle y las vistas previas de
categoría de Inicio no propagaban su pulsación. La copia de un movimiento a
otro espacio debe mantener la relación obligatoria con una categoría del mismo
espacio, sin convertir el presupuesto de categoría en un dato del movimiento.

## Decisión

- Las previews de categoría y movimiento de Inicio abren su detalle directo.
- Las previews de movimiento de Actividad abren el mismo modal global.
- El detalle de movimiento reutiliza la distribución expandida, el cierre, el
  scroll gestual y la separación inferior del detalle de categoría, pero omite
  todas las métricas y acciones de presupuesto.
- Categorías y movimientos comparten un único selector de espacio para copiar.
- Ambos detalles comparten dos botones superiores visibles de eliminación y
  edición, representados por los SVG específicos de papelera y edición de
  `assets/icons`. La edición del movimiento
  reutiliza el formulario existente con un borrador inicial y la eliminación
  exige confirmación.
- Al copiar un movimiento se reutiliza una categoría equivalente del destino o
  se crea una copia independiente de su categoría sin presupuesto.
- La copia conserva importe, tipo, título, fecha y recurrencia, recibe un nuevo
  identificador y muestra la confirmación flotante común.

## Motivo

Centralizar los modales en la navegación principal permite abrir el mismo
detalle desde Inicio y Actividad sin duplicar estado ni componentes. Garantizar
la categoría en destino conserva la regla de dominio que impide movimientos
sin categoría o asociados a categorías de otro espacio.

## Consecuencias positivas

- Los detalles son accesibles desde cualquier preview con datos.
- La copia respeta el aislamiento por espacio y no traslada presupuestos.
- El selector y la confirmación de copia no se duplican entre features.

## Consecuencias negativas

- En la fase local actual, copiar un movimiento puede crear también una
  categoría de soporte en el destino.
- La persistencia futura deberá definir si «Eliminar» archiva o borra
  físicamente; en el estado local de sesión retira el movimiento del espacio.

## Riesgos

- La persistencia remota futura debe ejecutar la copia y la resolución de
  categoría de forma transaccional y aplicar permisos en backend.
- Dos copias concurrentes deberán evitar categorías equivalentes duplicadas.

## Validación

- Pruebas del detalle sin presupuesto y de su selector de espacio.
- Pruebas de apertura desde Inicio y Actividad.
- Prueba integrada de copia y confirmación global.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

---

# ADR-049 — Filtros de movimientos en una hoja modal

**Estado:** Aceptada

## Contexto

Actividad mostraba tres grupos de filtros dentro de un panel plegable entre el
resumen financiero y el listado. Al desplegarse, el panel desplazaba las
previews, competía visualmente con los badges y aplicaba cada selección de forma
inmediata, incluso antes de que la persona terminara de combinar opciones.

## Opciones consideradas

1. Mantener el panel plegable y simplificar únicamente su superficie.
2. Construir un modal con la primitiva `Modal` de React Native.
3. Añadir `react-native-modalize` o una librería de action sheets.
4. Crear una hoja específica sobre el `AppModal` existente, encapsulado sobre
   `@gorhom/bottom-sheet` v5.

## Decisión

Se adopta la opción 4. El botón ligero de Actividad abre una hoja modal con
grupos de tipo, categoría, recurrencia y fecha. La hoja mantiene un borrador local:
`Aplicar filtros` confirma todas las selecciones juntas, `Limpiar` prepara el
estado sin filtros y cerrar por botón, gesto o backdrop descarta los cambios no
aplicados. El grupo de tipo puede plegarse y usa opciones visualmente compactas
para conservar la altura de la hoja. Tipo, categoría y recurrencia reutilizan
la misma opción seleccionable del formulario de movimiento: check circular a
la izquierda, superficie blanca y borde violeta en el estado seleccionado. Los
cuatro grupos forman un acordeón con transición compartida y un único grupo
abierto para mantener la hoja acotada. Categoría admite selección múltiple con
las tarjetas del selector de movimiento; Categoría y Recurrencia usan catálogos
horizontales de dos filas y ancho completo. Fecha ocupa el primer grupo y
reutiliza el navegador de los reportes de Inicio. Todos, Semana, Quincena, Mes,
Año y Personalizada usan la misma opción con check en dos filas; Personalizada
queda junto a Quincena y abre un calendario para elegir un rango inclusivo. Los
periodos regulares conservan navegación histórica y futura y Todos mantiene la
opción sin restricción temporal. Limpiar y aplicar
reutilizan `ModalPrimaryAction`, con el CTA violeta compartido para confirmar.

## Motivo

- Apple recomienda hojas para tareas breves y acotadas relacionadas con el
  contexto actual, con título y acciones claras para cerrar o completar.
- La primitiva existente ya ofrece backdrop, gesto de cierre, safe area,
  tamaño dinámico y reducción de movimiento en iOS y Android.
- Gorhom v5 permanece mantenido y compatible con Expo; añadir otra librería
  duplicaría responsabilidades.
- `Modal` de React Native no aporta por sí mismo el comportamiento gestual y
  visual común del proyecto; Modalize muestra menor actividad de mantenimiento
  y una action sheet no representa bien varios grupos seleccionables.

Referencias: [Sheets — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sheets),
[Modality — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/modality),
[React Native Bottom Sheet v5](https://gorhom.dev/react-native-bottom-sheet/)
y [Modal — React Native](https://reactnative.dev/docs/modal).

## Consecuencias positivas

- El listado no cambia hasta confirmar el conjunto de filtros.
- El contenido principal conserva su posición al preparar selecciones.
- Los chips comunican la selección mediante color, check y estado accesible.
- No se añade ninguna dependencia.

## Consecuencias negativas

- Aplicar filtros requiere una acción adicional.
- Las categorías y recurrencias usan filas horizontales dentro de la hoja para
  conservar una altura acotada.

## Riesgos

- Debe verificarse el desplazamiento horizontal con muchas categorías y texto
  accesible en dispositivos compactos.
- La futura búsqueda o selección por fecha puede exigir scroll vertical o una
  variante de mayor altura.

## Validación

- Pruebas de apertura, cierre sin aplicar, combinación, aplicación y limpieza.
- Typecheck, lint, formato y pruebas mediante `npm run validate`.

---

# ADR-050 — SQLite local-first para categorías y movimientos

**Estado:** Aceptada

## Contexto

Las categorías y los movimientos vivían únicamente en el estado de sesión y se
perdían al cerrar la app. El producto debe funcionar sin conexión ahora y, una
vez conectado a Supabase, conservar las altas, ediciones y eliminaciones hechas
offline para sincronizarlas después. El catálogo pequeño de espacios ya usa
AsyncStorage, pero `DATABASE.md` reservaba la elección del almacenamiento
estructurado.

## Opciones consideradas

1. Guardar documentos completos en AsyncStorage 2.2.
2. Usar `expo-sqlite` 16 directamente detrás de repositorios.
3. Adoptar WatermelonDB como base reactiva y motor de sincronización.

## Decisión

Usar `expo-sqlite` 16 con una base `juntoss.db`, migraciones incrementales por
`PRAGMA user_version`, WAL, claves foráneas y consultas parametrizadas. Las
categorías y los movimientos reciben UUID desde su creación, autor local estable,
fechas técnicas, origen de copia, archivado y estado de sincronización. Toda
mutación local se confirma en el repositorio antes de actualizar la interfaz.

Las filas nuevas permanecen `local_only`. Cuando la futura sincronización marque
una fila como remota, editarla o archivarla la moverá a `pending`. El transporte,
los reintentos y los conflictos no forman parte de esta entrega.

## Motivo

- Es la opción oficial de Expo SDK 54, está incluida en Expo Go y funciona en
  iOS y Android sin abandonar el flujo físico actual.
- Aporta consultas, transacciones, índices y migraciones sin introducir un ORM
  ni otro modelo reactivo antes de necesitarlo.
- AsyncStorage obliga a reescribir documentos completos y no protege relaciones
  entre categoría, movimiento y espacio.
- WatermelonDB está orientado a conjuntos grandes y sincronización avanzada;
  su capa reactiva y configuración nativa no se justifican todavía y dificultan
  la retirada.

Referencias: [Expo SQLite para SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/)
y [WatermelonDB](https://github.com/Nozbe/WatermelonDB).

## Consecuencias positivas

- Categorías y movimientos sobreviven a reinicios y cambios de conexión.
- El aislamiento por espacio se valida también mediante una clave foránea
  compuesta.
- Archivar conserva tombstones para una sincronización futura.
- Los repositorios mantienen a la UI independiente de SQLite y Supabase.
- El esquema puede evolucionar mediante migraciones pequeñas y revisables.

## Consecuencias negativas

- Se añade `expo-sqlite` y se mantiene AsyncStorage para el uso acotado de
  espacios hasta una migración posterior deliberada.
- La UI carga por ahora el conjunto local activo en memoria; las consultas
  paginadas se añadirán cuando el volumen de Actividad lo requiera.
- El cifrado de la base no se activa en Expo Go y deberá evaluarse antes de
  almacenar datos que exijan protección adicional.

## Riesgos

- Una migración defectuosa puede impedir abrir datos locales; cada versión debe
  probar creación desde cero y actualización desde la versión anterior.
- La sincronización futura debe ignorar tombstones `local_only` que nunca hayan
  existido en remoto y hacer idempotentes los UUID ya migrados.
- Las copias entre espacios deberán coordinarse con transacciones remotas cuando
  exista Supabase.

## Validación

- Pruebas de esquema, versión, clave por espacio, UUID, creación, restauración,
  edición y archivado.
- Pruebas integradas de navegación y creación sobre repositorios simulados.
- `npm run validate`, `expo install --check`, `expo-doctor` y exportación de iOS
  y Android.

## Plan de retirada

Conservar los contratos de repositorio, exportar filas por UUID y sustituir el
adaptador SQLite. La UI no necesita conocer el nuevo proveedor.

## Reemplaza

ADR-025 y resuelve D-001. La instrucción actual de producto prioriza la
experiencia local-first frente a la propuesta remota inicial.

---

# ADR-051 — Mapa de movimientos sobre el calendario compartido

**Estado:** Aceptada

## Contexto

El selector de fecha ya encapsulaba `react-native-calendars`, pero solo mostraba
un mes navegable mediante flechas o gesto horizontal. Se necesita consultar
gastos e ingresos en forma de calendario, recorrer meses verticalmente y
mantener una jerarquía clara entre el mes enfocado y los meses adyacentes.

## Opciones consideradas

1. Crear otra cuadrícula y su lógica de desplazamiento dentro de Mapa.
2. Añadir una segunda librería especializada en agendas.
3. Extraer la configuración actual a una primitiva y usar `CalendarList` de la
   misma dependencia para la variante vertical.
4. Reutilizar `Calendar` para cada mes y controlar su lista vertical mediante
   una `FlatList` nativa de geometría fija.

## Decisión

Se adopta la opción 4. `AppCalendar` concentra localización, tema, selección y
marcas. El submodal de movimiento conserva la variante mensual y Mapa usa la
variante vertical. Mapa sustituye el destino vacío Extras, recibe los
movimientos ya filtrados por el espacio activo y reutiliza `AppModal` y
`TransactionPreviewCard` para mostrar el día elegido.

La superficie del calendario ocupa todo el ancho y su encabezado descriptivo
mantiene el gutter de pantalla. Todos los números usan el mismo contraste; el
foco del mes no crea estados ni animaciones de opacidad por día. Las marcas
circulares de gasto e ingreso tienen
espacio propio debajo del número y no forman parte del fondo seleccionado.
Mapa ofrece además una agenda semanal propia y alterna entre ambas vistas desde
un badge a la derecha de la leyenda. La agenda usa una lista vertical de semanas
y extiende `CategoryPreviewCard` con una variante compacta para mostrar el icono
de categoría y el título de cada movimiento bajo su día. Los encabezados de mes
aparecen una vez por cambio y combinan ambos nombres en semanas de transición.
La vista semanal conserva la superficie blanca, la alineación a siete columnas,
el mes centrado y los mismos roles tipográficos de mes, día y número que la vista
mensual. Solo añade bajo cada número las previews compactas, cuyo borde interior
de un píxel mantiene el contraste sobre esa misma superficie. Ambas variantes
comparten el ancho completo de sus siete columnas y alternan mediante una
transición corta con reducción de movimiento. El fondo no se transforma: se
animan únicamente la opacidad y el desplazamiento corto de las dos capas. No se
crean transiciones por día, etiqueta o preview: reiniciar decenas de animaciones
dentro de listas virtualizadas retrasaba el commit de React a partir del segundo
cambio. La acción global de creación no depende del scroll de una pestaña y
permanece flotante sobre ambas variantes.
Ambas variantes comparten enero de 2024 como límite inferior y diciembre de 2080
como límite superior. La agenda semanal genera cronológicamente ese mismo rango
completo. La fecha actual determina la primera ventana semanal
visible, no un salto mediante `initialScrollIndex`: las semanas tienen altura
variable por sus previews y no ofrecen una geometría válida para calcular ese
offset remoto. Tras el primer layout se incorpora el resto del rango y
`maintainVisibleContentPosition` conserva la semana que el usuario está viendo.
La fecha actual no es el primer dato del modelo ni un límite del historial. El callback de
visibilidad permanece estable y cambiar de semana enfocada no reconstruye la
lista.
Ambas vistas permanecen montadas durante la sesión de Mapa, con una ventana
inicial semanal limitada a seis elementos. La capa inactiva queda oculta, sin
interacción y fuera del árbol de accesibilidad. Así el primer cambio no espera a
crear otra lista y el caché no duplica movimientos ni añade persistencia.
Cada cambio anima la opacidad y un desplazamiento vertical corto de ambas capas,
por lo que conservar el montaje no elimina la transición visual. Los calendarios
están memoizados y cambiar el badge o el orden de capas no reconstruye sus
listas. El periodo de la vista activa es la referencia canónica. El coordinador
existente adelanta la lista oculta hacia la última fecha activa con actualizaciones
agrupadas cada 100 ms, evitando competir por cada frame del gesto. Los callbacks
de visibilidad conservan aparte la posición realmente confirmada; al alternar se
repite la comparación y solo se solicita scroll si el destino sigue siendo
distinto. La lista
semanal delega su ventana de render al comportamiento virtualizado de
`FlatList`, sin invertir ni reordenar la cronología.
La lista mensual usa seis filas de altura fija para que la geometría real
coincida con `getItemLayout` y el historial pueda recorrerse de forma continua
hasta enero de 2024. La `FlatList` local renderiza directamente instancias del
mismo `Calendar` compartido y mantiene nueve ventanas de pantalla preparadas.
No usa el placeholder interno de `CalendarList`, que solo materializaba meses
cercanos al foco y dejaba huecos al desplazar más rápido que su actualización de
visibilidad. El calendario semanal presenta primero el mes activo y, tras ese
layout, incorpora de una vez el historial completo preservando la posición; así
los flings posteriores no dependen de añadir nuevos bloques de datos.
Esta composición resulta más adecuada que `WeekCalendar`: la variante de la
librería resuelve navegación por semanas, pero no columnas de altura variable
con previews de movimientos ni desplazamiento vertical continuo.
La hoja del día mantiene una acción primaria flotante sobre su scroll y abre el
formulario de movimiento con esa fecha precargada; su contenido reserva al final
la altura de la acción y el inset inferior. Mapa observa el mes enfocado y, al
alcanzar seis meses de distancia respecto al actual, muestra junto a la acción
global un retorno a hoy. Su doble flecha apunta hacia arriba desde meses futuros
y hacia abajo desde meses antiguos, indicando la dirección del desplazamiento.
El pill queda centrado verticalmente a la izquierda del botón global y usa el
borde neutro compartido y compensa 32 pt hacia abajo su distinto contenedor de
posicionamiento. Volver a hoy no desplaza imperativamente ninguna lista: la
superficie completa hace un fade-out de 200 ms, ambas variantes se remontan con
la fecha actual como ancla mientras son invisibles y después hacen un fade-in de
300 ms. Las claves de montaje cambian solo para este reset explícito; durante la
navegación normal ambas listas siguen montadas y conservan su caché. El flujo no
muestra loader ni texto direccional y respeta la preferencia de reducción de
movimiento del sistema.

## Consecuencias positivas

- No se añade ninguna dependencia ni se duplican tema o localización.
- El calendario responde al espacio activo con los mismos datos que el resto de
  la aplicación.
- Gastos e ingresos se distinguen visualmente y en texto.
- El domingo conserva el mismo ancho y visibilidad que el resto de columnas.

## Consecuencias negativas

- La variante vertical necesita un render de día propio para separar número,
  selección y marcas sin modificar la dependencia.
- La detección de foco sigue la visibilidad mensual que expone `CalendarList`.

## Riesgos

- Las listas extensas de un mismo día deben conservar desplazamiento y
  accesibilidad dentro de la hoja de detalle.
- Los anchos compactos deben comprobar que las siete columnas permanecen
  visibles sin reducir los objetivos táctiles efectivos.

## Validación

- Pruebas de marcas de gasto e ingreso y días vacíos.
- Pruebas de ancho completo, cambio de foco y separación de marcas.
- `npm run validate` y verificación manual en iOS y Android.

## Reemplaza

Actualiza ADR-026 y ADR-032 para sustituir Extras por Mapa. Amplía ADR-046 sin
cambiar la dependencia elegida ni el contrato de fecha del movimiento.

---

# ADR-052 — Series locales abiertas y recurrencia personalizada

**Estado:** Aceptada

## Contexto

Guardar únicamente la etiqueta semanal, quincenal o mensual no repetía ningún
movimiento. Además, el producto necesita una quinta opción para elegir una
cantidad finita de fechas exactas desde el calendario existente.

## Opciones consideradas

1. Generar por adelantado un horizonte fijo de movimientos futuros.
2. Conservar una serie abierta y materializar sus ocurrencias al vencer.
3. Depender de una tarea remota, aunque Supabase todavía no forma parte de la
   fase activa.

## Decisión

Se adopta la opción 2 para semanal, quincenal y mensual. SQLite conserva una
plantilla de serie, su fecha inicial, la cantidad ya generada y la siguiente
fecha pendiente. Al cargar los movimientos se materializan de forma
transaccional todas las ocurrencias vencidas. Una restricción única por serie y
fecha evita duplicados. Quincenal avanza cada 15 días desde la fecha inicial.

El selector añade `custom`, presentado como `Personalizada`. Su submodal permite
indicar la cantidad total de ocurrencias y después exige elegir exactamente esa
cantidad de fechas mediante `AppCalendar`. La acción `No estoy seguro` omite el
límite previo y permite seleccionar cualquier cantidad positiva de fechas. Esas
ocurrencias finitas se crean juntas y no mantienen una serie abierta.

## Motivo

- Una serie abierta representa una repetición indefinida sin crear infinitas
  filas ni inventar un horizonte.
- La materialización local encaja con SQLite local-first y funciona sin red.
- El calendario, el apilado de modales y las acciones comunes ya cubren la
  interacción solicitada sin otra dependencia.
- Las fechas personalizadas se conocen desde el inicio y pueden persistirse de
  forma atómica.

## Consecuencias positivas

- Las repeticiones vencidas sobreviven a cierres prolongados de la aplicación.
- Crear una serie con fecha pasada recupera de inmediato las ocurrencias que ya
  correspondían.
- Personalizada crea exactamente una ocurrencia por fecha elegida.
- Actividad y detalle reconocen la quinta recurrencia.

## Consecuencias negativas

- Mientras no exista ejecución remota, una ocurrencia automática aparece al
  volver a cargar la aplicación, no mediante un proceso en segundo plano con la
  app cerrada.
- Editar, pausar o eliminar la serie completa sigue pendiente; las acciones
  actuales operan sobre una ocurrencia.

## Riesgos

- La futura sincronización debe hacer idempotente la materialización entre
  dispositivos y decidir qué capa ejecuta la serie.
- Cambiar una plantilla completa exige un flujo explícito para no reescribir
  silenciosamente ocurrencias históricas.

## Validación

- Pruebas del intervalo quincenal de 15 días y de meses con distinta duración.
- Pruebas de creación múltiple personalizada y recuperación de fechas vencidas.
- Prueba del submodal de cantidad y selección exacta en calendario.
- `npm run validate`.

## Reemplaza

ADR-040, al ampliar el dominio con `custom` y definir el comportamiento real de
las frecuencias que antes eran solo etiquetas.

---

# ADR-053 — Previews agrupadas por recurrencia

**Estado:** Aceptada

## Contexto

Una recurrencia personalizada materializa todas sus fechas exactas en una sola
operación. Un lote amplio podía ocupar por sí solo Inicio y la lista completa de
Actividad, aunque sus ocurrencias deban seguir existiendo para cálculos,
calendario, detalle y persistencia. Las series semanal, quincenal y mensual
tienen otra semántica: son abiertas y ya conocen su próxima fecha pendiente.

## Opciones consideradas

1. Limitar u ocultar ocurrencias sin conservar una relación explícita.
2. Inferir los lotes por título, importe, categoría y fecha de creación.
3. Persistir un identificador de grupo para el lote personalizado y resolver la
   composición en una lista reutilizable de previews.

## Decisión

Se adopta la opción 3. SQLite versión 3 añade `recurrence_group_id`; todas las
fechas de una misma creación personalizada comparten el valor. Inicio,
Actividad y el detalle de categoría reutilizan `TransactionPreviewList`:

- Personalizada muestra una tarjeta con dos capas posteriores y una flecha
  descendente. Al abrirla, las capas dan paso a las tarjetas reales, que bajan
  con un fade breve de arriba abajo dentro de una rama indentada; al cerrar se
  comprimen en el mismo orden. La tarjeta principal permanece por encima de la
  transición, que mueve el contenido posterior y respeta la reducción de
  movimiento del sistema.
- Semanal, quincenal y mensual muestran una única preview por
  `recurrence_series_id`, con `next_occurrence_on` como fecha visible y sin
  flecha de despliegue.
- Único nunca se agrupa.
- Los límites visuales se aplican después de agrupar; balances, filtros y
  conteos continúan usando cada movimiento real.
- Editar una ocurrencia Única, Semanal, Quincenal o Mensual como Personalizada
  reutiliza su identificador para la primera fecha, crea las restantes en una
  única transacción local y asigna un grupo nuevo a todo el lote.

## Motivo

La relación persistida evita unir por accidente gastos parecidos y mantiene la
agrupación tras reiniciar. La lista compartida impide que cada pantalla aplique
una regla distinta y no requiere otra dependencia.

## Consecuencias positivas

- Un lote personalizado grande ocupa una sola posición mientras está plegado.
- Cada ocurrencia conserva detalle, fecha e impacto financiero propios.
- Las series automáticas comunican directamente su siguiente fecha.
- El control es accesible y funciona con la misma implementación en iOS y
  Android.

## Consecuencias negativas

- La fecha visible de una serie automática representa su próxima ejecución, no
  la fecha histórica de la ocurrencia usada para abrir el detalle.
- Las filas personalizadas anteriores requieren una asignación de grupo durante
  la migración local.

## Riesgos

- La sincronización remota futura debe conservar el identificador de grupo o
  proporcionar un equivalente estable entre dispositivos.
- Editar una serie completa continúa fuera de alcance; hoy cada ocurrencia
  conserva sus acciones individuales.

## Validación

- Pruebas de agrupación, despliegue, límite posterior al agrupado y exclusión de
  movimientos únicos.
- Prueba de una sola preview automática con su próxima fecha.
- Pruebas de migración y restauración del identificador local.
- `npm run validate` y verificación manual en iOS y Android.

---

# ADR-054 — Pestaña de mes y fila de días fija en la vista mensual de Mapa

**Estado:** Aceptada

## Contexto

La cabecera fija de Mapa mostraba dos badges de leyenda ("Gastos"/"Ingresos")
junto al selector Mensual/Semanal. El responsable del producto considera esa
leyenda redundante, porque los puntos de color ya son autoexplicativos, y pidió
reutilizar ese espacio para mostrar el mes que se está viendo. Además, dentro
de la vista mensual, el nombre del mes y la fila Lun-Dom vivían dentro de la
cabecera propia de cada mes (`ScrollCalendarHeader` en `AppCalendar`, modo
`scroll`) y se desplazaban con el resto del contenido; se pidió que Lun-Dom
quede fijo arriba y que solo los números se desplacen debajo, como en un
calendario nativo.

## Decisión

- Mapa quita la leyenda de color. Los puntos de gasto e ingreso sobre el
  calendario no cambian.
- En su lugar aparece una pestaña con fondo blanco (el mismo de la superficie
  del calendario), sin margen inferior, que muestra el mes enfocado —nombre en
  peso `bold` y año en peso `light`, para diferenciarlos sin cambiar de
  tamaño— y se actualiza con la misma señal (`focusedMonth`) que ya usaban la
  vista mensual y semanal. Siempre muestra un único mes, sin variante "Mes A -
  Mes B" para transiciones: se prioriza la reutilización de la lógica
  existente sobre una detección nueva de dos meses visibles a la vez.
- El control `Mensual`/`Semanal` adopta exactamente el mismo tratamiento de
  pestaña que el mes enfocado —mismo fondo, mismo radio solo en las esquinas
  superiores, mismo relleno, sin borde ni icono— en lugar de una píldora
  flotante con sombra. Al reducir su alto visual respecto a la píldora
  anterior, compensa el objetivo táctil mínimo con `hitSlop` en vez de
  `minHeight`.
- La vista semanal deja de anunciar el mes sobre la semana que lo introduce
  (`shouldShowWeekMonthLabel`/`formatWeekMonthLabel` dejan de usarse para
  renderizar texto): la pestaña fija ya lo muestra y repetirlo dentro de la
  lista era redundante. Ambas funciones se conservan y se siguen exportando
  desde `WeeklyMovementCalendar`, porque `shouldShowWeekMonthLabel` continúa
  decidiendo la semana inicial visible (`getMonthIntroductionWeekIndex`) y
  las pruebas existentes verifican su lógica de forma independiente de la
  UI.
- La vista semanal recibe el mismo tratamiento que `AppCalendar` para Lun-Dom:
  cada columna dejaba de mostrar el nombre del día sobre su número dentro de
  cada semana; ahora una única fila `WeekdayHeaderRow` con las siete columnas
  se renderiza como hermano fijo por encima del `FlatList` de semanas, y cada
  semana solo repite el número de cada día. Se implementa localmente en
  `WeeklyMovementCalendar` en vez de compartir componente con `AppCalendar`
  (que vive en `components/ui/`, una capa distinta) porque ambos casos son
  simples y usarse dos veces dentro del mismo dominio no justifica una
  extracción compartida.
- `AppCalendar` (solo su modo `scroll`, usado exclusivamente por Mapa) deja de
  renderizar título y fila Lun-Dom dentro de cada mes: `customHeader` pasa a un
  componente que retorna `null`. Una fila Lun-Dom única se renderiza como
  hermano fijo por encima del `FlatList`, sin lógica de scroll ni overlay
  absoluto.
- `calendarMonthHeight` (usado por `getItemLayout`) se recalcula a partir de la
  grilla de 6 semanas (`showSixWeeks`) sin cabecera: `6 * (alto de día + margen
  vertical de fila × 2)`, hoy `408`. Antes eran `520` con cabecera incluida.

## Motivo

Retirar la cabecera por item en lugar de ocultarla visualmente evita huecos en
blanco entre meses (el contenido debía encoger, no solo camuflarse) y evita que
el título/los días de la semana destellen a mitad de pantalla durante el
scroll. Colocar la fila Lun-Dom como hermano normal del `FlatList` —en vez de
un overlay con posición absoluta sincronizado al scroll— evita cualquier
lógica de alineación entre capas: al no estar dentro de la lista virtualizada,
nunca se desplaza. El nuevo alto de `calendarMonthHeight` se deriva de
constantes propias del componente (tamaño de celda, token de espaciado), no de
métricas de fuente, lo que mantiene bajo el riesgo de desajustar
`getItemLayout` en una lista virtualizada ya señalada como sensible en
ADR-051.

## Consecuencias positivas

- La cabecera de Mapa gana una referencia de contexto (el mes visible) donde
  antes había una leyenda redundante.
- Lun-Dom es una única fuente visual, sin repetirse en cada mes ni desplazarse.
- El cambio queda acotado al modo `scroll` de `AppCalendar`; el selector de
  fecha del formulario de movimiento (modo `month`) no se modifica.

## Consecuencias negativas

- Se pierde la alternativa textual "Gastos"/"Ingresos" junto a los puntos de
  color en la vista de calendario; sigue disponible como encabezado de sección
  dentro de la hoja de un día (`MapDayModal`), pero no en la vista general.
- La vista mensual no comunica cuándo el scroll está a caballo entre dos meses:
  la pestaña siempre resuelve a un único mes.

## Riesgos

- Un futuro cambio en `scrollCalendarDayHeight` o en el token `spacing.sm`
  debe revisar que `calendarMonthHeight` siga derivándose de ellos y no quede
  como literal suelto.
- La accesibilidad de cada día en la vista semanal (`accessibilityLabel`,
  ej. "Lun 15") sigue construyéndose con el nombre del día aunque ya no se
  muestre visualmente sobre el número; un lector de pantalla no asocia
  espacialmente la fila fija con la columna, así que la etiqueta debe
  seguir siendo autocontenida.

## Validación

- Pruebas de `AppCalendar.test.tsx` (altura de item recalculada, fila Lun-Dom
  fija), `MapScreen.test.tsx` (pestaña de mes, ausencia de la leyenda, estilo
  del control Mensual/Semanal) y `WeeklyMovementCalendar.test.tsx` (ausencia
  del anuncio de mes por semana y del nombre de día repetido por columna).
- Verificación manual en Expo: Lun-Dom fijo, solo los números se desplazan, la
  pestaña cambia de mes al hacer scroll en ambas vistas, sin huecos ni solapes
  entre meses en scroll rápido, el control Mensual/Semanal comparte tamaño y
  tratamiento visual con la pestaña de mes, y el selector de fecha del
  formulario de movimiento sin cambios.

## Reemplaza

Amplía ADR-051 en la parte relativa a la leyenda y a la cabecera de la vista
mensual; el resto de esa decisión (geometría de 6 filas, límites de fecha,
montaje simultáneo de ambas vistas) no cambia.

---

# ADR-055 — Edición efectiva hacia adelante de series automáticas

**Estado:** Aceptada

## Contexto

El precio u otros datos de un gasto o ingreso recurrente pueden cambiar después
de varias repeticiones. Actualizar solo la ocurrencia elegida dejaba la plantilla
con los valores antiguos; actualizar toda la serie destruiría el historial real.

## Decisión

Cuando se edita una ocurrencia semanal, quincenal o mensual sin cambiar su
frecuencia, los nuevos datos se aplican desde esa ocurrencia hacia adelante. La
misma transacción actualiza la ocurrencia elegida, cualquier ocurrencia posterior
ya materializada y la plantilla de la serie. Ninguna ocurrencia anterior cambia.

La regla es idéntica para gastos e ingresos.

## Motivo

Cada ocurrencia pasada representa un hecho financiero independiente, mientras
que la plantilla representa únicamente cómo se crearán las repeticiones que
todavía no existen.

## Consecuencias positivas

- Los balances históricos conservan los importes que realmente correspondían.
- Las siguientes repeticiones usan el nuevo importe sin intervención adicional.
- Cerrar la app antes de la próxima fecha no pierde el cambio de plantilla.

## Consecuencias negativas

- Una edición puede modificar varias filas posteriores ya materializadas.
- Cambiar la frecuencia continúa siendo un caso distinto y no adopta
  implícitamente esta regla.

## Riesgos

- La sincronización remota futura deberá ejecutar la misma operación de forma
  atómica e idempotente entre dispositivos.

## Validación

- Pruebas de repositorio para gastos e ingresos con ocurrencias anteriores y
  posteriores.
- `npm run validate`.

## Reemplaza

Resuelve el riesgo de cambio de plantilla pendiente descrito en ADR-052 sin
alterar su estrategia de materialización local.

---

# ADR-056 — Horizonte financiero mensual y desglose temporal de Inicio

**Estado:** Aceptada

## Contexto

Un movimiento único o personalizado puede persistirse con una fecha económica
futura. Excluir cualquier día posterior a hoy impedía que Inicio ofreciera la
visión completa del mes en curso; incluir todos los meses futuros, en cambio,
anticiparía importes demasiado lejanos y distorsionaría el balance disponible.

## Opciones consideradas

1. Impedir seleccionar fechas futuras.
2. Guardar el movimiento y contabilizarlo inmediatamente.
3. Incluir el mes local actual completo y mantener programados los meses
   posteriores.

## Decisión

Se adopta la opción 3. Inicio acumula los movimientos anteriores y todos los del
mes local actual para el balance; sus indicadores de ingresos y gastos agregan
solo el mes actual completo. Los movimientos de meses posteriores se mantienen
en SQLite y en Mapa, pero se excluyen de Inicio, Actividad, categorías,
presupuestos y sus agregados hasta que comienza su mes. La regla se aplica a
ingresos y gastos mediante una utilidad de dominio compartida.

Los indicadores de ingresos y gastos de Inicio abren dos modales configurados
sobre el mismo componente. Cada modal filtra el tipo correspondiente por semana
de calendario, quincena, mes o año. Reutiliza `MonthNavigator` para recorrer
periodos históricos y futuros y mostrar un título adaptado al filtro. Las
ocurrencias automáticas futuras se proyectan en memoria para el periodo visible,
sin persistirlas ni incorporarlas al resumen principal de Inicio. Los filtros
temporales reutilizan la opción seleccionable con superficie blanca, check y
borde violeta al seleccionarse; la acción final usa verde para ingresos y rojo para gastos.
Cada variante muestra bajo los filtros una tarjeta calculada sobre el periodo:
total de ingresos, total de gastos o balance.

El balance principal de Inicio abre una tercera configuración del mismo
componente. Su listado combina ambos tipos, su resumen calcula ingresos menos
gastos y su acción final permite añadir un movimiento.

Los tres badges del resumen de movimientos de Actividad abren esas mismas
variantes de ingreso, gasto y balance. El acceso no crea componentes paralelos y
conserva los mismos filtros, proyección temporal y acciones de alta.

## Motivo

El mes en curso es el horizonte de planificación inmediato que el usuario ha
pedido ver en Inicio. Conservar los meses posteriores sin agregarlos evita que
una recurrencia mensual sume septiembre mientras la aplicación sigue en agosto.

## Consecuencias positivas

- El balance combina el histórico con la previsión completa del mes actual.
- Los totales mensuales incluyen todos los ingresos y gastos registrados para
  el mes en curso.
- Los movimientos de meses posteriores no consumen el presupuesto del mes
  actual.
- Los movimientos programados siguen siendo localizables en Mapa.
- Los modales y Mapa pueden consultar una serie abierta en cualquier periodo
  visible, aunque su ocurrencia todavía no esté materializada.
- Las tres variantes reutilizan `AppModal`, `TransactionPreviewList` y la acción
  primaria existente, además del navegador temporal de Actividad.
- La variante de balance evita crear otro flujo o componente paralelo.

## Consecuencias negativas

- Un movimiento de un mes posterior no aparece en Actividad ni en movimientos
  recientes hasta que comienza ese mes; Mapa es su punto de consulta previo.
- La quincena necesita una definición explícita por calendario.

## Riesgos

- Mantener la app abierta durante un cambio de mes puede requerir una señal de
  reloj para refrescar sin otra actualización de estado.
- La sincronización remota debe conservar la fecha económica sin convertirla a
  UTC.

## Validación

- Pruebas de fechas restantes del mes actual incluidas y meses posteriores
  excluidos de agregados.
- Pruebas de navegación futura y proyección recurrente en modales y Mapa.
- Pruebas de los cuatro periodos y de ambos accesos desde Inicio.
- `npm run validate`.

---

# ADR-057 — Previews independientes para ocurrencias automáticas

**Estado:** Aceptada

## Contexto

Agrupar una serie semanal, quincenal o mensual en una única preview y reemplazar
su fecha por `next_occurrence_on` hacía que distintos periodos mostrasen la misma
tarjeta madre. También ocultaba que las ocurrencias materializadas conservan
valores históricos independientes cuando la serie cambia hacia adelante.

## Decisión

Cada ocurrencia automática se presenta como una preview independiente con su
propia fecha económica. Las proyecciones futuras muestran la fecha concreta del
periodo consultado y reciben una identidad estable para abrir su detalle. Si se
editan antes de vencer, el repositorio materializa hasta esa fecha con la
plantilla anterior y aplica el cambio desde la ocurrencia elegida. Solo las
recurrencias personalizadas finitas mantienen la carpeta visual apilada.

## Motivo

La preview debe representar el movimiento que afecta al periodo visible, no la
plantilla que genera la serie. Así una edición efectiva desde marzo puede
mostrar enero y febrero con sus valores históricos y marzo y los meses
posteriores con los nuevos valores.

## Consecuencias positivas

- Cada mes muestra su propia tarjeta y fecha.
- Las tarjetas futuras de Mapa abren su detalle y permiten editarse.
- El historial visible coincide con las filas independientes de SQLite.
- La edición hacia adelante de ADR-055 deja de parecer una reescritura global.

## Consecuencias negativas

- Una serie automática puede ocupar varias posiciones en listados que abarcan
  periodos amplios.

## Validación

- Pruebas de previews con varias ocurrencias de la misma serie.
- Prueba de una proyección mensual cuya fecha difiere de la próxima fecha global.
- Prueba de acceso desde Mapa y edición transaccional de una proyección futura.
- `npm run validate`.

## Reemplaza

La agrupación de series automáticas definida en ADR-053. Conserva sin cambios
la agrupación de recurrencias personalizadas.

---

# ADR-058 — Vista semanal inicial en Mapa

**Estado:** Aceptada

## Contexto

Mapa abría inicialmente la superficie mensual aunque la vista semanal permite
reconocer directamente los movimientos mediante sus previews compactas.

## Decisión

Mapa inicia en `Semanal`. El control conserva el nombre de la vista activa y al
pulsarlo cambia a `Mensual`; las dos superficies continúan montadas y usan el
mismo coordinador de foco y transición existente.

## Consecuencias

- Los movimientos de la semana visible aparecen inmediatamente al entrar.
- La vista mensual continúa disponible con una sola pulsación.
- No cambia la persistencia ni se añade una preferencia de usuario.

## Validación

- Pruebas del estado inicial, alternancia y sincronización en ambos sentidos.
- `npm run validate`.

---

# ADR-059 — Migración invitado-cuenta mediante RPC transaccional

**Estado:** Aceptada

## Contexto

SQLite ya conserva categorías, series recurrentes y movimientos local-first,
pero todavía no existía un contrato remoto ni una forma segura de asociar los
datos invitados a una cuenta. Los IDs históricos de espacio y de algunas series
no son necesariamente UUID, por lo que usarlos directamente como claves remotas
rompería instalaciones anteriores. Además, iniciar sesión con otra cuenta en el
mismo dispositivo no debe mezclar silenciosamente la información local.

## Opciones consideradas

1. Enviar `upsert` independientes desde el cliente para cada tabla.
2. Enviar un lote completo a una función PostgreSQL transaccional.
3. Interponer una Edge Function que coordine escrituras independientes.

## Decisión

Se adopta la opción 2. `migrate_guest_data` recibe espacios, categorías, series
y movimientos en un único lote. La función obtiene el usuario exclusivamente
de `auth.uid()`, resuelve IDs locales mediante claves de origen por instalación,
fuerza la autoría autenticada y confirma los conteos solo después de completar
la transacción.

SQLite versión 5 añade el vínculo de cuenta y el historial de lotes. La primera
migración exige confirmación explícita; después una cuenta diferente se rechaza.
Las filas pasan a `syncing` al preparar el lote, a `synced` únicamente después
de validar la respuesta remota y a `failed` ante cualquier error recuperable.
No se elimina la copia local.

El cliente usa `@supabase/supabase-js` y `react-native-url-polyfill`. En móvil
la sesión se guarda mediante `expo-secure-store`; web conserva el adaptador
AsyncStorage recomendado para ese entorno. La URL y la publishable key son
configuración pública de Expo; ninguna service-role key entra en el bundle.

## Motivo

- Una función PostgreSQL evita categorías sin movimientos o lotes parciales.
- Las claves `(espacio, instalación, id local)` hacen idempotentes los reintentos
  sin exigir reescribir IDs heredados del dispositivo.
- `space_local_sources` permite que varias instalaciones apunten al mismo
  espacio personal remoto sin reemplazar el mapa de otra instalación.
- Una Edge Function añadiría otra frontera y no mejoraría la atomicidad que ya
  ofrece PostgreSQL.

## Consecuencias positivas

- Los importes, monedas, fechas económicas, recurrencias, archivados y fechas
  técnicas llegan juntos y mantienen sus relaciones.
- RLS protege lecturas y mutaciones ordinarias por membresía y autoría.
- Repetir un lote o crear otro tras una respuesta perdida no duplica filas.
- La futura pantalla de autenticación solo tendrá que confirmar la propiedad y
  llamar a `syncPendingLocalDataForCurrentSession`.

## Consecuencias negativas

- La sincronización de invitado usa JSON y bucles PostgreSQL; es apropiada para
  los límites actuales, no para importaciones masivas.
- Todavía no existe pull remoto, cola continua ni resolución de conflictos.
- Las pruebas SQL requieren Docker/Supabase local, que no está disponible en
  todos los entornos de desarrollo.

## Riesgos

- La ejecución remota de series cuando ningún cliente abre la app sigue
  pendiente y no debe duplicar la materialización local.
- Antes de habilitar espacios compartidos deben cerrarse las políticas de
  edición de elementos creados por otro miembro.
- La retención y desvinculación deliberada de una cuenta local requieren una
  decisión de producto antes del cierre de sesión definitivo.

## Validación

- Pruebas unitarias de confirmación, cuenta incorrecta, composición del lote,
  fallo, conteos y reintento.
- Pruebas pgTAP versionadas para esquema, claves compuestas, RLS y denegación a
  `anon`.
- `npm run validate` y, con Docker disponible, `supabase db reset` más
  `supabase test db`.

---

# ADR-060 — Preferencias de moneda por usuario y moneda por movimiento

**Estado:** Aceptada

## Contexto

`currency` ya existía como columna genérica `TEXT` tanto en SQLite (ADR-050)
como en el esquema remoto (`check (currency ~ '^[A-Z]{3}$')`), pero el cliente
la trataba como el literal fijo `'EUR'` en el dominio de movimientos
(`CreateTransactionDraft`, `SessionTransaction`, tipos de migración de
invitado) y en el modal de creación, que además incrustaba el símbolo `€` y la
palabra «euros» de forma literal. No existía ninguna preferencia de usuario:
`PRODUCT.md` ya anticipaba una fila de «Moneda» en Ajustes, pero permanecía
como función pendiente.

## Opciones consideradas

1. Permitir una única moneda por usuario, configurable en Ajustes.
2. Permitir hasta tres monedas activas por usuario, elegidas de una lista
   única (sin distinguir una «principal» de unas «adicionales») mediante
   casillas de selección múltiple, con buscador y bandera por moneda; exponer
   un selector de moneda por movimiento cuando haya más de una activa.
3. Añadir conversión automática entre monedas con tipo de cambio.

## Decisión

Se adopta la opción 2, limitada a la selección y al registro por movimiento.
La opción 3 permanece fuera de alcance: `PRODUCT.md` ya excluye la «conversión
avanzada de divisas» de esta etapa, y agregar totales entre monedas distintas
(balance, Inicio, Actividad, presupuestos) requeriría antes una decisión de
producto sobre conversión o desglose por moneda, que se entrega en una tarea
posterior.

- `src/lib/currency/currencyCatalog.ts` define un catálogo curado de monedas
  (código ISO, nombre, nombre en plural, símbolo y bandera del país o unión
  representativa) en vez de mantener el listado completo ISO 4217 o depender
  de `Intl.supportedValuesOf('currency')` en tiempo de ejecución. Las banderas
  se representan con el emoji Unicode correspondiente, sin activos de imagen
  ni dependencias nuevas.
- `src/state/appPreferences/currencyPreferences.ts` y su repositorio persisten
  `{ currencies }`, un arreglo ordenado de 1 a 3 monedas, en AsyncStorage, en
  una clave propia (`@juntoss/currency-preferences/v1`) independiente de
  `app-preferences` (apariencia), para no acoplar dos dominios distintos al
  mismo blob ni arriesgar una escritura que sobrescriba el otro. El primer
  elemento del arreglo —el orden en que el usuario la seleccionó— actúa como
  moneda por defecto para movimientos nuevos y para el resumen de Ajustes; no
  existe un campo ni una interfaz separados para marcar una moneda como
  «principal».
- `CurrencyPreferencesModal` presenta una única lista con las monedas del
  catálogo, cada una con su bandera, nombre y código, seleccionable como
  casilla; un buscador en la parte superior filtra esa misma lista por nombre
  o código. No existen secciones separadas de moneda principal y monedas
  adicionales: todas las monedas conviven en un solo listado desplazable para
  evitar que el usuario tenga que bajar hasta el final para activar más de
  una.
- `CreateTransactionDraft.currency`, `SessionTransaction.currency` y los tipos
  de migración de invitado pasan del literal `'EUR'` a `CurrencyCode`.
  `localTransactionRepository` valida la moneda contra el catálogo
  (`isCurrencyCode`) en vez de exigir `'EUR'`.
- El modal de movimiento muestra un botón de moneda junto al de recurrencia
  únicamente cuando el usuario activó más de una moneda; con una sola moneda
  activa el flujo no cambia. La moneda del movimiento por defecto es la
  primera moneda activa, o la ya guardada al editar uno existente.

## Motivo

- Un catálogo curado evita mantener 180 monedas que la app no necesita y evita
  depender de una API de Intl cuya disponibilidad varía entre Hermes y JSC.
- Separar el almacenamiento de moneda del de apariencia evita que dos
  funcionalidades independientes, desarrolladas en paralelo, corrompan el
  estado guardado de la otra al usar `AsyncStorage.setItem` sobre la misma
  clave sin fusionar los campos.
- Una lista única con buscador reduce la fricción de encontrar y activar
  varias monedas frente a separar la interfaz en una sección de moneda
  principal y otra de monedas adicionales, que obligaba a desplazarse hasta el
  final para completar la selección.
- Limitar a tres el total de monedas activas responde directamente a la
  petición de producto sin introducir un límite de plan o capacidad todavía no
  decidido.

## Consecuencias positivas

- Ningún cambio de esquema SQL ni de Supabase: `currency` ya era genérico.
- El buscador y la bandera por moneda hacen manejable un catálogo de treinta
  monedas dentro de una sola lista.
- El modal de movimiento no añade fricción cuando solo hay una moneda activa.

## Consecuencias negativas

- Los agregados existentes (balance, Inicio, Actividad, presupuestos,
  donut de categorías) siguen formateando con la moneda asumida
  anteriormente y no separan ni convierten importes en distintas monedas.
  Mostrar cuánto se gastó en cada moneda es una tarea deliberadamente
  posterior.
- El catálogo de monedas no cubre el ISO 4217 completo; añadir una moneda
  nueva exige editar `currencyCatalog.ts`.
- Un emoji de bandera puede representar de forma imperfecta una moneda usada
  por varios países (por ejemplo, el euro se muestra con la bandera de la
  Unión Europea).

## Riesgos

- Si un usuario cambia el orden efectivo de sus monedas activas (quitando y
  volviendo a añadir), el movimiento nuevo por defecto puede cambiar de
  moneda; los movimientos ya creados conservan su propia `currency` y no se ven
  afectados.
- Reducir después las monedas activas por debajo de las usadas en movimientos
  existentes no elimina ni convierte esos movimientos; solo deja de ofrecerlas
  para nuevos movimientos. La interfaz impide bajar de una moneda activa.

## Validación

- Pruebas unitarias de `SettingsScreen` (selección de varias monedas desde la
  lista única, filtro del buscador, aviso al superar el máximo de tres y aviso
  al intentar quedarse sin ninguna).
- Pruebas unitarias de `CreateTransactionModal` (selector oculto con una sola
  moneda, selector funcional y envío con la moneda elegida con varias monedas
  activas).
- Pruebas de `localTransactionRepository` para crear y restaurar un movimiento
  en una moneda distinta a EUR y para rechazar una moneda no reconocida.
- `npm run validate`.

## Pendiente

Inicio y los presupuestos por categoría todavía no desglosan monedas. Actividad
sí permite escoger una moneda cuando hay dos o más presentes en el espacio
activo, y aplica esa selección al listado, sus totales y el detalle por
categoría; no muestra un agregado ni una conversión entre divisas.

## Corrección — símbolos reales y posición por moneda, y `formatCurrency` ligado a `'EUR'`

Los símbolos iniciales de `currencyCatalog.ts` desambiguaban monedas con
código local inventado (`CO$`, `MX$`, `AR$`, `CL$`, `UY$`, `CA$`, `AU$`,
`NZ$`) y el bolívar venezolano usaba `Bs.S`. Ningún país usa esos símbolos:
Colombia, México, Argentina, Chile, Uruguay, Canadá, Australia y Nueva
Zelanda escriben únicamente `$`, y Venezuela usa `Bs.` desde la
redenominación de 2021. Además, `formatCurrency` construía el símbolo con
`Intl.NumberFormat(locale, { style: 'currency', currency })`, y como todos
los `formatCurrency(...)` de tarjetas y detalles fijan `locale` en `'es-ES'`,
Intl no conocía el símbolo real de una moneda ajena a esa configuración
regional y devolvía el código ISO en su lugar (comprobado con Node:
`Intl.NumberFormat('es-ES', {style:'currency', currency:'COP'}).format(1235)`
→ `"1235 COP"`, sin `$`). Cambiar el `locale` según el país de cada moneda
resolvía el símbolo pero introducía convenciones de agrupación distintas
(`1,234.50` en `es-MX` frente a `1.234,50` en el resto de la app), rompiendo
la agrupación española que ADR-041 fijó para toda la aplicación.

Se investigó con `Intl.NumberFormat` en el locale de cada país para verificar
símbolo y lado real de uso (por ejemplo `Bs.S` para `es-VE`, aunque el uso
vigente en Venezuela es `Bs.`; `$` a la izquierda para `es-CO`, `es-MX`,
`es-AR`, `es-CL`, `es-UY`, `en-CA`, `en-AU`, `en-NZ`; `kr`/`kr.`/`zł` a la
derecha para `es-SE`/`es-DK`/`es-PL`). El catálogo pasa a fijar el símbolo
real (`$` compartido por varias monedas, `Bs.` compartido por VES y BOB) y un
campo `symbolPosition: 'before' | 'after'` por moneda, y `formatCurrency`
deja de usar `style: 'currency'` de Intl: formatea el número en `'decimal'`
(conservando la agrupación española existente en toda la app,
independientemente de la moneda) y coloca el símbolo del catálogo con
`applyCurrencySymbol`, en vez de dejar que Intl resuelva símbolo y posición
por locale. `CreateTransactionModal` sigue la misma regla en el importe
hero, colocando el símbolo antes o después del dígito según
`getCurrencySymbolPosition`. El submodal «Elige la moneda» ahora también
muestra la bandera junto a cada opción, igual que el selector de Ajustes.

`TransactionPreviewCard` y `TransactionDetailModal` ya pasaban
`transaction.currency` a `formatCurrency` en vez de `'EUR'` fijo —quedó listo
al ampliar el tipo en la entrega anterior— así que la corrección de símbolo
y posición se refleja ahí sin más cambios. Las tarjetas y detalles que suman
varias transacciones (`CategoryPreviewCard`, `CategoryDetailModal`, Inicio,
Actividad, `TransactionSummaryBadges`) siguen fijando `'EUR'` a propósito:
agregan importes que pueden pertenecer a monedas distintas y necesitan el
desglose por moneda pendiente antes de poder mostrar un símbolo correcto.

### Validación de la corrección

- Pruebas de `formatCurrency` para COP, MXN, VES, BOB, SEK, PLN y EUR.
- Pruebas de `CreateTransactionModal` para la moneda por defecto y para una
  moneda con símbolo a la izquierda.
- `npm run typecheck`, `npm run lint`, `prettier --check` y las pruebas de
  `currencyCatalog`, `formatCurrency` y `localTransactionRepository`.

## Corrección — la moneda se elige junto al título, no sobre el teclado

El botón de moneda vivía en la fila que hay sobre el teclado numérico, junto a
fecha y recurrencia. Al añadirse ahí el botón de cuenta (ADR-080), esa fila
pasó a acumular cuatro controles y quedó apretada, mientras la fila del título
ocupaba todo el ancho para un campo que rara vez lo necesita.

La moneda pasa a un botón cuadrado situado a la derecha del campo de título,
que muestra **solo la bandera** de la moneda actual. La bandera desambigua
donde el símbolo no puede: en el catálogo, `$` lo comparten USD, MXN, COP,
ARS, CLP y UYU, y `Bs.` lo comparten VES y BOB, justo con dos o tres monedas
activas que es cuando el control existe. El código ISO sigue disponible para
tecnologías de asistencia mediante `accessibilityLabel` (`Moneda: EUR`), y el
importe hero continúa mostrando el símbolo según ADR-060.

No cambia ninguna regla anterior: el control sigue apareciendo solo con más de
una moneda activa, sigue desapareciendo cuando una cuenta fija la moneda
(ADR-080) y abre el mismo `TransactionCurrencyPickerModal`.

### Validación de la corrección

- `CreateTransactionModal.test.tsx` cubre que el botón está dentro de la fila
  del título y no dentro de la fila de metadatos, que respeta el objetivo
  táctil mínimo y que la bandera refleja la moneda elegida.
- Las pruebas existentes de preselección, edición y cambio de espacio siguen
  localizando el control por su `testID` y su `accessibilityLabel`, sin
  cambios.

---

# ADR-061 — «Movimientos recientes» ordena por creación o modificación, no por fecha económica

**Estado:** Aceptada

## Contexto

Inicio ordenaba «Movimientos recientes» reutilizando `projectRecurringTransactions`,
que ordena de forma descendente por `occurredOn` (la fecha económica elegida
por el usuario), porque ese mismo orden es correcto para Actividad, Mapa y el
detalle de categoría. Para Inicio esto producía un resultado contrario a la
expectativa: un movimiento creado en este instante pero con fecha económica
pasada (por ejemplo, registrado desde Mapa sobre un día anterior, o con la
fecha cambiada a mano) podía quedar fuera de las cinco tarjetas visibles,
mientras que movimientos más antiguos con fecha económica más reciente
permanecían arriba. El usuario esperaba ver ahí lo que acababa de crear o
editar, no lo que tiene la fecha más futura.

## Opciones consideradas

1. Mantener el orden por `occurredOn` en toda la aplicación, incluida Inicio.
2. Dar a Inicio su propio orden por instante de creación o modificación,
   independiente del orden cronológico que usan Actividad, Mapa y el detalle
   de categoría.
3. Añadir un campo de fecha de creación exclusivamente para mostrarlo, sin
   usarlo para ordenar.

## Decisión

Se adopta la opción 2. `SessionTransaction` expone ahora `updatedAt`, tomado
de la columna `updated_at` ya existente en SQLite (se fija en la creación y se
actualiza en cada edición; no fue necesaria ninguna migración de esquema).
`localTransactionRepository` la selecciona y la propaga en cada camino de
retorno de `createLocalTransaction` y `updateLocalTransaction`.
`sortTransactionsByRecentActivity` (en `transactionSummary.ts`) ordena de
forma descendente por `updatedAt` y HomeScreen la aplica únicamente sobre
`transactionsThroughCurrentMonth` antes de pasarla a `TransactionPreviewList`.
El resto de pantallas —Actividad, Mapa, el detalle de categoría y los reportes
temporales— siguen usando el orden por `occurredOn` sin cambios: sus listas
responden a «qué pasó en este periodo», mientras que «Movimientos recientes»
en Inicio responde a «qué añadí o cambié hace poco».

El horizonte mensual de Inicio (ADR-056) no cambia: un movimiento con fecha
económica de un mes posterior sigue sin aparecer en «Movimientos recientes»
aunque acabe de crearse; solo cambió el criterio de orden dentro de ese
horizonte.

## Motivo

- `occurredOn` y `updatedAt` responden preguntas distintas y ambas son
  legítimas; el error estaba en usar una sola señal para las dos preguntas
  que hace la aplicación («qué ocurrió cuándo» frente a «qué toqué hace
  poco»).
- La columna `updated_at` ya existía en SQLite desde ADR-050 y ya se
  actualizaba correctamente en cada inserción y edición; solo faltaba
  exponerla al dominio y a la interfaz.
- Aislar el nuevo orden dentro de Inicio evita alterar el comportamiento ya
  probado de Actividad, Mapa y el detalle de categoría.

## Consecuencias positivas

- Un movimiento recién creado o editado aparece de inmediato en «Movimientos
  recientes», sin importar su fecha económica.
- No hizo falta ninguna migración SQL: la columna ya existía y ya se
  mantenía correctamente.

## Consecuencias negativas

- `SessionTransaction` gana un campo obligatorio (`updatedAt`), lo que exigió
  actualizar los fixtures de movimiento en todas las pruebas existentes que
  construyen el tipo a mano en lugar de pasar por el repositorio.
- Una ocurrencia proyectada (recurrente o futura, todavía no materializada en
  SQLite) hereda el `updatedAt` de la plantilla de su serie, no un instante
  propio; esto es intencional —no existe como fila hasta materializarse— pero
  significa que toda una serie recién creada puede aparecer junta arriba de
  «Movimientos recientes».

## Riesgos

- Si en el futuro se añade edición en lote o sincronización remota que
  reescriba `updated_at` de filas no tocadas por el usuario, «Movimientos
  recientes» podría mostrar movimientos que el usuario no editó realmente;
  cualquier operación así debe preservar `updated_at` salvo cambio genuino.

## Validación

- Pruebas de `sortTransactionsByRecentActivity` (orden por `updatedAt`
  ignorando `occurredOn`, no mutación del arreglo recibido).
- Pruebas de `localTransactionRepository` confirmando que `updatedAt` se
  restaura desde SQLite y se actualiza en una edición.
- Pruebas de `HomeScreen` para el límite de cinco por actividad reciente y
  para que una edición antigua suba al principio pese a tener fecha económica
  anterior a la de un movimiento sin tocar.
- `npm run typecheck`, `npm run lint`, `prettier --check` y las suites de
  `transactionSummary`, `transactionRecurrence`, `transactionPeriod`,
  `categorySummary` y `localTransactionRepository`.

---

# ADR-062 — Reglas de notificación por tipo de movimiento

**Estado:** Aceptada

## Contexto

Ajustes → Notificaciones solo mostraba «Recordatorios y alertas» como fila
pendiente. Ya existía un recordatorio manual por movimiento (tabla
`transaction_reminders`, `transactionReminderService.ts`,
`TransactionReminderModal`), pero ninguna forma de avisar automáticamente
antes de todos los gastos o ingresos de un tipo, incluidas las ocurrencias
futuras de series recurrentes que hoy solo se proyectan en memoria hasta que
llega su fecha.

## Opciones consideradas

1. Relajar la clave foránea de `transaction_reminders.transaction_id` para
   que también admita ids sintéticos de ocurrencias proyectadas
   (`projected-occurrence:...`) y fusionar ahí el scheduling de reglas.
2. Crear dos tablas nuevas (`transaction_notification_rules` como
   configuración y `transaction_notification_rule_schedules` como caché
   regenerable de lo programado) y compartir solo el primitivo de
   notificación, las utilidades de horas y un presupuesto conjunto de
   notificaciones pendientes con `transaction_reminders`.
3. Generar por adelantado una fila de notificación por cada ocurrencia futura
   de cada serie recurrente, sin límite de horizonte.

## Decisión

Se adopta la opción 2. El botón de recordatorio manual ya estaba oculto para
ocurrencias proyectadas (`isProjected` en `TransactionDetailModal`), así que
`transaction_reminders` nunca necesitó admitir ids sintéticos; relajar su
clave foránea (opción 1) habría arriesgado una tabla estable sin necesidad
real. Una regla vive como una fila por `(space_id, transaction_type)` con
`is_enabled`, `days_before` y `times` (JSON de horas `HH:mm`).
`notificationRuleService.reconcileNotificationRules` recalcula por completo
—cancela y reprograma— las notificaciones de todas las reglas activas de
todos los espacios dentro de una ventana móvil de 14 días
(`notificationRuleWindowDays`), combinando movimientos persistidos y
ocurrencias proyectadas vía `projectRecurringTransactions`. Respeta cualquier
recordatorio manual ya fijado sobre un movimiento real (no lo duplica) y
comparte con él un presupuesto de `maxPendingLocalNotifications = 60`
notificaciones pendientes, por debajo del límite de 64 que impone iOS,
priorizando siempre los recordatorios manuales y después las ocurrencias más
próximas de las reglas.

Como no existe tarea en segundo plano (`expo-task-manager` no está instalado),
la reconciliación se dispara solo en puntos de interacción reales: al montar
`MainTabsNavigator`, al volver a primer plano (`useAppForeground`, primer uso
de `AppState` en el repositorio) y tras crear, editar o archivar un movimiento
o guardar una regla.

## Motivo

- Evita tocar el esquema y la lógica ya probada de `transaction_reminders`
  para un caso (ocurrencias proyectadas) que nunca necesita atravesar esa
  tabla.
- Una ventana móvil con reconciliación completa es más simple y más segura
  frente al límite de notificaciones del sistema operativo que generar
  ocurrencias de series sin fecha final hasta 2080.
- El modelo de una regla por tipo, sin combinaciones arbitrarias, responde al
  pedido real («todos los gastos», «todos los ingresos») sin construir una API
  de reglas genérica que PROJECT_RULES desaconseja antes de conocer variantes
  reales.

## Consecuencias positivas

- El recordatorio manual por movimiento sigue funcionando sin cambios; las
  reglas conviven respetándolo.
- Las reglas alcanzan tanto movimientos ya guardados como ocurrencias futuras
  de series recurrentes sin materializarlas por adelantado.
- El presupuesto compartido hace imposible que reglas y recordatorios
  manuales excedan juntos el límite de notificaciones locales del sistema.

## Consecuencias negativas

- Si el usuario no abre la app durante más de 14 días, las notificaciones más
  lejanas de la ventana no llegan a programarse hasta la próxima apertura.
- Cada reconciliación reprograma por completo las notificaciones de todas las
  reglas activas, no solo las que cambiaron.

## Riesgos

- Ejecutar reglas sin abrir la app (recordatorios realmente en segundo plano)
  requeriría `expo-task-manager` o notificaciones push desde servidor; queda
  pendiente, igual que la ejecución remota de recurrencias de la fase 13 del
  roadmap.
- Un futuro cambio que añada más disparadores de escritura de movimientos
  deberá recordar encadenar `reconcileNotificationRules`.

## Validación

- Pruebas unitarias de `notificationRuleService` (ventana de 14 días,
  respeto de recordatorios manuales, aplicación del presupuesto compartido).
- Pruebas de los repositorios nuevos y de `buildReminderNotificationContent`
  extraído de `transactionReminderService`.
- Pruebas de `NotificationRulesModal` y de la migración local v7 en
  `localDatabase.test.ts`.
- `npm run validate` (typecheck, lint, formato, pruebas).
- Pendiente: verificación manual en iOS y Android con fechas cercanas para no
  esperar 14 días.

---

# ADR-063 — Plantillas con rotación, recordatorio diario e icono de categoría diferido

**Estado:** Aceptada

## Contexto

`Bible/JUNTOSS_NOTIFICATIONS.md` define el sistema completo de notificaciones:
plantillas de texto con rotación para los recordatorios de gasto/ingreso (ya
construidos en ADR-062), un tercer tipo de notificación nuevo — el
recordatorio diario para fomentar el registro de movimientos — y una regla de
iconos (categoría para gasto/ingreso, logo de la app para el diario).

## Opciones consideradas — icono de categoría

1. Adjunto multimedia de iOS (`attachments`) generado en tiempo de ejecución
   con `react-native-view-shot`, capturando `CategoryIcon` en una vista oculta.
2. Generar 324 PNG estáticos (18 iconos × 18 colores) en tiempo de compilación.
3. No implementar el icono de categoría en esta entrega; usar el icono del
   sistema en ambas plataformas, tal como el propio documento indica para
   cuando "la plataforma lo limite".

## Decisión

Se adopta la opción 3. `NotificationContentInput` de `expo-notifications@0.32.17`
no expone ningún campo `icon`/`largeIcon`; la única vía posible es el adjunto
de iOS, y tanto la opción 1 como la 2 requieren generar una imagen a partir de
un SVG de `phosphor-react-native` sin ningún activo estático existente. La
opción 1, además, necesita `react-native-view-shot`, una librería con código
nativo que **Expo Go no incluye** — y ADR-033 fijó deliberadamente Expo Go
como el flujo de prueba física actual del proyecto, sin development build.
Añadirla ahora rompería esa validación en dispositivo físico sin haber
discutido antes ese cambio de estrategia.

El recordatorio diario no necesita ningún trabajo adicional para mostrar el
logo de la app: iOS siempre muestra el icono de la app junto a cualquier
notificación (garantía del sistema, no configurable) y Android usa por
defecto una versión monocromo del icono de la app.

Para el motor de plantillas se transcriben literalmente las 35 plantillas del
documento (`src/features/transactions/constants/notificationTemplates.ts`) y
se construye `notificationTemplateService.ts`: selecciona una plantilla
compatible con las variables disponibles, excluye la usada el día anterior y
las usadas 2 o más veces en 7 días, y cae de vuelta a la menos usada
recientemente si esas exclusiones no dejan ninguna candidata. El historial de
rotación (`notificationTemplateHistoryRepository.ts`) y el estado del
recordatorio diario (`dailyReminderScheduleRepository.ts`,
`dailyReminderPreferencesRepository.ts`) viven en AsyncStorage, no en SQLite:
son datos pequeños, no relacionales y puramente locales, el mismo criterio que
`DATABASE.md` ya aplica al catálogo de espacios.

El recordatorio diario reutiliza la infraestructura de ADR-062
(`requestNotificationPermission`/`scheduleLocalNotification`/`cancelLocalNotification`)
con un canal Android propio (`daily-engagement`, separado de
`transaction-reminders`) para que el usuario pueda silenciar un tipo sin el
otro. Como máximo hay una notificación diaria pendiente a la vez: se
reconcilia con el mismo patrón de disparo ya construido (carga inicial,
`useAppForeground`, cambios de `transactions` vía un efecto reactivo), no
programa el aviso de hoy si el usuario ya registró un movimiento hoy o si la
hora elegida ya pasó, y en ese caso programa el de mañana.

## Consecuencias positivas

- Los recordatorios ya no repiten el mismo texto siempre; varían con las
  mismas reglas de rotación que pide el documento.
- El recordatorio diario no añade ninguna migración SQLite ni tabla nueva.
- Ninguna notificación deja de entregarse por un icono no soportado.

## Consecuencias negativas

- El icono de categoría en las notificaciones queda pendiente; el usuario
  seguirá viendo el icono genérico de la app en los recordatorios de gasto e
  ingreso hasta que se resuelva esta decisión.
- `buildReminderNotificationContent` (síncrono) se sustituyó por
  `buildReminderTemplateVariables` (puro) más `buildNotificationContent`
  (async, en el servicio) porque la selección de plantilla ahora hace E/S de
  AsyncStorage — ya no puede vivir en `utils/`, que ARCHITECTURE.md reserva
  para funciones puras.

## Riesgos

- Si en el futuro el proyecto migra a development builds, esta decisión debe
  revisarse: en ese momento `react-native-view-shot` (u otra vía nativa) deja
  de tener el problema de compatibilidad que la bloquea hoy.

## Validación

- Pruebas de `notificationTemplateService` (filtrado por variables, exclusión
  de ayer, exclusión de ≥2 usos en 7 días, fallback, interpolación).
- Pruebas de `dailyReminderService` (programa mañana si ya se registró algo
  hoy o la hora de hoy ya pasó, cancela lo anterior).
- Pruebas actualizadas de `transactionReminderService`/`notificationRuleService`
  para el nuevo `await` y los parámetros `categoryName`/`categories`.
- `npm run validate` (typecheck, lint, formato, pruebas).
- Pendiente: verificación manual en iOS y Android.

## Corrección — el recordatorio diario pasa de opcional a siempre activo

La primera entrega dejaba el recordatorio diario como una preferencia de
usuario: una fila en Ajustes con interruptor y selector de hora
(`DailyReminderModal`, `dailyReminderPreferences*` en
`src/state/appPreferences/`). El responsable del proyecto pidió explícitamente
quitar ese control: la app debe enviar el recordatorio diario siempre, sin que
el usuario pueda desactivarlo desde Ajustes.

Se eliminó `DailyReminderModal`, la fila en `SettingsScreen` y todo el
almacenamiento de preferencias (`dailyReminderPreferences.ts`,
`dailyReminderPreferencesRepository.ts`, `useDailyReminderPreferences.ts`).
`dailyReminderService.reconcileDailyReminder` ya no recibe `preferences`: usa
una hora fija (`dailyReminderTime = '20:00'`, no configurable) definida en el
propio servicio. El resto del comportamiento no cambia: sigue sin enviar más
de un aviso al día, se salta el de hoy si el usuario ya registró un
movimiento o si la hora ya pasó, y en ese caso reprograma para mañana.
`dailyReminderScheduleRepository.ts` (el estado de sistema del aviso
actualmente programado) se conserva sin cambios.

Esto reemplaza la línea "Permitir desactivarlas completamente" del §7 de
`Bible/JUNTOSS_NOTIFICATIONS.md`, ya actualizada para reflejar que el
recordatorio diario es siempre activo.

### Validación de la corrección

- `dailyReminderService.test.ts` actualizado: ya no hay caso de "desactivado",
  se verifica que siempre programa (hoy o mañana según corresponda).
- `npm run validate` sin regresiones.

---

# ADR-064 — Comparación de porcentaje contra el periodo anterior

**Estado:** Aceptada

## Contexto

El responsable del proyecto pidió mostrar, en las hojas de Balance/Ingresos/Gastos
(`TransactionPeriodModal`, compartida por Inicio y Actividad — ADR previo ya
documenta que ambas pantallas reutilizan esa misma hoja) y en los badges de
movimientos de Inicio y Actividad (`TransactionSummaryBadges`), un porcentaje
que indique si se gastó o ingresó más o menos que en el periodo anterior
seleccionado.

## Opciones consideradas

1. Calcular el periodo anterior con una librería de fechas (`date-fns`/`dayjs`).
2. Reutilizar la aritmética de periodos ya existente en
   `src/features/dashboard/utils/transactionPeriod.ts` (`shiftTransactionPeriod`,
   `getTransactionPeriodRange`, `listTransactionsByPeriod`), añadiendo solo lo
   que falta: obtener las transacciones del periodo anterior y calcular el
   porcentaje de cambio.
3. Mostrar el indicador siempre, incluso cuando el filtro de fecha de
   Actividad está en «Todos» (sin periodo acotado), comparando contra un
   periodo arbitrario.

## Decisión

Se adopta la opción 2. El proyecto no usa ninguna librería de fechas — todo el
cálculo de periodos ya es aritmética nativa con `Date` — e introducir una solo
para este cálculo violaría la regla de «no cambiar librerías sin necesidad»
(`PROJECT_RULES.md` §8). Se añaden `calculatePeriodComparison`
(`src/features/transactions/utils/periodComparison.ts`),
`getPreviousPeriodTransactions` y `describePreviousPeriod` (ambas en
`transactionPeriod.ts`), y `getPreviousDateFilter`
(`src/features/activity/utils/transactionDateFilter.ts`) para el caso de
Actividad, que además admite rangos personalizados (`period: 'custom'`) sin
equivalente previo en `shiftTransactionPeriod`.

Se descarta la opción 3: con el filtro «Todos» no hay un periodo acotado con
el que comparar, así que `getPreviousDateFilter('all')` devuelve `null` y
Actividad oculta el indicador en ese caso en vez de comparar contra un rango
arbitrario que induciría a error.

Se crea `PeriodComparisonIndicator`
(`src/features/transactions/components/PeriodComparisonIndicator/`) como
componente nuevo — no una variante de `MetricBadge` — porque se reutiliza en
dos layouts distintos (dentro de un badge compacto y dentro de la `totalCard`
del modal), y colorea el porcentaje por favorabilidad: para gastos, subir es
desfavorable (rojo) y bajar es favorable (verde); para ingresos y balance es
al revés.

Inicio, a diferencia de Actividad, no tiene un periodo seleccionable: sus
badges siempre comparan el mes en curso contra el mes anterior. El
responsable del proyecto pidió además una forma de ocultar ese indicador solo
en Inicio, para quienes no quieran verlo al abrir la app. Se añade
`homeComparisonIndicators` a `src/state/appPreferences/` siguiendo el mismo
patrón manual (tipo + repositorio AsyncStorage + hook) que
`homeCurrencySelection*`, sin fábrica genérica porque el proyecto no tiene una.
El ajuste vive en Configuración → Preferencias como una fila con dos
`SelectableOption` («Sí»/«No»), reutilizando el mismo control que
`NotificationRulesModal` ya usa para su interruptor de recordatorios en vez de
introducir un `Switch` nuevo — el proyecto no usa `Switch` en ningún punto.
Este ajuste solo afecta a Inicio: Actividad y las hojas de Balance/Ingresos/
Gastos siempre muestran el indicador.

## Motivo

Reutilizar la aritmética de periodos ya construida evita duplicar lógica de
fechas y mantiene el cálculo del porcentaje simple y con un único punto de
verdad. Ocultar el indicador cuando no hay periodo acotado evita mostrar una
comparación sin sentido. Limitar el ajuste de Configuración a Inicio respeta
el alcance exacto pedido: Actividad y las hojas de detalle no lo necesitan
porque ahí el usuario ya está mirando activamente un periodo concreto.

## Consecuencias positivas

- Ninguna dependencia nueva.
- `TransactionSummaryBadges` sigue siendo retrocompatible: sin las props de
  comparación se comporta exactamente igual que antes.
- El mismo `PeriodComparisonIndicator` alimenta tanto los badges como la hoja
  de detalle, sin lógica de color duplicada.

## Consecuencias negativas

- El caso «previousMinor = 0 y currentMinor ≠ 0» no tiene un porcentaje bien
  definido; se muestra como «Nuevo» en vez de un número, lo que es menos
  preciso que un porcentaje pero evita una división por cero engañosa.

## Riesgos

- Si en el futuro Actividad admite comparar contra un periodo distinto al
  inmediatamente anterior (p. ej. «mismo periodo del año pasado»), esta
  decisión debe revisarse: hoy `getPreviousDateFilter` solo desplaza un paso
  hacia atrás.

## Validación

- `periodComparison.test.ts`, ampliaciones de `transactionPeriod.test.ts` y
  `transactionDateFilter.test.ts` (casos límite del cálculo y del periodo
  anterior).
- `PeriodComparisonIndicator.test.tsx`, `TransactionSummaryBadges.test.tsx` y
  `TransactionPeriodModal.test.tsx` (nuevos).
- `SettingsScreen.test.tsx` ampliado con el interruptor «Sí»/«No».
- `npx tsc --noEmit` sin errores.
- Pendiente: verificación manual en iOS y Android.

---

# ADR-065 — Adopción completa de `useTheme()` para terminar el modo oscuro

**Estado:** Aceptada

## Contexto

El sistema de modo oscuro ya existía a nivel de infraestructura desde hacía
tiempo: `src/theme/types.ts` (`ColorTokens`, `ThemeShadows`,
`AppearancePreference`), `src/theme/colors.ts` y `src/theme/shadows.ts`
(paletas `light`/`dark` y `resolveColorTokens`/`resolveShadows`),
`ThemeProvider`/`useTheme` (persistiendo la preferencia mediante
`src/state/appPreferences/`) y `useThemedStyles`/`useThemeOptional`. El
proveedor ya estaba montado en `src/app/AppProviders.tsx` y `AppBootstrap.tsx`
ya sincronizaba la barra de estado del sistema con `isDark`.

Sin embargo, la adopción real era mínima: solo 7 archivos de producción
llamaban a `useTheme()`. El resto (43 archivos: pantallas completas, todos los
modales de `overlays/`, `AppTabBar`, `MainTabsNavigator`, las features de
transacciones, categorías, actividad, mapa y espacios) importaban el alias
estático `colors`/`shadows` de `@/theme/colors` y `@/theme/shadows` — pensado
únicamente como valor por defecto para pruebas —, de modo que permanecían
fijos en modo claro sin importar la preferencia del usuario. Además, no
existía ninguna forma de que la persona usuaria eligiera apariencia: la fila
«Apariencia» de Ajustes era un `SettingsRow` con `pending` que solo mostraba
una alerta «Función pendiente», y `app.json` no declaraba
`userInterfaceStyle`, por lo que el proyecto nativo generado
(`ios/juntoss/Info.plist`) quedaba fijado a `Light`.

## Decisión

Terminar la implementación ya diseñada, sin cambiar su arquitectura:

- Migrar los 43 archivos que importaban los alias estáticos `colors`/
  `shadows` para que obtengan ambos de `useTheme()`, usando `useThemedStyles`
  (o `useTheme` + `useMemo` cuando además hacía falta `shadows`) para
  recalcular sus `StyleSheet` cuando cambia el esquema. Los componentes
  privados auxiliares que leían `colors`/`styles` de módulo (por ejemplo
  `AnimatedChevron` en `ActivityCollapsibleSection`, `DetailActionButton` en
  `CategoryDetailModal`, filas de `SettingsScreen`) pasan a llamar el hook
  localmente, siguiendo el patrón ya usado en
  `src/components/ui/SelectableOption/SelectableOption.tsx`.
- `categoryColors.ts` se deja fuera deliberadamente: los colores de categoría
  son independientes del esquema claro/oscuro por diseño.
- `AppModal` (la primitiva de bottom sheet compartida) ahora resuelve también
  el `tint` del `BlurView` de su backdrop según `isDark`, en vez de
  `tint="default"`, para que el desenfoque seguido de la preferencia elegida
  y no del esquema del sistema cuando ambos difieren.
- La fila «Apariencia» se sustituye por el interruptor booleano «Modo oscuro»
  de `SettingsScreen`, que guarda explícitamente `dark` al activarse y `light`
  al desactivarse mediante `useTheme().setAppearance`. El valor `system` se
  conserva únicamente para interpretar preferencias ya guardadas.
- `app.json` declara `"userInterfaceStyle": "automatic"` bajo `expo`, para que
  una futura generación nativa (`expo prebuild`) deje de fijar `Light` en el
  proyecto iOS/Android. No se ejecutó `expo prebuild` como parte de este
  cambio: el proyecto se ejecuta actualmente mediante Expo Go (ADR-033), que
  no usa los directorios nativos generados, así que no había nada que
  regenerar de forma inmediata.
- `ErrorBoundary` (`src/app/ErrorBoundary.tsx`) se deja deliberadamente sin
  migrar: envuelve a `AppProviders`/`ThemeProvider` en `App.tsx`, así que no
  puede depender de `useTheme()` sin arriesgar un fallo si el propio
  `ThemeProvider` es la causa del error capturado. Su fondo claro fijo es un
  respaldo intencional, no una omisión.

## Motivo

La arquitectura de theming ya estaba bien diseñada (paletas resueltas por
esquema, hook único, persistencia); el problema era puramente de adopción.
Cambiar de arquitectura habría violado la regla de «el mejor cambio es el
menor cambio» (`PROJECT_RULES.md` §29): bastaba con terminar de conectar cada
consumidor a la fuente de verdad ya existente.

## Consecuencias positivas

- Activar el modo oscuro en Ajustes afecta a toda la aplicación:
  pestañas, cabeceras, modales, tarjetas, calendarios y listas.
- El desenfoque de los modales sigue la preferencia elegida en vez del
  esquema del sistema.
- Ningún color se declaró de forma nueva: todos los tokens `light`/`dark` ya
  existían en `colors.ts`/`shadows.ts` y no se modificaron.

## Consecuencias negativas

- El diff toca un número muy alto de archivos (más de 60) aunque cada cambio
  individual es mecánico; la revisión debe apoyarse en que el patrón es
  idéntico en todos los casos, no en leer cada archivo con el mismo detalle.
- `ErrorBoundary` sigue sin modo oscuro por diseño; si su pantalla de error
  molesta visualmente en modo oscuro, requiere una solución distinta (por
  ejemplo, leer la preferencia guardada directamente desde
  `appPreferencesRepository` sin pasar por el contexto de React).

## Riesgos

- Un componente nuevo que vuelva a importar el alias estático `colors`/
  `shadows` en lugar de `useTheme()` pasaría desapercibido en revisión si no
  se comprueba explícitamente; ambos alias se mantienen exportados a
  propósito porque las pruebas y los valores por defecto los siguen usando.
- Corrección relacionada encontrada durante la validación: el valor por
  defecto `availableCurrencies = [defaultCurrencyCode]` en
  `CreateTransactionModal` creaba un array nuevo en cada render y formaba
  parte de las dependencias de un `useEffect` que reinicia el formulario,
  produciendo un bucle de renderizado infinito. No es un defecto de modo
  oscuro, pero solo se manifestaba al montar el componente correctamente
  (antes quedaba enmascarado porque las pruebas fallaban antes, por falta de
  `ThemeProvider`); se corrigió moviendo el valor por defecto a una constante
  de módulo (`defaultAvailableCurrencies`) con referencia estable.

## Validación

- `npx tsc --noEmit` sin errores.
- `npm run lint` sin errores (2 advertencias `react-hooks/exhaustive-deps` en
  `ActivityScreen.tsx` son preexistentes y no relacionadas, confirmadas
  comparando contra el estado previo a este cambio).
- `npm run format:check` limpio en todos los archivos tocados.
- `npm test`: 341/347 pruebas en verde. Las 6 restantes son preexistentes y no
  relacionadas: diferencias de forma de `accessibilityState` de
  `@testing-library/react-native` (claves adicionales `busy`/`disabled`/
  `expanded`/`selected`), datos ICU/locale del entorno de pruebas para el
  separador de miles, y un mock de `expo-sqlite` ya roto en un flujo de copia
  de movimientos entre espacios que no forma parte de este cambio.
- Pendiente: verificación manual en iOS y Android alternando modo claro y
  oscuro.

---

# ADR-066 — Sistema de privacidad, cumplimiento legal y eliminación de cuenta

**Estado:** Aceptada

## Contexto

`Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md` (investigación previa) exige que juntoss
declare correctamente sus datos ante App Store Connect y Google Play Console,
ofrezca eliminación de cuenta dentro de la app (obligatorio en ambas tiendas
si se permite crear cuentas), y separe consentimiento de términos, privacidad
y publicidad. La auditoría real del código (Fase 1 de ese documento) encontró:

- Sin analítica, ads ni crash reporting instalados; solo Supabase, notificaciones
  locales (`expo-notifications`) y almacenamiento local.
- La fila `Ajustes → Ayuda → Política de privacidad` (`SettingsScreen.tsx`)
  abría un `Alert` de "función pendiente".
- Ninguna pantalla de registro/login todavía: la app es 100% invitado, por lo
  que "eliminar cuenta" hoy equivale en la práctica a "borrar mis datos
  locales", pero el backend de borrado real debía quedar listo para cuando
  exista registro.
- `notificationTemplates.ts` siempre incluía `{{amount}}` en gasto/ingreso, sin
  alternativa sin importe (gap señalado por el propio documento legal §41 y por
  `Bible/JUNTOSS_NOTIFICATIONS.md` §10).

## Opciones consideradas

1. Pantallas legales como rutas nuevas en un `Stack.Navigator` de Settings.
2. Pantallas legales como `AppModal` apilables (mismo patrón que
   `CurrencyPreferencesModal`/`NotificationRulesModal`), sin tocar navegación.
3. Instalar `react-native-google-mobile-ads` ya, dejando la integración de
   anuncios a medio construir para cuando haga falta.
4. Documentar la integración de AdMob sin instalar el SDK, hasta que exista
   una superficie real de anuncios.
5. Reasignar `created_by` a una cuenta "tombstone" ficticia insertada a mano
   en `auth.users` al eliminar una cuenta con espacio compartido.
6. Permitir `created_by` nulo con `on delete set null`, dejando que Postgres
   limpie la referencia automáticamente al borrar el usuario.

## Decisión

- **Navegación (opción 2):** ninguna pantalla de Settings usa hoy un
  `Stack.Navigator`; introducir uno solo para esta feature habría sido el
  cambio más amplio posible para el problema más pequeño. `PrivacyLegalScreen`,
  `LegalDocumentScreen`, `PrivacyChoicesScreen`, `DataRightsScreen` y
  `PermissionsScreen` (`src/features/legal/screens/`) son `AppModal` variant
  `expanded` con `stackBehavior="push"` para las subpantallas, igual que
  `CategoryPickerModal`/`CreateCategoryModal`.
- **Componentes de lista:** `SettingsSection`/`SettingsRow`/`Divider` vivían
  como funciones privadas de `SettingsScreen.tsx`. Se extrajeron sin cambiar su
  API a `src/components/layout/SettingsList/SettingsList.tsx` (añadiendo
  `SettingsToggleRow` y `SettingsPendingDot`), y tanto `SettingsScreen` como
  las pantallas legales las importan de ahí. Evita exactamente los componentes
  duplicados que el documento legal prohíbe por nombre (`PrivacySettingsRow`,
  `LegalSettingsRow`).
- **AdMob (opción 4):** se documenta el plan completo en
  `docs/privacy/SDK_INVENTORY.md` (CMP/UMP, ATT, orden de inicialización,
  regla de release) pero no se instala el SDK ni se añade una fila de
  preferencia de anuncios sin funcionalidad real, siguiendo la regla explícita
  del documento legal de "no mostrar filas sin funcionalidad real" y la de
  `PROJECT_RULES.md` de no instalar dependencias sin necesidad.
- **Eliminación de cuenta (opción 6):** `categories.created_by`,
  `recurring_transaction_series.created_by`, `transactions.created_by` y
  `spaces.created_by` pasan a admitir `null` con
  `on delete set null` (migración `06_account_deletion.sql`). La
  función `request_account_deletion()` (SECURITY DEFINER) borra por completo
  los espacios donde el usuario es el único miembro activo, y en espacios
  compartidos solo marca su membresía como `removed`: el resto de datos
  sobrevive y su autoría queda en `null` automáticamente cuando la Edge
  Function `delete-account` borra la fila de `auth.users` con la Admin API (una
  función SQL normal no puede hacerlo). Se descartó la opción 5 (cuenta
  tombstone) por el riesgo de insertar a mano una fila en el esquema interno
  `auth.users`, cuyas columnas obligatorias no están completamente
  documentadas y no se pueden verificar sin una instancia real de Supabase.
- **Ruta según sesión real:** como hoy no existe ninguna pantalla de
  registro, `dataDeletionService.deleteMyAccountOrData()` comprueba
  `auth.getUser()` (mismo patrón que
  `syncPendingLocalDataForCurrentSession`) y, si no hay sesión, borra solo los
  datos locales (SQLite + todas las claves `@juntoss/*` de AsyncStorage +
  `signOut`), cubriendo el 100% de los usuarios actuales sin dejar el backend
  remoto sin construir.
- **Exportación de datos:** `Share.share()` con un JSON, sin instalar
  `expo-file-system`/`expo-sharing`, suficiente para el volumen de datos de
  una app de finanzas personales.
- **Importes en notificaciones:** se añaden plantillas de reserva sin
  variables (`expense_reminder_11`, `income_reminder_11`,
  `notificationTemplates.ts`) y un parámetro `showAmounts` en
  `buildReminderTemplateVariables` (`transactionReminders.ts`), leído desde un
  nuevo repositorio `notificationPrivacyPreferenceRepository.ts` (mismo patrón
  que `dailyReminderScheduleRepository.ts`) antes de construir el contenido en
  `transactionReminderService.ts` y `notificationRuleService.ts`.
- **Contenido legal:** Política de privacidad y Términos
  (`src/features/legal/content/*.ts`) son la única fuente de verdad; un
  script (`scripts/generate-legal-site.ts`, ejecutable con `npx tsx`) genera
  las páginas estáticas de `Legal/site/` para publicar en `aoraestudio.com` a
  partir de ese mismo contenido, evitando mantener el texto duplicado a mano.
  Cualquier dato no confirmable (nombre legal, dirección, región de Supabase,
  retención, ley aplicable) queda marcado `LEGAL_REVIEW_REQUIRED` en vez de
  inventarse, siguiendo la regla explícita del documento legal.
- **Manifest de privacidad de iOS:** declarado en `app.json`
  (`expo.ios.privacyManifests`), no como archivo suelto en `ios/juntoss/`
  (esa carpeta está en `.gitignore` y la regenera `expo prebuild`); el plugin
  de Expo escribe `PrivacyInfo.xcprivacy` y lo registra en el proyecto de
  Xcode automáticamente.

## Consecuencias positivas

- La fila "Política de privacidad" de Ajustes deja de ser un `Alert` de
  función pendiente y abre un sistema completo (documentos, preferencias,
  permisos, exportación y eliminación).
- El backend de eliminación de cuenta queda correcto y probado a nivel de
  esquema para cuando exista registro, sin coste en el bundle de la app (vive
  en `supabase/`).
- Ningún dato financiero (importe, categoría, título) se envía por defecto a
  analítica/logs porque no existe ningún sistema de analítica instalado; el
  inventario en `docs/privacy/` deja constancia explícita de ello para cuando
  se audite antes de publicar.

## Consecuencias negativas

- Si quien crea un espacio compartido elimina su cuenta, `spaces.created_by`
  queda en `null` y la política `spaces_update_owner` deja de admitir cambios
  sobre ese espacio hasta que se diseñe una transferencia de propiedad;
  documentado como limitación conocida en la propia migración y en
  `Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md` §17 (requiere revisión de producto).
  No se resuelve aquí porque hoy no existe ningún usuario real afectado.
- El texto legal vive duplicado en dos formatos (contenido TS para la app,
  HTML generado para la web); se mitiga con el script generador, pero un
  cambio de contenido sigue exigiendo recordar regenerar `Legal/site/`.
- Identidad del responsable (Alan Rios y Alejandro Perez, Venezuela y España)
  y audiencia objetivo (a partir de 14 años, sin contenido sensible) ya están
  confirmadas por el responsable del proyecto y reflejadas en el texto legal.
  Sigue pendiente de confirmar la región real del proyecto Supabase y los
  periodos exactos de retención de copias de seguridad antes de publicar.

## Riesgos

- Las migraciones y funciones SQL (`legal_acceptances`,
  `request_account_deletion`) no se han ejecutado contra una instancia real de
  Supabase ni contra `supabase test db`: solo se verificaron por lectura
  cuidadosa contra el esquema de `01_initial_finance_schema.sql`
  (nombres de constraints FK por defecto, acciones `on delete` de cada
  columna). Deben ejecutarse antes de desplegar.
- Las Edge Functions (`delete-account`, `export-user-data`) tampoco se han
  desplegado ni probado contra un proyecto real.

## Validación

- `npx tsc --noEmit` sin errores tras excluir `scripts/` del `tsconfig.json`
  (el único archivo TypeScript ahí, `generate-legal-site.ts`, es una
  herramienta de Node ejecutada con `npx tsx`, no código de la app).
- `npm test` sobre los archivos tocados/nuevos en verde (`SettingsScreen`,
  `notificationPrivacyPreferenceRepository`, `transactionReminders`,
  `notificationTemplateService`, `dataDeletionService`). Los 2 fallos de
  `CreateTransactionModal.test.tsx` son preexistentes y no relacionados
  (confirmado comparando con `git stash`, que ya fallaba de forma distinta sin
  ningún cambio de esta tarea).
- Pendiente: `supabase test db` (pgTAP) contra una instancia real, desplegar
  las Edge Functions, y publicar `Legal/site/*` en `aoraestudio.com`.

---

# ADR-067 — Nota libre en categorías y movimientos, y apertura de movimiento desde el detalle de categoría

**Estado:** Aceptada

## Contexto

Se pidió una nota de texto libre (para listas o detalles cortos) visible desde
el detalle de una categoría, justo debajo de su resumen de gastos e ingresos,
y desde el detalle de un movimiento, justo debajo de su recurrencia. Ninguno
de los dos modelos (`Category`, `SessionTransaction`) tenía ese campo, y
`CategoryDetailModal` no ofrecía un patrón de edición in place: toda mutación
existente pasa por un modal de creación/edición completo (`CreateCategoryModal`,
`CreateTransactionModal`) o por un sub-modal dedicado (`CategoryBudgetModal`).

Al revisar `CategoryDetailModal` para insertar la nota se encontró un defecto
aparte: su lista de movimientos (`TransactionPreviewList`) ya admite un prop
`onOpenTransactionDetail` que activa la navegación al detalle de un movimiento,
pero `CategoryDetailModal` nunca lo recibía ni lo reenviaba, así que tocar un
movimiento desde el detalle de categoría no hacía nada.

## Opciones consideradas

1. Nota como parte del flujo de edición completo (`CreateCategoryModal`/
   `CreateTransactionModal`), sin edición directa desde el detalle.
2. Campo de texto multilínea editado directamente en el detalle, que guarda
   al perder el foco (sin botón de guardado). Primera implementación de esta
   ADR; se descartó a petición explícita en favor de la opción 3 porque un
   campo multilínea permanente ocupa espacio en el detalle aunque no haya
   nota, y guardar sin confirmación visible es menos cómodo para un texto
   largo que para un valor corto como el presupuesto.
3. Fila cerrada tipo botón ("Escribir Nota" + chevron) que abre un sub-modal
   dedicado a editar la nota, con guardado explícito mediante un botón.

## Decisión

Se adopta la opción 3, reutilizando la estructura del paso "nombre" de
`CreateCategoryModal` (cabecera con volver, campo único, acción principal
fija abajo) por ser ya el patrón más simple del proyecto para "un campo, un
botón de guardar". `NoteEditorModal`
(`src/components/ui/NoteEditorModal/`) es ese sub-modal compartido: mismo
`AppModal` `variant="expanded"` con `stackBehavior="push"`, mismo estilo de
`BottomSheetTextInput` con borde (ahora `multiline`), y un
`ModalPrimaryAction` con `gradientColor` como botón de guardar — el mismo
prop que ya usa `CreateTransactionModal` para su botón de envío coloreado
por categoría, así que el color de fondo del botón de guardar sale del token
de color de la categoría (`categoryColors[colorToken]`) y su contraste de
texto de `getCategoryContentContrast`, reutilizando la misma excepción de
texto oscuro sobre amarillo ya resuelta para las tarjetas de categoría.

`CategoryDetailModal` y `TransactionDetailModal` ya no muestran el campo
directamente: en su lugar renderizan una fila-botón (`Pressable` con el
texto de la nota o el marcador "Escribir Nota" y un `chevron-forward`) justo
debajo del resumen de gastos e ingresos y de la tarjeta de recurrencia
respectivamente, oculta en `TransactionDetailModal` para ocurrencias
proyectadas de una serie recurrente (sin fila propia todavía en
`transactions`, por lo que no hay nada que actualizar). Tocarla abre
`NoteEditorModal` apilado sobre el detalle. Ambos detalles siguen sin llamar
a un repositorio directamente: invocan `onSaveNote(id, note)`, que
`MainTabsNavigator` resuelve contra
`updateLocalCategoryNote`/`updateLocalTransactionNote`.

Esas dos funciones son deliberadamente independientes de
`updateLocalCategory`/`updateLocalTransaction`: la primera ya acepta una
categoría completa y solo necesitaba la columna nueva, pero
`updateLocalTransaction` tiene cientos de líneas de ramas para reescribir
series recurrentes: añadir la nota ahí habría acoplado un campo simple a esa
complejidad. Las funciones nuevas hacen un `UPDATE ... SET note = ?` directo,
igual que `archiveLocalCategory`/`archiveLocalTransaction`.

El esquema local sube a la versión 8 (`ALTER TABLE categories/transactions
ADD COLUMN note TEXT`, nulo por defecto). El campo no participa en la
creación (`CreateCategoryModal`/`CreateTransactionModal` no lo piden); una
categoría o movimiento nuevo empieza sin nota.

Para el defecto de navegación, `CategoryDetailModal` gana un prop
`onOpenTransactionDetail` obligatorio que reenvía a `TransactionPreviewList`.
`MainTabsNavigator` le pasa `setDetailTransactionId` (el mismo estado que ya
usan Inicio, Actividad y Mapa). Como `AppModal` usa `stackBehavior="replace"`
por defecto en ambos detalles, abrir el de movimiento sobre el de categoría
cierra este último automáticamente a través de su `onClose` existente, sin
lógica adicional.

## Motivo

- Un botón cerrado mantiene el detalle compacto cuando no hay nota, y un
  sub-modal dedicado deja espacio cómodo para leer y editar listas o textos
  más largos que una fila de una línea.
- Reutilizar la estructura del paso "nombre" de `CreateCategoryModal` evita
  inventar un patrón de modal nuevo para algo tan simple como "un campo, un
  botón de guardar": ya es el ejemplo más sencillo de ese patrón en el
  proyecto.
- Colorear el botón de guardar con el color de la categoría (vía
  `ModalPrimaryAction`/`gradientColor`, igual que el envío de
  `CreateTransactionModal`) conecta visualmente la nota con su categoría sin
  inventar un token de color nuevo.
- Aislar la escritura de la nota en funciones de repositorio dedicadas evita
  tocar las ramas de recurrencia de `updateLocalTransaction`, la parte más
  compleja y frágil del repositorio de movimientos.
- Arreglar la apertura del detalle de movimiento desde categoría era el
  motivo explícito por el que se pidió revisar esa lista: ya tenía el prop
  necesario en `TransactionPreviewList`, solo faltaba conectarlo.

## Consecuencias positivas

- Persona usuaria puede anotar listas o detalles cortos en cualquier
  categoría o movimiento sin abrir el modal de edición completo, en un
  espacio cómodo dedicado a ese texto.
- Tocar un movimiento desde el detalle de su categoría abre su propio
  detalle, como ya ocurría desde Inicio, Actividad y Mapa.
- `NoteEditorModal` queda disponible para cualquier detalle futuro que
  necesite el mismo patrón de "fila cerrada + editor dedicado".

## Consecuencias negativas

- Una ocurrencia proyectada no admite nota hasta materializarse (se le pierde
  de vista temporalmente); documentado como limitación, no como error.
- El campo no se sincroniza todavía con Supabase (no hay motor de sync activo
  para categorías/movimientos); cuando exista, la migración remota deberá
  añadir la misma columna.

## Riesgos

- La migración no se ha ejecutado contra una base local ya poblada en
  dispositivo real, solo contra los mocks de `localDatabase.test.ts`.

## Validación

- `npx tsc --noEmit` y `eslint` sin errores en los archivos tocados.
- `npm test` en verde sobre `localDatabase`, `localCategoryRepository`,
  `localTransactionRepository`, `CategoryDetailModal`, `TransactionDetailModal`
  y las suites de Inicio/Actividad/Mapa/`MainTabsNavigator` que montan estos
  detalles. Los fallos preexistentes de `CreateTransactionModal.test.tsx`,
  `ActivityScreen.test.tsx`, `HomeScreen.test.tsx` y `MainTabsNavigator.test.tsx`
  (forma de `accessibilityState` y `NativeDatabase` en el entorno de test) son
  ajenos a esta tarea, confirmados comparando con `git stash` de los archivos
  no tocados aquí.

---

# ADR-068 — Espacios de pareja, invitaciones y autenticación con Resend

**Estado:** Aceptada

## Contexto

`ROADMAP.md` Fase 7 (Autenticación, P0) y Fase 11 (Espacio de pareja, P1)
seguían sin empezar: no existía ninguna pantalla de registro, verificación,
inicio de sesión o recuperación de contraseña (`src/features/auth/` no
existía), y `space_invitations` solo era un boceto sin migrar en
`Bible/DATABASE.md` §6.4. `space_members` solo permitía que el creador de un
espacio se añadiera a sí mismo: no había ninguna vía para que una segunda
persona entrara. El responsable del proyecto pidió: invitar a otra persona
por correo o por enlace; que cada usuario tenga como máximo un espacio juntos
activo, y que al aceptar una invitación ambas personas queden como
anfitriones simétricos (sin jerarquía dueño/miembro); una opción en Ajustes
para "Eliminar espacio juntos" con alerta de confirmación; y correo
(confirmación de cuenta, recuperación de contraseña, invitación) enviado a
través de Resend.

Al auditar el esquema existente se encontraron dos bugs que esta tarea debía
corregir antes de construir nada nuevo encima:

- `spaces_update_owner` dependía de `spaces.created_by`, que puede quedar
  `NULL` tras borrar la cuenta de quien creó el espacio (limitación ya
  documentada como pendiente en el propio comentario de
  `06_account_deletion.sql` y en ADR-066, "Consecuencias
  negativas"). Con espacios de pareja reales esto deja de ser hipotético.
- Todo dispositivo invitado arrancaba con un espacio local `type: 'couple'`
  ("Juntos", `id: 'juntos'`) puramente decorativo
  (`src/features/spaces/types.ts`), que `migrate_guest_data()` subía tal
  cual a Supabase. Aplicar ingenuamente la regla de "un espacio juntos por
  usuario" habría bloqueado a todo usuario que se registrara de crear o
  aceptar un espacio de pareja real, porque el sistema ya lo creería
  ocupado.

## Opciones consideradas

1. **Un espacio juntos por usuario**: comprobación solo a nivel de
   aplicación (`select exists(...)` antes del insert) vs. una columna
   denormalizada `space_members.space_type` (copiada una vez de
   `spaces.type` al crear la membresía) más un índice único parcial sobre
   `(user_id) where status='active' and space_type='couple'`.
2. **Caducidad de invitación**: guardar un estado `'expired'` actualizado
   por un job programado vs. calcular el estado efectivo al leer
   (`expires_at < now()`).
3. **Señal de que un espacio de pareja se disolvió**: un nuevo valor
   `space_members.status = 'dissolved'` vs. reutilizar el `'removed'` que
   ya usa `request_account_deletion()` y dejar la señal en
   `spaces.archived_at`.
4. **Pantallas de autenticación**: un `Stack.Navigator` dedicado dentro de
   Ajustes vs. componentes presentacionales (`onSuccess`/`onCancel`, sin
   `AppModal` propio) reutilizables tanto desde un modal (`AuthModal`,
   Ajustes) como desde una pantalla completa (`AcceptInvitationScreen`,
   enlace de invitación).
5. **Correo**: reemplazar todo el envío de Supabase Auth con Auth Hooks
   personalizados llamando siempre a la API de Resend, vs. configurar
   Resend como SMTP personalizado en el Dashboard de Supabase (cubre
   confirmación de cuenta y recuperación de contraseña con las plantillas
   nativas de Auth) y usar una Edge Function propia solo para el correo de
   invitación, que no es un flujo nativo de Supabase Auth.

## Decisión

- **Opción 2 en la decisión 1 (índice único parcial):** una comprobación
  solo de aplicación deja una condición de carrera real entre el
  `select exists` y el `insert` de dos aceptaciones concurrentes. Se añadió
  `space_members.space_type` (`not null`, backfill desde `spaces.type`) y
  `space_members_one_active_couple_per_user_idx`, igual que
  `spaces_one_active_personal_per_user_idx` ya resuelve el caso análogo para
  espacios personales. `create_couple_space()` y `accept_space_invitation()`
  hacen primero una comprobación amigable (`raise exception
  'already_in_couple_space: ...'`) y además capturan `unique_violation` como
  respaldo ante la carrera real.
- **Opción 2 en la decisión 2 (calculado al leer):** el proyecto no tiene
  `pg_cron` configurado; `get_space_invitation_preview()` y
  `accept_space_invitation()` comparan `expires_at < now()` en cada lectura
  en vez de depender de un job.
- **Opción 2 en la decisión 3 (reutilizar `'removed'` + `archived_at`):**
  evita una migración de `CHECK` adicional y mantiene el enum estable;
  `dissolve_couple_space()` marca `spaces.archived_at = now()` y ambas
  membresías activas en `status = 'removed'`, sin tocar movimientos ni
  categorías (se conservan, igual que la rama de espacio compartido de
  `request_account_deletion()`).
- **Opción 2 en la decisión 4 (componentes presentacionales reutilizables):**
  `src/features/auth/screens/*` (`SignUpScreen`, `VerifyCodeScreen`,
  `LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`) no incluyen
  ningún wrapper de modal propio. `AuthModal`
  (`src/features/settings/components/AuthModal.tsx`) los envuelve en
  `AppModal` para Ajustes; `AcceptInvitationScreen`
  (`src/features/spaces/screens/AcceptInvitationScreen.tsx`) los renderiza a
  pantalla completa cuando alguien abre un enlace de invitación sin sesión,
  sin duplicar la lógica de formulario.
- **Opción 2 en la decisión 5 (SMTP + Edge Function separada):** documentado
  en `docs/setup/RESEND_SETUP.md`. Confirmación de cuenta y recuperación de
  contraseña siguen el flujo nativo de Supabase Auth (código, no enlace, per
  `Bible/PRODUCT.md` §10) enviado vía SMTP de Resend configurado en el
  Dashboard. La invitación a un espacio (tabla propia `space_invitations`,
  no es un flujo de Auth) se envía desde la Edge Function
  `send-space-invitation-email`, que llama directamente a la API HTTP de
  Resend con el token en texto plano que le pasa el cliente — ese token
  nunca se guarda en la base de datos, solo existe en la respuesta de
  `create_space_invitation()` y en el cuerpo del correo.
- **Revisión — invitaciones dentro de la app:** se elimina el envío de
  invitaciones mediante Resend. El enlace se comparte manualmente y, si el
  correo indicado ya corresponde a una cuenta, esa sesión ve la invitación al
  abrir Juntoss y puede aceptarla o dejarla para más tarde. La consulta y la
  aceptación nuevas siguen siendo RPC `SECURITY DEFINER`, por lo que un
  cliente nunca puede enumerar invitaciones o correos ajenos.
- **Corrección de `spaces_update_owner`:** pasa a comprobar una membresía
  activa con `role = 'owner'` en vez de `spaces.created_by`, resolviendo la
  limitación documentada en ADR-066.
- **Corrección de `members_update_self_owner`:** excluye espacios
  `type = 'couple'` de la auto-edición directa desde el cliente. Antes
  cualquier `owner` podía poner su propia fila en `status = 'removed'` sin
  pasar por ninguna función controlada; inofensivo para espacios
  personales/otros (un único dueño de sí mismo), pero se habría convertido
  en un "abandono silencioso" no gobernado en cuanto existieran dos
  anfitriones simétricos en un espacio de pareja.
- **Corrección de `migrate_guest_data()`:** degrada cualquier espacio local
  `type: 'couple'` a `'other'` al subirlo, y
  `src/features/spaces/types.ts` deja de incluir el `coupleSpace` stub en
  `initialSpacesState` — los invitados nuevos arrancan solo con
  `personalSpace`. Es un cambio de producto visible (el "Juntos" que
  aparecía por defecto en el menú lateral deja de mostrarse a invitados
  nuevos) pero necesario: sin él, todo usuario que se registrara quedaría
  bloqueado para siempre de crear o aceptar un espacio de pareja real.
- **Alcance de sincronización:** un espacio de pareja solo sincroniza su
  identidad y membresía (`spaces`, `space_members`) con Supabase. Sus
  categorías y movimientos siguen siendo tan locales como los de cualquier
  otro espacio hoy — no existe todavía sincronización remota general para
  ningún tipo de espacio (`Bible/DATABASE.md` §13, fase 13 sin empezar), así
  que extenderla aquí habría sido un alcance muy superior al pedido.

## Consecuencias positivas

- Corrige dos limitaciones ya documentadas como pendientes (ADR-066) antes
  de que un espacio de pareja real pudiera activarlas.
- La fila "Iniciar sesión o crear cuenta" de Ajustes deja de ser un `Alert`
  de función pendiente.
- La regla de "un espacio juntos por usuario" está garantizada por la base
  de datos, no solo por la interfaz, incluida la carrera de dos aceptaciones
  simultáneas.
- El token de invitación nunca se guarda en texto plano.

## Consecuencias negativas

- No existe todavía una acción explícita de "revocar invitación sin
  reemplazarla" — solo se revoca implícitamente al crear una nueva para el
  mismo espacio. Aceptable porque la caducidad (7 días) acota la ventana;
  queda como mejora futura pequeña.
- No existe transferencia de propiedad más allá de la disolución simétrica:
  si se necesitara en el futuro que un espacio de pareja sobreviva con un
  único anfitrión (por ejemplo, tras borrar la cuenta del otro), no hay
  mecanismo para ello — hoy `dissolve_couple_space()` siempre desactiva a
  ambos miembros a la vez.
- Al pulsar "Espacio de pareja" sin sesión, `AuthModal` se abre y al
  autenticarse simplemente se cierra; el usuario debe volver a pulsar
  "Espacio de pareja" una segunda vez en vez de encadenarse
  automáticamente, porque la interfaz pública de `AuthModal` no distingue
  éxito de cancelación. Mejora de UX pendiente, no un defecto de datos.
- `loginService.ts` puede ofrecer combinar datos de invitado incluso cuando
  lo único "extra" en el dispositivo es un espacio de pareja ya fusionado en
  una sesión anterior (la entrada persiste localmente entre sesiones); es un
  patrón ya existente antes de esta tarea, no una regresión introducida
  aquí, pero vale la pena revisarlo.

## Riesgos

- Ninguna migración ni Edge Function de esta tarea se ha ejecutado contra
  una instancia real de Supabase: se verificaron por lectura cuidadosa
  contra el esquema existente y con pgTAP nuevo
  (`space_invitations.test.sql`, `couple_space_constraints.test.sql`,
  adiciones a `rls_policies.test.sql`), pero deben correrse contra
  `supabase test db` o un proyecto de prueba antes de producción, ya que la
  migración altera dos políticas RLS en vivo (`spaces_update_owner`,
  `members_update_self_owner`).
- La condición de carrera de "un espacio juntos por usuario" se cierra a
  nivel de índice único, pero no se probó con dos conexiones concurrentes
  reales (pgTAP no lo permite fácilmente) — validar a mano con dos sesiones
  en un proyecto de prueba antes de confiar en ella en producción.
- Si el correo de invitación falla al enviarse, la invitación ya existe (no
  se revierte); la interfaz debe ofrecer el enlace como respaldo en ese
  caso — implementado en `InvitePartnerScreen`, pero no probado contra un
  envío real de Resend todavía.
- No se ejecutó la app en un simulador o dispositivo real para ninguna de
  las pantallas nuevas: solo verificación estática (`tsc`, `eslint`) y
  pruebas unitarias/de componente con Jest.

## Validación

- `npx tsc --noEmit` y `npm run lint` sin errores en todo el proyecto.
- Suites de Jest nuevas o actualizadas en verde: `supabaseAuthGateway`,
  `loginService`, `supabaseInvitationGateway`, `useSpaces`, `SpaceSideMenu`,
  `SettingsScreen`, `localSpaceRepository`. El resto de la suite del
  proyecto (72 archivos) se corrió completa; los 7 fallos preexistentes
  (`HomeScreen`, `ActivityScreen`, `CreateTransactionModal`,
  `MainTabsNavigator`, problemas de `accessibilityState`/mock de SQLite en
  el entorno de test) se confirmaron ajenos a esta tarea comparando con
  `git stash`.
- Pendiente: `supabase test db` (pgTAP) contra una instancia real y una
  verificación manual completa en dispositivo/simulador (iOS y Android)
  del flujo de extremo a extremo: invitado → registro con código → crear
  espacio de pareja → invitar por enlace → aceptar desde otra cuenta →
  confirmar ambos como anfitriones → "Eliminar espacio juntos".

---

# ADR-069 — Importación bancaria Fase 1 (Excel/CSV) sin soporte de PDF

**Estado:** Aceptada

## Contexto

`Bible/JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md` especifica un sistema de
importación de movimientos desde XLSX/XLS/CSV y PDF. Se implementó la Fase 1
(Excel/CSV) completa: selección de archivo, mapeo de columnas, normalización
de fecha/importe/tipo, sugerencia de categoría, deduplicado, revisión y
commit por lote reutilizando `CreateTransactionDraft`/`createLocalTransactions`.

Antes de encarar PDF (Fase 2 del documento), se investigó si existe alguna
forma de extraer texto de un PDF digital dentro de Expo Go, que es el flujo
de desarrollo actual del proyecto (`expo start --go`, sin dev client). Es la
misma restricción que ya descartó `@react-native-documents/picker` en favor
de `expo-document-picker`.

## Opciones consideradas

1. **`expo-pdf-text-extract`** — módulo nativo (PDFKit/PDFBox). Su propio
   README dice explícitamente: *"requires an Expo development build. It
   will not work in Expo Go."*
2. **`pdfjs-dist`** (PDF.js) — sin build para React Native. El propio
   repositorio de Mozilla tiene un hilo abierto sin resolver intentando esto
   (`mozilla/pdf.js#18734`); nadie logró un resultado funcional en iOS, y
   solo un intento parcial en Android con una build legacy.
3. **`unpdf`** — pensada para "entornos sin Node/DOM", en teoría la más
   cercana, pero sin ningún caso documentado de uso en React Native/Expo.
   Adoptarla sería descubrir en producción si funciona o no.
4. **Backend propio para procesar PDF** (`pdf-parse` sobre un worker o Edge
   Function, tal como ya prevé el documento en su §20 y §26) — viable en
   principio, pero requiere infraestructura nueva (autenticación, límites de
   subida, borrado garantizado) que no existe hoy.
5. **Migrar todo el proyecto a un dev client de Expo** — habilitaría
   `expo-pdf-text-extract` y cualquier módulo nativo futuro, pero es una
   decisión que afecta el flujo de desarrollo completo, no solo esta
   feature.
6. **Descartar PDF por ahora**, mantener Excel/CSV como únicos formatos
   soportados, y comunicarlo con claridad en la interfaz.

## Decisión

Se elige la opción 6: **no se implementa lectura de PDF.** La importación
soporta únicamente `.xlsx`, `.xls` y `.csv`. La tarjeta "Importar
movimientos" del menú de creación rápida y el mensaje de error ante un
archivo no soportado dicen explícitamente "Excel o CSV", sin mencionar PDF
en ningún punto de la interfaz.

## Motivo

Ninguna opción on-device es reproducible ni está probada en el flujo de
Expo Go actual, y las dos alternativas viables (backend propio o dev
client) son decisiones de arquitectura transversales que no deben tomarse
como efecto colateral de una sola feature. El principio del propio documento
de importación —"Automatizar lo seguro... nunca inventar"— aplica también
a la propia decisión de alcance: mejor no ofrecer PDF que ofrecerlo sobre
una base no verificada.

## Consecuencias positivas

- Cero deuda técnica ni dependencias nuevas por una integración a medias.
- El usuario nunca ve una opción de "importar PDF" que luego falla o
  requiere una contraseña de archivo sin poder completarse.
- Deja documentada la investigación completa (librerías, issues, fuentes)
  para no repetirla si se retoma más adelante.

## Consecuencias negativas

- Un usuario cuyo banco solo exporta PDF no puede usar la importación
  todavía; debe convertir manualmente a Excel/CSV o registrar los
  movimientos a mano.

## Riesgos

- Si en el futuro se retoma PDF sin releer este ADR, se puede repetir la
  misma investigación desde cero.
- `unpdf` queda como la única vía on-device no descartada del todo por
  falta de evidencia (no por evidencia de que falle): un spike acotado
  (~1 hora) sigue siendo razonable antes de invertir en backend o dev
  client si PDF se vuelve prioritario.

## Validación

Investigación documentada con fuentes (repositorio y README de
`expo-pdf-text-extract`, `mozilla/pdf.js#18734`, documentación de `unpdf`,
issues de `pdf-lib` confirmando que no extrae texto). No se escribió código
de PDF en ningún punto: `src/features/import/` solo contiene parsers de
spreadsheet.

## Reemplaza

Ninguno. Complementa la Fase 1 de `JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md`.

---

# ADR-070 — Importación bancaria Fase 2: PDF digital vía backend/worker

**Estado:** Reemplazada por ADR-071.

> Esta decisión duró menos de un día: al aclarar que "probar en el entorno
> real" para la opción on-device significaba compilar un development build
> (no simplemente correr en un teléfono físico dentro de Expo Go), se pidió
> explícitamente una implementación 100% offline sin backend propio. Se deja
> el análisis completo porque documenta por qué se consideró esta opción y
> qué se investigó, aunque el código de esta ADR ya no existe en el
> repositorio.

## Contexto

Tras ADR-069, se retomó la pregunta de si conviene extraer texto de PDF
directamente en el teléfono, y si eso volvería la app lenta. La extracción
de texto de un PDF digital de pocas páginas es en sí misma rápida (del
orden de milisegundos a pocos segundos); lo que bloqueaba la opción
on-device no era el rendimiento sino que Expo Go no puede cargar módulos
nativos como `expo-pdf-text-extract` (ADR-069). El propio spec
(`JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md` §20, §26, §27) ya preveía un backend
para esto.

## Opciones consideradas

1. **On-device migrando a un dev client de Expo** — habilitaría
   `expo-pdf-text-extract`, pero sigue siendo una decisión transversal de
   build que no debe tomarse como efecto colateral de esta feature (mismo
   argumento de ADR-069).
2. **Backend/worker**: una Edge Function de Supabase autentica, firma la
   subida y orquesta; un microservicio externo (Node + `pdf-parse`) hace la
   extracción pesada fuera del teléfono; el cliente reutiliza el mismo
   pipeline de normalización/categorización/dedup/revisión que ya usa para
   Excel/CSV sobre las filas extraídas.
3. **Seguir posponiendo PDF** — descartada: el usuario pidió avanzar ahora.

## Decisión

Se elige la opción 2. La Edge Function (`supabase/functions/import-pdf-extract/`)
solo autentica, valida tamaño/tipo y reenvía al worker — nunca procesa el
PDF ella misma (spec §27: Edge Functions para auth/firma/validación ligera,
un worker dedicado para PDF pesado). El worker
(`services/pdf-import-worker/`) es un servicio Node/TypeScript standalone
que extrae texto con `pdf-parse` y devuelve `{ headers, rows }` con la
misma forma que `ParsedSheet`, para que el cliente lo procese exactamente
igual que hoy procesa una hoja de Excel: mismo `detectColumnMapping`,
mismo `buildImportCandidates`, mismo commit vía `createLocalTransactions`.
No se crea una tabla remota nueva: cuando se active, un PDF será un
`import_batches` más con `source_type = 'pdf'`.

Esta decisión **no** habilita todavía PDF en el selector de archivos ni en
`ImportSourceExtension`. Esa parte queda para la siguiente entrega, una vez
desplegado el worker (ver "Riesgos").

## Motivo

Mantiene Expo Go como flujo de desarrollo sin forzar una migración
transversal por una sola feature. Saca el trabajo pesado del teléfono, que
es precisamente lo que resuelve la preocupación de rendimiento que motivó
esta conversación. Reutiliza el pipeline existente en vez de duplicar
normalización/categorización para PDF (regla central del spec, §2).
Reutilizar `import_batches`/`import_items` evita crear una tabla remota
solo por anticipación (spec §31).

## Consecuencias positivas

- Ningún impacto de rendimiento en el dispositivo: la extracción ocurre
  fuera del teléfono.
- Cero duplicación de la lógica de normalización, categorización o
  deduplicación.
- El esquema remoto ya soporta la reanudación/revisión/commit de un PDF sin
  cambios adicionales una vez que `source_type` acepte `'pdf'`.

## Consecuencias negativas

- Requiere operar un servicio externo (hosting, monitoreo, disponibilidad)
  que hoy no existe.
- La importación de PDF deja de funcionar completamente offline (Excel/CSV
  sí sigue funcionando sin red).
- La heurística de extracción (separar líneas por espacios, sin detección
  real de tablas ni OCR) puede fallar en extractos visualmente complejos
  (spec §18); esas filas deben cubrirse con el mapeo manual de columnas ya
  existente, igual que un Excel ambiguo.

## Riesgos

- **El worker no está desplegado.** Antes de exponer PDF en el selector de
  archivos hace falta: (1) elegir dónde se hospeda el servicio, (2)
  configurar `PDF_WORKER_URL` y el secreto compartido con la Edge Function,
  (3) el spike de al menos 20 layouts ficticios/autorizados que pide el
  spec §81 Fase 2. Sin esto, no debe añadirse `'pdf'` a
  `importAcceptedExtensions` ni a los CHECK de `source_type`: repetiría el
  mismo error que corrigió la auditoría del 2026-08-09 (un valor aceptado
  por el esquema que el cliente nunca puede producir todavía).
- Un extracto bancario en tránsito hacia el worker debe seguir las mismas
  garantías de ciclo de vida que un archivo local (spec §9, §63): URL de
  subida de corta duración, borrado tras procesar, sin logs de contenido.

## Validación

Esquema y Edge Function cubiertos por pruebas equivalentes a
`supabase/tests/import_learning.test.sql` (existencia, RLS, permisos). El
worker tiene pruebas unitarias con texto de fixture, nunca extractos reales
(spec §72). La validación end-to-end contra layouts bancarios reales queda
pendiente como el siguiente paso explícito antes de habilitar esto para
usuarios reales.

## Reemplaza

Ninguno. Extiende la opción de backend que ADR-069 ya dejaba abierta; no
reabre la opción on-device, que sigue descartada por las mismas razones.

---

# ADR-071 — Importación bancaria Fase 2: PDF digital 100% on-device, sin backend

**Estado:** Aceptada

## Contexto

ADR-070 eligió un backend/worker para no depender de un development build.
Al aclarar la implicación real de la opción on-device —no es "probar en un
teléfono físico", es dejar de usar Expo Go y compilar un development build
propio (`eas build --profile development` o Xcode/Android Studio
localmente)— se pidió explícitamente una importación de PDF **completamente
offline**, sin ningún servicio externo.

## Opciones consideradas

1. **Mantener el backend/worker de ADR-070.** Descartada: requiere operar
   infraestructura externa y el extracto bancario sale del dispositivo,
   justo lo que se quiere evitar.
2. **On-device con `expo-pdf-text-extract`.** Módulo nativo (PDFKit en iOS,
   PDFBox en Android) ya investigado en ADR-069. Requiere development
   build; no funciona en Expo Go bajo ninguna circunstancia, ni en
   simulador ni en dispositivo físico.
3. **Seguir sin PDF.** Descartada: contradice la instrucción explícita de
   avanzar con una versión offline.

## Decisión

Se elige la opción 2. `expo-pdf-text-extract` (MIT, sin dependencias,
`extractTextWithInfo()` como variante que no lanza excepciones y devuelve
`{ text, pageCount, success, isEncrypted, passwordRequired, errorCode }`)
se añade como dependencia de la app. El extracto nunca sale del teléfono: el
texto se extrae localmente y se reutiliza el mismo heurístico de separación
en columnas ya escrito para la opción de backend
(`src/features/import/parsers/extractPdfRows.ts`, portado sin cambios de
lógica), y de ahí en adelante el mismo pipeline que ya procesa Excel/CSV
(`detectColumnMapping`, `buildImportCandidates`, revisión, commit).

Se elimina por completo `services/pdf-import-worker/` y
`supabase/functions/import-pdf-extract/` de ADR-070.

`import_batches.source_type` y `ImportSourceExtension` pasan a aceptar
`'pdf'` en el mismo cambio que habilita el selector de archivos, evitando
la capacidad muerta que corrigió la auditoría del 2026-08-09: aquí sí hay
código cliente real que produce `'pdf'` desde el primer commit.

## Motivo

Cumple la instrucción explícita de una versión offline. Coincide además con
el orden de preferencia que el propio spec ya establecía (Bible
`JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md` §28: "1. On-device, 2. Backend propio
temporal, 3. IA externa solo como fallback"): on-device siempre fue la
opción preferida: solo se había descartado por la limitación de Expo Go, no
por ser peor en sí misma. Un extracto bancario nunca sale del dispositivo,
que es la postura más privada posible.

## Consecuencias positivas

- Cero infraestructura externa que operar, monitorear o pagar.
- El PDF nunca sale del teléfono: mejor postura de privacidad posible.
- Funciona sin conexión, igual que Excel/CSV.
- Cero duplicación de lógica: mismo heurístico y mismo pipeline que ya
  existían para la opción de backend y para Excel/CSV respectivamente.

## Consecuencias negativas

- **El proyecto deja de poder desarrollarse únicamente con Expo Go.**
  A partir de esta feature, probar la importación de PDF (y cualquier
  cambio que la toque) requiere un development build instalado en el
  dispositivo o simulador. El resto de la app sigue funcionando en Expo Go
  sin cambios.
- La heurística de extracción sigue siendo best-effort (spec §18): sin
  detección real de tablas ni OCR. PDFs escaneados o con maquetación
  compleja necesitan el mapeo manual de columnas ya existente o quedan
  fuera con un mensaje claro.
- No hay build de desarrollo configurado todavía en este repositorio
  (`eas.json` no existe): generarlo y aprender el nuevo flujo de
  instalación es trabajo adicional que no existía antes de esta feature.

## Riesgos

- El spike de al menos 20 layouts ficticios/autorizados que pide el spec
  §81 Fase 2 no se ha corrido: no se puede compilar ni ejecutar un
  development build desde este entorno de agente. Antes de considerar esto
  terminado para usuarios reales, alguien con un dispositivo y el build
  instalado debe probarlo contra PDFs ficticios de bancos reales.
- `expo-pdf-text-extract` es una librería joven (3 versiones en el
  registro). Si deja de mantenerse, la alternativa de backend de ADR-070
  queda documentada como plan B, no borrada de la memoria del proyecto.
- Un PDF con contraseña pide la contraseña del archivo una sola vez, no la
  persiste, y no debe registrarla en logs ni analítica (spec §29).

## Validación

`extractPdfRows.ts` tiene pruebas unitarias con texto de fixture (nunca un
extracto real, spec §72). `pdfParser.ts` tiene pruebas unitarias mockeando
`expo-pdf-text-extract` para los casos de éxito, PDF protegido, PDF
corrupto y PDF sin texto (escaneado). La validación contra PDFs reales en
un development build queda pendiente y es responsabilidad de quien
compile y pruebe el build, no de este cambio.

## Reemplaza

ADR-070 en su totalidad: no queda código de la opción de backend en el
repositorio.

---

# ADR-072 — Development build local para validar módulos nativos en iOS

**Estado:** Aceptada

## Contexto

ADR-071 incorpora `expo-pdf-text-extract`, que depende de código nativo y no
puede ejecutarse en Expo Go. El repositorio no tenía una forma documentada y
reproducible de generar una app iOS propia para un iPhone real o Xcode.

## Opciones consideradas

1. Mantener solo Expo Go.
2. Configurar una development build local con `expo-dev-client` y Expo CNG.
3. Configurar primero una distribución remota mediante EAS.

## Decisión

Se instala `expo-dev-client` compatible con Expo SDK 54 y se adopta el flujo
local `expo run:ios`. Los comandos `prebuild:ios`, `ios:dev`, `ios:device` y
`start:dev-client` exponen ese flujo sin retirar Expo Go. El proyecto `ios/`
se genera desde `app.json` y las dependencias; continúa ignorado por Git.

## Motivo

La compilación local con Xcode permite probar en un dispositivo conectado sin
requerir una cuenta de Expo ni introducir todavía distribución remota. Cumple
la necesidad inmediata de validar PDF en el teléfono y conserva Expo Go para
iteraciones que no usan módulos nativos adicionales.

## Consecuencias positivas

- Xcode puede abrir `ios/juntoss.xcworkspace` tras `npm run prebuild:ios`.
- `npm run ios:device` instala una development build en un iPhone conectado.
- Los módulos nativos presentes, incluido el extractor de PDF, se compilan en
  la app propia.

## Consecuencias negativas

- La primera compilación requiere Xcode, CocoaPods, firma local y modo de
  desarrollo activado en el dispositivo.
- Al cambiar una dependencia o configuración nativa hay que regenerar y
  recompilar la development build.

## Riesgos

- La firma depende de un equipo de desarrollo de Apple configurado localmente;
  no se puede declarar en el repositorio ni seleccionar de forma segura por
  otra persona.
- Los directorios nativos generados se reemplazan con `expo prebuild`, por lo
  que no deben recibir cambios manuales.

## Validación

- `expo install --check` y `expo-doctor` sin incidencias de compatibilidad.
- `npm run prebuild:ios` genera el workspace y completa `pod install`.
- Compilación de Debug para `iphoneos` y prueba manual en un dispositivo real,
  incluida la importación de un PDF de prueba autorizado.

## Reemplaza

No reemplaza ADR-033: Expo Go sigue como vía rápida de validación. Extiende
ADR-071 con el flujo de development build que esa decisión requería.

---

# ADR-073 — Eliminar la importación de PDF por completo; solo Excel/CSV

**Estado:** Aceptada

## Contexto

La implementación on-device de ADR-071 (`expo-pdf-text-extract`) generó
errores repetidos durante el desarrollo y nunca se validó contra el spike de
20 layouts reales que pedía el spec §81 (ver "Riesgos" de ADR-071 y "Known
issues" del registro de implementación de la época (retirado del repositorio), 2026-08-09). El propietario del
producto valora la importación de PDF como una función de uso marginal frente
al coste de mantenerla — heurística best-effort, dependencia nativa joven,
requisito de development build, contraseñas de archivo — y pidió eliminarla
en vez de seguir invirtiendo en corregirla.

## Opciones consideradas

1. **Seguir depurando `expo-pdf-text-extract`.** Descartada: el spike de
   validación seguía pendiente y el propietario del producto ya no quiere
   invertir más en esta ruta.
2. **Dejar el código de PDF apagado pero presente ("por si acaso").**
   Descartada: el propio pedido es que no quede código estorbando; código
   muerto sin fecha de reactivación es peor que no tenerlo.
3. **Eliminar PDF por completo; Excel/XLS/CSV siguen exactamente igual.**
   Elegida.

## Decisión

Se elimina toda la ruta de PDF, tanto cliente como Supabase:

- Cliente: `src/features/import/parsers/pdfParser.ts`,
  `extractPdfRows.ts` y sus tests se borran. `ImportScreen.tsx` pierde la
  fase `pdf-password` y su rama de parseo; `ImportSourceExtension`,
  `importAcceptedExtensions`, `importAcceptedMimeTypes` y
  `importFileSizeLimitBytes` dejan de incluir `'pdf'`.
  `validateImportFile` ahora rechaza `.pdf` con `unsupported_file`.
- Dependencia: `expo-pdf-text-extract` se desinstala de `package.json`.
- SQLite local: se elimina la migración 16 (que solo existía para que
  `source_type` aceptara `'pdf'`); `localDatabaseVersion` vuelve a 15, que ya
  dejaba `import_batches.source_type` en `('xls', 'xlsx', 'csv')`.
- Supabase: se elimina
  `supabase/migrations/14_import_batches_pdf_source_type.sql`. La migración
  12 ya dejaba `source_type` y `sync_import_batches` sin `'pdf'`, así que no
  hace falta ninguna migración de reversión adicional.
- No existía ninguna Edge Function de PDF que eliminar: la de ADR-070
  (`supabase/functions/import-pdf-extract/`) ya se había borrado por
  completo al adoptar ADR-071.

Excel (`.xls`/`.xlsx`) y CSV no cambian: usan el mismo parser (`SheetJS` vía
`spreadsheetParser.ts`) y el mismo pipeline de siempre.

## Motivo

El propietario del producto priorizó estabilidad y superficie de código
reducida sobre una función de bajo uso esperado que, además, todavía no
había pasado su propia validación mínima. Mantener código apagado de PDF no
aporta nada si no hay fecha de retomarlo, y complica cualquier lectura futura
del pipeline de importación.

## Consecuencias positivas

- Menos superficie de fallo: ya no hay dependencia nativa, contraseñas de
  archivo, ni heurística best-effort de columnas por huecos.
- El proyecto ya no depende de un development build para nada relacionado
  con importación: Excel/CSV siempre funcionó en Expo Go.
- Menos rutas de test y de UI que mantener sincronizadas entre sí.

## Consecuencias negativas

- Un usuario que solo tenga el extracto en PDF debe convertirlo a Excel/CSV
  fuera de la app antes de importar.
- Se pierde el trabajo de ADR-071 (heurística de columnas, extracción
  on-device, manejo de contraseña); si se retoma en el futuro, es una
  reimplementación, no una reactivación.

## Riesgos

- Ninguno nuevo: esta decisión reduce superficie en vez de añadirla.

## Validación

- `validateImportFile.test.ts` verifica que un `.pdf` se rechaza con
  `unsupported_file`.
- `ImportScreen.test.tsx` ya no referencia `pdfParser` ni la fase de
  contraseña.
- `npm run typecheck` y la suite de tests de `import/` pasan sin referencias
  a PDF.

## Reemplaza

Deja sin efecto ADR-071 en cuanto a soporte de PDF. ADR-072
(development build local) no se revierte: sigue disponible para otros
módulos nativos que la app pueda necesitar en el futuro, aunque ya no lo
motive la importación de PDF.

---

# ADR-074 — Las contraseñas nunca se persisten en el dispositivo

**Estado:** Aceptada

## Contexto

Al construir el wizard de registro de 4 pasos con confirmación de
contraseña (2026-08-10/11) se pidió explícitamente verificar que ninguna
contraseña quedara guardada en texto plano ni en ninguna otra parte local
vulnerable de la app. Antes de esa auditoría no existía una decisión
registrada que fijara esto como una restricción de arquitectura; dependía
únicamente de que cada pantalla de auth nueva se escribiera "bien" por
convención, sin nada que lo hiciera explícito para quien tocara ese código
después.

## Opciones consideradas

1. **No documentar nada, confiar en la revisión de código.** Descartada:
   sin una regla explícita, es fácil que una futura pantalla de auth (por
   ejemplo, un "recordar contraseña" o un modo de depuración) empiece a
   guardar el valor sin que nadie lo note como una regresión de seguridad.
2. **Cifrar la contraseña y guardarla localmente "por si acaso".**
   Descartada: no hay ningún caso de uso en el producto que necesite leer
   la contraseña de vuelta en el dispositivo (no hay biometría local ni
   autocompletado propio); guardar un secreto que nunca se lee es riesgo
   puro sin beneficio.
3. **Fijar como regla de arquitectura que la contraseña solo existe en
   memoria mientras se captura, más una prueba de regresión que lo
   verifique.** Elegida.

## Decisión

- La contraseña vive únicamente como `useState` local en las pantallas que
  la piden (`SignUpScreen.tsx`, `LoginScreen.tsx`, `ResetPasswordScreen.tsx`)
  y se pasa en memoria, una sola vez, a `supabaseAuthGateway.ts`
  (`signUp`, `signInWithPassword`, `updateUser`), que la envía por HTTPS a
  Supabase Auth. Supabase la hashea del lado del servidor; el cliente nunca
  recibe ni guarda un hash ni la contraseña original.
- Ningún gateway, servicio o repositorio de `features/auth/` escribe la
  contraseña en `AsyncStorage`, `expo-secure-store`, SQLite local ni la
  registra con `console.*` o cualquier logger.
- Lo único que sí se persiste localmente es la *sesión* (JWT/refresh token),
  ya cubierto por Fase 7 del ROADMAP ("Almacenamiento seguro de sesión"):
  `expo-secure-store` (Keychain/Keystore) en nativo, `AsyncStorage` en web
  vía `createSupabaseClient` (`src/lib/supabase/supabaseClient.ts`). Es un
  secreto de corta vida y revocable, no la contraseña.
- `SignUpScreen.test.tsx` incluye una prueba de regresión
  (`no persiste la contraseña en AsyncStorage ni SecureStore`) que espía
  `AsyncStorage.setItem` y `SecureStore.setItemAsync` durante un registro
  completo y falla si el valor de la contraseña aparece en cualquier
  llamada.

## Motivo

Una contraseña que nunca se lee de vuelta en el dispositivo no necesita
persistirse ni cifrada: el único lugar donde debe validarse es el servidor
de Supabase. Fijar esto como regla explícita, con una prueba que la
verifique, evita que una futura pantalla la persista "por comodidad" sin que
nadie lo note como una regresión de seguridad.

## Consecuencias positivas

- No hay superficie de ataque local para la contraseña: ni un backup del
  dispositivo, ni un debugger conectado, ni un log pueden filtrarla, porque
  nunca sale de la memoria del formulario.
- La prueba de regresión falla de inmediato si alguien introduce
  accidentalmente una persistencia futura (por ejemplo, un "recordar
  contraseña" mal implementado).

## Consecuencias negativas

- Ninguna funcionalmente: el producto no ofrece (ni planea) autocompletar
  la contraseña desde almacenamiento propio: para eso ya existe el
  `autoComplete`/`textContentType` del teclado del sistema operativo.

## Riesgos

- Ninguno nuevo: esta decisión documenta y verifica un comportamiento que
  ya era correcto: no reduce ni añade superficie de ataque.

## Validación

- Auditoría manual de `src/features/auth/` (2026-08-11): ningún hit del
  término "password" corresponde a persistencia o logging; todos son
  `useState` local, DTOs en memoria, o metadatos de autofill del teclado.
- `SignUpScreen.test.tsx` → `no persiste la contraseña en AsyncStorage ni
  SecureStore` pasa y falla intencionalmente si se reintroduce una llamada
  de persistencia con el valor de la contraseña.
- `npm run typecheck`, `npm run lint` y la suite de tests de `auth/` pasan.

## Reemplaza

Ninguna. Formaliza y verifica una propiedad que ya cumplía el código
existente; no cambia ningún comportamiento visible.

---

## 3. Decisiones pendientes prioritarias

### D-001 — Herramienta de persistencia local

Resuelta mediante ADR-050.

### D-003 — Librería de modal o bottom sheet

Resuelta mediante ADR-034.

### D-004 — Estado remoto y caché

Definir si se utiliza una herramienta de consultas, una capa propia o una estrategia híbrida.

### D-005 — Política de edición compartida

Definir:

- Si un miembro puede editar movimientos ajenos.
- Si puede archivarlos.
- Si se muestra historial de cambios.
- Qué ocurre al salir.

### D-006 — Política de separación

Parcialmente resuelta mediante ADR-068 para espacios de pareja:
`dissolve_couple_space()` archiva el espacio y desactiva ambas membresías,
conservando movimientos y categorías (visibilidad histórica resuelta,
reversibilidad descartada). Siguen sin definir:

- Exportación de un espacio de pareja disuelto.
- Copia de categorías al separar (sí existe para copia manual entre
  espacios activos, no automática al disolver).
- Auditoría de la disolución.

### D-007 — Nombre definitivo de `Actividad`

Validar mediante diseño y comprensión de usuarios.

### D-008 — Nombre y alcance de Ahorros o Planes

Definir si son una única feature o conceptos separados.

### D-009 — Límites del modo invitado

Validar cantidad de movimientos, categorías y momento de conversión.

### D-010 — Estrategia de actualizaciones

Definir distribución, actualizaciones compatibles y procesos de lanzamiento para iOS y Android.

---

## 4. Plantilla para nuevas decisiones

```md
# ADR-XXX — Título

**Estado:** Propuesta | Aceptada | Reemplazada | Descartada | Pendiente

## Contexto

Qué problema o restricción motiva la decisión.

## Opciones consideradas

1. Opción A.
2. Opción B.
3. Opción C.

## Decisión

Qué se eligió.

## Motivo

Por qué.

## Consecuencias positivas

- ...

## Consecuencias negativas

- ...

## Riesgos

- ...

## Validación

Cómo se comprobará.

## Reemplaza

ADR anterior, si aplica.
```

---

---

# ADR-075 — Revisión de seguridad de autenticación: sesión en web y bloqueo de intentos fallidos

**Estado:** Aceptada

## Contexto

Auditoría de seguridad solicitada explícitamente (2026-08-11) sobre tres
puntos: dónde se guarda el token de sesión, si existen comprobaciones de
autorización que solo viven en el cliente, y si el login tiene límite de
intentos.

- **Token de sesión:** `createSupabaseClient` (`src/lib/supabase/
  supabaseClient.ts`) ya usaba `expo-secure-store` (Keychain/Keystore) en
  nativo, correcto desde ADR-074. En web usaba `AsyncStorage`, cuya
  implementación en `react-native-web` es `window.localStorage`: cualquier
  script con XSS en la página puede leerlo, y el token persiste
  indefinidamente entre sesiones del navegador.
- **Comprobaciones de autorización solo en cliente:** auditoría de
  `src/` no encontró ningún concepto de "admin" ni ninguna decisión de
  autorización que se tome solo en el cliente. Los únicos roles son
  `owner`/`member` de `space_members` (Bible/DATABASE.md §6.3), y toda
  mutación sensible (presupuesto de categoría, disolución de espacio,
  aceptar invitación, eliminar cuenta) pasa por RLS y funciones `SECURITY
  DEFINER`, verificado en `supabase/tests/rls_policies.test.sql`. La UI
  oculta botones según el estado local (por ejemplo, quién puede editar una
  categoría), pero eso es una comodidad de UX: el servidor vuelve a
  validarlo igual si alguien construye la petición a mano. No había nada
  que arreglar en este punto; se documenta para que una futura auditoría no
  repita la misma búsqueda.
- **Límite de intentos de login:** no existía ninguno. `signInWithPassword`
  llamaba directo a `client.auth.signInWithPassword`, sin límite propio más
  allá del rate limit genérico de GoTrue.

## Opciones consideradas — sesión en web

1. **Dejar `localStorage` (el valor por defecto de Supabase-js en web).**
   Descartada: es el status quo que motivó la auditoría.
2. **Cookies `httpOnly` gestionadas por un backend propio.** Descartada:
   este proyecto no tiene backend propio, solo Supabase directo desde el
   cliente (Bible/ARCHITECTURE.md); añadir uno solo para esto es una
   inversión de infraestructura desproporcionada para una app que hoy ni
   siquiera publica build de web (`app.json` no declara plataforma `web`).
3. **`sessionStorage` en vez de `localStorage`.** Elegida: mismo mecanismo
   de storage inyectable que ya usa Supabase-js (`SupportedStorage`), sin
   dependencias nuevas. No elimina el riesgo de XSS (sigue siendo JS
   leyendo JS del mismo origen), pero acota la ventana: el token
   desaparece al cerrar la pestaña o el navegador en vez de sobrevivir
   indefinidamente en disco entre sesiones.

## Opciones consideradas — límite de intentos de login

1. **Contador en el cliente (AsyncStorage/estado local).** Descartada:
   trivial de evadir borrando datos de la app o reinstalando, e
   inconsistente con el objetivo mismo de esta auditoría (no depender de
   comprobaciones que el cliente controla).
2. **Función RPC de Postgres invocable por el cliente que incrementa un
   contador por correo.** Descartada: permitiría a cualquiera bloquear la
   cuenta de otra persona llamando la función con su correo, sin intentar
   ninguna contraseña real — un bloqueo como denegación de servicio.
3. **Edge Function que envuelve `signInWithPassword` de verdad y actualiza
   el contador en el mismo paso, con la service role key.** Elegida: el
   contador solo se mueve junto con un intento real de autenticación contra
   GoTrue, no por una llamada aislada.

## Decisión

- `webSessionStorage` en `src/lib/supabase/supabaseClient.ts` reemplaza
  `AsyncStorage` como storage de sesión en `Platform.OS === 'web'`,
  respaldado por `window.sessionStorage`. Nativo no cambia.
- Migración `15_login_attempts_lockout.sql` crea `public.login_attempts`
  (Bible/DATABASE.md §6.12): RLS activado, sin ninguna política ni grant a
  `anon`/`authenticated` — solo la service role la toca.
- Edge Function `supabase/functions/login-with-lockout/index.ts`
  concentra el flujo: revisa si el correo está bloqueado, si no intenta
  `signInWithPassword` de verdad, y actualiza el contador según el
  resultado. A los 9 intentos fallidos consecutivos bloquea 1 hora y
  reinicia el contador; un login correcto lo limpia.
- `supabaseAuthGateway.signInWithPassword` ya no llama a
  `client.auth.signInWithPassword` directamente: invoca la Edge Function
  y, si responde con sesión válida, la hidrata con `client.auth.setSession`
  para que el storage configurado (Keychain/Keystore o `sessionStorage`)
  la persista igual que antes. Si la función responde bloqueo, lanza
  `AccountLockedError` con el mensaje "Por tu seguridad, debes esperar 1
  hora antes de volver a intentarlo." — la misma instancia de `Error` que
  ya maneja `LoginScreen`, sin cambios adicionales de UI necesarios.

## Motivo

Acotar la sesión de web a `sessionStorage` reduce el daño de un XSS de
"persistente hasta que alguien lo note" a "vale mientras la pestaña siga
abierta", con cambio mínimo y sin infraestructura nueva. El bloqueo de
intentos solo tiene sentido como protección real si se aplica en el mismo
lugar donde se valida la contraseña de verdad; hacerlo en el cliente o en
una función Postgres aislada habría creado una protección de cartón (o, en
el caso de la función Postgres pública, una vulnerabilidad nueva).

## Consecuencias positivas

- Un XSS en la versión web ya no obtiene un token utilizable
  indefinidamente entre sesiones del navegador.
- El bloqueo de intentos fallidos es real: no depende de un contador que
  el propio atacante controla, y no puede usarse para bloquear cuentas
  ajenas sin intentar una contraseña real.
- `AccountLockedError` es reutilizable por cualquier pantalla futura que
  necesite distinguir "credenciales incorrectas" de "cuenta bloqueada".

## Consecuencias negativas

- En web, cerrar la pestaña obliga a iniciar sesión de nuevo (antes la
  sesión sobrevivía indefinidamente). Aceptable: la app no publica build de
  web activamente hoy, y es el trade-off esperado al no tener backend
  propio para cookies `httpOnly`.
- El login ahora depende de una Edge Function desplegada
  (`supabase functions deploy login-with-lockout`) además de la migración
  aplicada; si no se despliega, el login falla por completo en vez de
  degradar a sin límite. Se documenta aquí para que el despliegue no se
  olvide.

## Riesgos

- **La protección de bloqueo no es infranqueable.** La URL y la clave
  `anon` de Supabase son públicas (van embebidas en la app). Un atacante
  que reimplemente la llamada HTTP directamente contra el endpoint de
  token de GoTrue, sin pasar por `login-with-lockout`, evita el bloqueo por
  completo. Esto es una limitación estructural de cualquier arquitectura
  de solo-cliente-más-BaaS sin un backend obligatorio delante: no hay forma
  de impedir que alguien hable directo con la API pública de Supabase. La
  mitigación real de ese escenario es el rate limiting propio de Supabase
  Auth (configurable en el dashboard del proyecto, fuera de este
  repositorio) más una contraseña con buena entropía; `login-with-lockout`
  protege el flujo normal de la app y a usuarios reales que se equivocan de
  contraseña, no a un atacante que ataca la API directamente.
- **`sessionStorage` sigue siendo legible por cualquier script del mismo
  origen.** No es una mitigación de XSS, es una reducción de la ventana de
  exposición. La mitigación real de XSS es no tener XSS (sanitizar
  contenido, no usar `dangerouslySetInnerHTML`-equivalentes, CSP si
  algún día se sirve la build de web).

## Validación

- `npx jest src/features/auth` pasa, incluye dos pruebas nuevas en
  `supabaseAuthGateway.test.ts` (`AccountLockedError` ante bloqueo, mensaje
  correcto ante credenciales inválidas) y dos pruebas existentes
  actualizadas para el nuevo flujo vía Edge Function.
- `supabase/tests/login_attempts.test.sql` (pgTAP, no corre en CI, se
  ejecuta con `supabase test db` como el resto de `supabase/tests/`):
  confirma que la tabla existe, tiene RLS activado, no define ninguna
  política y ni `anon` ni `authenticated` tienen `SELECT`.
- `npm run typecheck`, `npm run lint` y `npm run format:check`.

## Reemplaza

Ninguna. Completa la tarea pendiente "Almacenamiento seguro de sesión" de
Bible/ROADMAP.md Fase 7 y añade "Bloqueo temporal tras intentos fallidos",
no listada antes.

---

# ADR-076 — Sincronización financiera bidireccional en espacios Juntos

**Estado:** Aceptada

## Contexto

Un espacio de pareja ya compartía identidad y membresía (ADR-068), pero cada
categoría y movimiento seguía únicamente en SQLite. Por ello, si una persona
creaba un gasto en Juntos, su pareja no podía verlo aunque ambas tuvieran acceso
al mismo espacio remoto.

## Decisión

Sincronizar exclusivamente las entidades financieras de los espacios
`type = 'couple'` mediante el RPC transaccional
`sync_couple_space_data(...)` (migración 18). La UI mantiene el patrón
local-first: guarda primero en SQLite, publica categorías/series/movimientos
en orden de dependencia y marca una fila `synced` solo tras éxito remoto.

La migración 20 conserva, al insertar por primera vez, el UUID que SQLite ya
asignó a la categoría, serie o movimiento. De este modo el snapshot remoto no
puede materializar una segunda entidad para quien la creó. Se conserva un UUID
generado por PostgreSQL como fallback únicamente para datos locales heredados
que no tengan un identificador UUID válido.

La lectura usa el snapshot remoto existente sin sobrescribir filas locales
pendientes. La migración 19 publica las tres tablas financieras en Supabase
Realtime y, mientras Juntos está activo, el cliente se suscribe a sus cambios
por `space_id`; volver al primer plano y un sondeo de 15 segundos son el
respaldo ante una desconexión del socket. Todo miembro activo puede editar los
datos compartidos; el servidor valida siempre la membresía y el tipo de espacio
antes de ejecutar el lote.

## Consecuencias

- Los gastos e ingresos de Juntos aparecen en ambas cuentas inmediatamente sin
  depender de reiniciar sesión, mientras ambas tengan la app abierta en ese
  espacio.
- Los espacios personales, otros espacios y los usuarios invitados permanecen
  fuera de este transporte y no se escriben remotamente por esta vía.
- La concurrencia inicial es última escritura confirmada. Historial de cambios,
  conflictos manuales, notas libres, recordatorios y reglas de notificación
  compartidas quedan fuera del alcance; los tres últimos siguen locales.
- Las migraciones 18 y 19 deben aplicarse al proyecto Supabase antes de
  distribuir esta versión. Sin la 18, la escritura queda pendiente de forma
  segura en SQLite y se reintenta, pero no llega al otro miembro; sin la 19,
  sigue funcionando el respaldo de lectura, pero no hay aviso inmediato.

## Validación

- Pruebas unitarias del lote local cubren serialización, confirmación y el caso
  sin cambios.
- La prueba SQL comprueba que el RPC conserva esos UUID y mantiene el fallback
  compatible para datos heredados.
- Debe ejecutarse una prueba manual con dos cuentas: crear categoría y gasto
  con A, abrir Juntos con B y comprobar que llega; repetir edición y archivado.

## Reemplaza

La limitación de ADR-068 que mantenía categorías y movimientos de Juntos solo
en local.

---

# ADR-077 — La eliminación de cuenta falla para quien haya estado en un espacio Juntos

**Estado:** Aceptada

## Contexto

Un usuario real con la Edge Function `delete-account` ya desplegada seguía
viendo "No pudimos completar la eliminación" en `DataRightsScreen`. Su
espacio Juntos había sido disuelto por su pareja, dejándolo con la membresía
en `'removed'` sobre un espacio archivado.

Al revisar el esquema aparecieron tres defectos independientes, todos
invisibles desde la app porque el mensaje de error se descartaba:

1. La migración 06 hizo `created_by` nulable con `on delete set null` en
   `spaces`, `categories`, `recurring_transaction_series` y `transactions`,
   pero dos tablas creadas después repitieron el patrón antiguo
   (`created_by uuid not null references auth.users(id)`, sin acción
   `on delete`, es decir `NO ACTION`): `transaction_notification_rules`
   (migración 04) y `category_budgets` (migración 08). Esas filas solo se
   borran cuando `request_account_deletion()` arrastra el espacio entero, y
   eso únicamente ocurre en espacios en solitario. En cuanto el usuario ha
   pertenecido a un espacio compartido, sobreviven a propósito y
   `auth.admin.deleteUser()` choca contra la clave foránea: la Edge Function
   devuelve 500 con los datos ya medio limpiados y la cuenta viva.
2. El bucle de espacios en solitario de `request_account_deletion()` exigía
   `status = 'active'` en la membresía de quien llama. Como el primer intento
   marca todas las membresías como `'removed'` **antes** de fallar, el
   reintento no encontraba ningún espacio que limpiar y abandonaba para
   siempre el espacio personal del usuario con todos sus movimientos. Lo
   mismo ocurre con un espacio Juntos disuelto por
   `dissolve_couple_space()` (ADR-068), que archiva el espacio y deja ambas
   membresías en `'removed'`: `useSpaces` lo filtra por `archived_at is null`
   y las políticas RLS lo ocultan por `is_active_space_member`, así que queda
   invisible para todos y ninguna baja lo tocaba.
3. `login_attempts` (migración 15) se indexa por email y no tiene ninguna FK
   hacia `auth.users`, así que el email en claro sobrevivía a la baja.

## Opciones consideradas

1. Borrar las filas de `transaction_notification_rules` y `category_budgets`
   del usuario que se da de baja.
2. Hacer nulable su `created_by` con `on delete set null`, como la
   migración 06.
3. Limpiar el espacio archivado completo en cuanto una de las dos personas
   elimina su cuenta.
4. Conservar el espacio archivado mientras exista la membresía de la otra
   persona, aunque esté en `'removed'`.

## Decisión

- **Opción 2** (migración `21_account_deletion_shared_space_fk.sql`): una
  regla de aviso y un presupuesto son ajustes del espacio, no contenido de
  autoría, y borrarlos cambiaría el comportamiento del espacio para quien se
  queda. Se alinean con la decisión ya tomada en ADR-066 para movimientos y
  categorías: el dato sobrevive y pierde la autoría.
- **Opción 4:** el bucle pasa a cubrir dos casos: (a) el usuario sigue activo
  y no queda ninguna otra persona activa, y (b) el usuario ya no está activo
  y no existe ninguna otra membresía en absoluto. (b) hace el RPC idempotente
  ante reintentos sin tocar nunca un espacio que fue de dos. Un espacio
  Juntos disuelto conserva la membresía `'removed'` de la pareja, así que cae
  fuera de (b) y solo pierde la autoría.
- `request_account_deletion()` borra además la fila de `login_attempts` del
  email del usuario, que ninguna FK alcanza.
- `supabaseAccountDeletionGateway` lee el cuerpo del `FunctionsHttpError`
  (`error.context.json()`), porque `functions.invoke` resuelve cualquier
  no-2xx con el mensaje genérico "Edge Function returned a non-2xx status
  code" y `delete-account` devuelve la causa real en `{ error }`.
  `DataRightsScreen` la muestra como texto secundario bajo el mensaje amable.

## Consecuencias positivas

- La baja de cuenta funciona para el caso mayoritario a partir de ahora
  (cualquiera que haya compartido un espacio), no solo para usuarios que
  nunca salieron de su espacio personal.
- Un intento fallido deja de convertir la cuenta en un residuo permanente:
  el reintento termina la limpieza.

## Consecuencias negativas

- Sigue en pie la limitación de ADR-066: si `spaces.created_by` queda en
  `null`, `spaces_update_owner` deja de admitir cambios sobre ese espacio
  hasta que se diseñe una transferencia de propiedad.
- Los espacios Juntos disueltos siguen sin tener a nadie que los limpie
  mientras ambas membresías `'removed'` existan; son invisibles para la app
  pero ocupan sitio. Pendiente de una política de retención explícita.

## Riesgos

- La migración 21 debe aplicarse al proyecto Supabase antes de que la baja de
  cuenta vuelva a funcionar; el arreglo del cliente por sí solo únicamente
  hace visible el error.
- Los usuarios que ya intentaron darse de baja y fallaron quedaron con todas
  sus membresías en `'removed'`: en la app aparecerán sin espacios. Deben
  reintentar la eliminación después de aplicar la migración.

## Validación

- `npx tsc --noEmit` sin errores.
- `npx jest src/features/legal` en verde.
- `supabase/tests/account_deletion.test.sql` amplía a 17 aserciones (FK
  `confdeltype = 'n'` y nulabilidad de las dos columnas nuevas, más la
  limpieza de `login_attempts`). Pendiente de ejecutar con `supabase test db`
  contra una instancia real.

---

# ADR-078 — Un espacio juntos no existe hasta que la otra persona acepta

**Estado:** Aceptada

## Contexto

`create_couple_space()` dejaba el espacio plenamente operativo desde el primer
segundo, mucho antes de que existiera una segunda persona. Un espacio juntos
de una sola persona no es un espacio: quien invitaba podía registrar
movimientos "compartidos" que nadie más veía, el cupo de "un espacio juntos
activo por usuario" (ADR-068) quedaba consumido por una invitación que quizá
nunca se aceptaba, y al entrar al espacio se encontraba un Inicio vacío sin
ninguna explicación de qué faltaba.

## Opciones consideradas

1. No crear ninguna fila en `spaces` hasta la aceptación, guardando la
   invitación en una tabla aparte sin `space_id`.
2. Crear el espacio pero marcarlo pendiente con una marca temporal
   (`spaces.activated_at`), igual que `archived_at` marca el final.
3. Añadir un `spaces.status` con valores `pending`/`active`/`archived`.
4. Bloquear solo Inicio, dejando el resto de pestañas operativas sobre el
   espacio pendiente.

## Decisión

- **Opción 2** (migración `22_couple_space_pending_until_accepted.sql`):
  `space_invitations.space_id` es `not null` y toda la maquinaria de
  invitación (RLS por `is_active_space_member`, un pendiente por espacio,
  `dissolve_couple_space`) cuelga del espacio. La opción 1 obligaba a
  reescribir esa capa entera para un cambio que es de ciclo de vida, no de
  modelo. `activated_at` es exactamente el mismo tipo de señal que
  `archived_at`, así que la opción 3 habría introducido un vocabulario
  paralelo para algo que el esquema ya sabe expresar.
- La columna se añade con `default now()`, así que todo espacio existente y
  todo espacio que creen `ensure_personal_space()` o `migrate_guest_data()`
  nace activado sin tocar esas funciones. Solo `create_couple_space()` inserta
  null a propósito.
- El backfill marca pendientes los espacios juntos con menos de dos miembros
  activos **y sin ninguna invitación aceptada en su historial**: un espacio
  donde la pareja sí entró y después se dio de baja tiene historia compartida
  real y debe seguir activado.
- **Cancelar es borrar, no archivar:** sobre un espacio pendiente
  `dissolve_couple_space()` lo elimina entero. No hay nada que preservar, y
  archivarlo habría creado otro espacio huérfano invisible de los que ADR-077
  ya dejó pendientes de política de retención.
- **Contra la opción 4:** `isAwaitingPartnerSpace()` (`features/spaces/types`)
  es el único predicado, y `MainTabsNavigator` lo usa tanto para cambiar
  Inicio como para pausar el sondeo de 15 s, la suscripción de Realtime y
  `publishCoupleSpaceChanges`. Dejar la sincronización viva contra un espacio
  que nadie más puede leer solo generaba tráfico inútil.
- **UI:** `AwaitingPartnerScreen` (`features/spaces/screens/`) reutiliza
  `Screen`, `Text`, `ModalPrimaryAction` y los tokens de tema, con el mismo
  patrón de panel centrado (icono circular + encabezado + cuerpo) que ya usa
  el estado de éxito de `InvitePartnerScreen`. Nombra a quien fue invitado
  leyendo `space_invitations` directamente —la política
  `space_invitations_select_member` ya permite `invited_by = auth.uid()`, así
  que no hizo falta un RPC nuevo, solo `getOutgoingInvitation()` en el gateway
  existente— y ofrece comprobar si ya aceptaron, cambiar la invitación o
  cancelar el espacio. `SpaceSideMenu` añade "Esperando a que acepten" bajo el
  nombre del espacio.

## Consecuencias positivas

- Desaparece la categoría entera de "espacio compartido que nunca se
  compartió": o hay dos personas, o hay una invitación con su propia pantalla
  que explica qué falta y cómo resolverlo.
- Cancelar una invitación deja la base de datos exactamente como estaba.

## Consecuencias negativas

- El cupo de un espacio juntos por usuario se consume desde que se envía la
  invitación, no desde que se acepta. Es deliberado (evita acumular
  invitaciones abiertas), pero obliga a cancelar el espacio pendiente para
  invitar a otra persona; por eso la pantalla de espera ofrece "Cambiar
  invitación" sin cancelar nada.
- `sync_couple_space_data()` no comprueba `activated_at`: el bloqueo vive solo
  en el cliente. Un cliente antiguo aún podría subir datos a un espacio
  pendiente. No es una fuga (esos datos son suyos y los vería la pareja al
  entrar), y añadir la comprobación obligaba a duplicar las ~200 líneas de esa
  función en esta migración.

## Riesgos

- La migración 22 debe aplicarse antes de distribuir esta versión. Sin ella la
  consulta de `useSpaces` devuelve `activated_at` indefinido, que se lee como
  "no pendiente": la app se comporta exactamente como hasta ahora, que es el
  modo de fallo correcto.

## Validación

- `npx tsc --noEmit` sin errores; `npx eslint` y `npx prettier --check`
  limpios sobre lo tocado.
- `npx jest src/features/spaces src/navigation` en verde (47 pruebas),
  incluidas las nuevas de `AwaitingPartnerScreen` y las dos de `useSpaces`
  sobre la transición pendiente → activo.
- `supabase/tests/space_invitations.test.sql` amplía a 24 aserciones.
  Pendiente de ejecutar con `supabase test db` contra una instancia real.
- Pendiente: prueba manual con dos cuentas (invitar, comprobar la pantalla de
  espera, aceptar desde la otra app y ver Inicio normal).

---

# ADR-079 — Imports de librerías de calendario: phosphor público, calendars encapsulado

**Estado:** Aceptada

## Contexto

La regla `no-restricted-imports` de `eslint.config.js` bloqueaba las rutas
`phosphor-react-native/src/**` y `react-native-calendars/src/**` asumiendo que
eran internas y frágiles. Al revisar los manifiestos y puntos de entrada de
ambos paquetes se comprobó que la premisa era incorrecta.

## Decisión

- **phosphor-react-native:** `package.json` declara `"./src/icons/*"` en su
  campo `exports` con condición `react-native`. Es API pública pensada para
  importar un icono sin arrastrar el catálogo completo del raíz, cuya
  reexportación puede impedir el tree-shaking en Metro (el propio paquete
  recomienda imports individuales en ese escenario). Los imports `phosphor-react-native/src/icons/*` se conservan y no
  se restringen.
- **react-native-calendars:** publica `main: src/index.ts` (envía fuente) y su
  raíz no reexporta `MarkedDates` ni `DayProps`. Los tipos se derivan del
  contrato público (`CalendarProps` y `DateData`, importados del raíz) y se
  encapsulan en el wrapper `AppCalendar`, que exporta `MarkedDates` para las
  features.

## Consecuencias positivas

- Las features dejan de conocer `react-native-calendars`: consumen `MarkedDates`
  desde `AppCalendar`.
- Se conserva una guarda útil: `no-restricted-imports` sigue bloqueando
  `react-native-calendars/src/**`, forzando el paso por el wrapper.

## Consecuencias negativas

- La derivación traslada la fragilidad, no la elimina: ahora dependemos de que
  `CalendarProps` siga extendiendo `DayProps` y declare `markedDates`. Igual que
  antes, cualquier ruptura se detecta en typecheck, nunca en runtime, así que el
  Gate 1 la caza.

## Validación

- `npm run typecheck` sin errores ni casts (`as`).
- `npm run lint` sin warnings.

---

# ADR-080 — Cuentas como segundo eje de clasificación, con saldo y moneda propia

**Estado:** Aceptada

## Contexto

Un movimiento solo podía organizarse por categoría (`transactions.category_id`,
obligatorio). No existía forma de registrar desde qué medio de pago salió o
entró el dinero, ni de saber cuánto queda en cada uno. Era la última función
grande pendiente del producto.

## Opciones consideradas

1. La cuenta como simple etiqueta: filtros y totales, sin saldo propio.
2. La cuenta con saldo: saldo inicial más ingresos menos gastos asignados.
3. La opción 2 más transferencias entre cuentas, como tercer tipo de
   movimiento que no cuenta como ingreso ni gasto.

## Decisión

Se adopta la opción 2. La 3 queda fuera: exigiría un tercer tipo de movimiento
y revisar balances, Inicio, Actividad, presupuestos e importación.

- **Nombre.** El dominio se llama `MoneyAccount` / `money_accounts`, no
  `Account`: en `src/features/sync/` «account» ya significa la cuenta de
  usuario de Supabase (`supabaseRemoteAccountGateway`, `restoreRemoteAccount`,
  `local_sync_account`), que es justo donde más código nuevo hay. En la
  interfaz el usuario lee «cuenta».
- **Propiedad.** La cuenta pertenece al espacio, como la categoría: ambos
  miembros la ven y solo su autor la edita o archiva. Reutiliza el modelo de
  espacios, RLS y sincronización ya existentes.
- **Moneda.** Cada cuenta tiene una moneda y elegirla fija la del movimiento,
  así que un saldo nunca mezcla divisas —el problema que ADR-060 dejó
  explícitamente pendiente para los agregados—. La moneda solo puede cambiarse
  mientras la cuenta no tenga movimientos ni series asignados.
- **Saldo.** Saldo inicial más ingresos menos gastos, contando hasta el último
  día del mes local actual: la misma regla de horizonte que ya rige balance,
  Inicio y presupuestos (ADR-056), para que ningún número se contradiga entre
  pantallas. El saldo inicial admite negativos y una cuenta de crédito se
  calcula igual que las demás; el tipo solo cambia aspecto e icono.
- **Opcional.** El campo llega vacío y sin preselección. Los movimientos
  anteriores se quedan sin cuenta y nada cambia para quien no las use.
- **Superficies.** Sección propia en Actividad, bajo categorías, con carrusel
  de tarjetas y lista compacta; en Inicio, solo las tarjetas y un `Ver más`
  que lleva a esa sección. Creación desde el menú rápido, desde el estado
  vacío y desde el propio selector del modal de movimiento.
- **Iconos.** Catálogo cerrado propio (`moneyAccountIconNames`) en vez de
  reutilizar el de categorías: los iconos de categoría describen en qué se
  gasta el dinero y los de cuenta dónde está guardado. Los 18 colores sí se
  comparten.

## Consecuencias positivas

- Cada tarjeta es monomoneda, así que las cuentas muestran importes correctos
  sin esperar al desglose entre divisas pendiente desde ADR-060.
- El modal de movimiento no gana fricción: el botón de cuenta solo aparece si
  el espacio ya tiene alguna.
- El circuito compartido no cambia de forma: cuentas, categorías, series y
  movimientos viajan en el mismo RPC y por el mismo estado de sincronización.

## Consecuencias negativas

- La importación bancaria no asigna cuenta todavía: las filas importadas nacen
  sin ella.
- No hay total agregado de todas las cuentas, porque sumaría divisas
  distintas.
- Al copiar un movimiento a otro espacio se descarta su cuenta, ya que la
  cuenta pertenece al espacio de origen.

## Riesgos

- En SQLite la columna `money_account_id` solo tiene una foránea de una
  columna: la de dos columnas no cabe en `ALTER TABLE ADD COLUMN` y
  reconstruir `transactions` reescribiría la foránea de
  `transaction_reminders` (el procedimiento seguro de SQLite exige
  `PRAGMA foreign_keys = OFF` fuera de la transacción, que el migrador no
  hace). La guarda vive en `assertMoneyAccountAssignment`, y Postgres —la
  autoridad real de permisos— sí declara la foránea compuesta.
- `sync_couple_space_data` y `migrate_guest_data` cambian de firma; ambas
  migraciones retiran la anterior con `drop function` para que PostgREST no
  tenga dos candidatas.

## Validación

- Pruebas del repositorio local (identidad, saldo negativo, moneda no
  reconocida, rechazo de cuenta de otro espacio y de moneda distinta a la de
  su cuenta, herencia en la materialización de series).
- Pruebas del cálculo de saldo (horizonte mensual, divisa distinta ignorada,
  saldo negativo) y de la validación de nombre por espacio.
- Pruebas de interfaz: modal de movimiento (selector oculto sin cuentas,
  moneda forzada, envío con cuenta, precarga al editar), modal de creación
  (tipo, moneda bloqueada, saldo negativo, nombre duplicado), detalle de
  cuenta, e Inicio y Actividad con sus secciones.
- Pruebas de sincronización (subida, snapshot remoto, restauración) y
  `supabase/tests/money_accounts.test.sql`.
- `npm run validate`.

## Corrección — tres tipos de cuenta y saldo inicial sin control de signo

La primera entrega ofrecía cinco tipos (`cash`, `bank`, `debit`, `credit`,
`savings`) y un botón `+/−` junto al saldo inicial. Ambas cosas se reducen:

- Quedan tres tipos: efectivo, cuenta bancaria y tarjeta. Separar débito de
  crédito y de ahorro no cambia ningún cálculo mientras no existan límite de
  crédito ni transferencias, y obliga a elegir entre opciones que para el
  usuario son la misma cosa. El nombre y el icono siguen siendo libres en los
  tres, que es donde el usuario sí distingue una cuenta de otra.
- El saldo inicial se escribe tal cual: quien arrastra una deuda antepone un
  signo menos. Un control dedicado ocupaba sitio permanente para un caso poco
  frecuente; la decisión es esperar al uso real antes de darle interfaz propia.

`parseAmountMinor` no servía para leer ese importe: separa la parte entera de
los céntimos y los suma, así que para `-450,50` devolvía `-44950` en vez de
`-45050`. `parseSignedAmountMinor` extrae el signo antes de medir la magnitud
y lo aplica al final, y normaliza el `-0` que devuelve un signo suelto.

En Android el teclado `numbers-and-punctuation` no existe y el numérico no
ofrece el signo, así que allí el campo usa el teclado normal.

Las restricciones anteriores no se editan en su migración: la versión local 22
y la migración 31 reconstruyen el CHECK y reasignan las filas existentes
—débito y crédito a tarjeta, ahorro a cuenta bancaria—.

## Corrección — la foránea que dejó colgando la reconstrucción de la versión 22

Reconstruir `money_accounts` con `ALTER TABLE ... RENAME` hizo que SQLite
reescribiera las referencias de `transactions` y
`recurring_transaction_series` hacia `money_accounts_v20`, la tabla temporal
que se borraba a continuación. Asignar una cuenta a un movimiento fallaba con
«no such table: main.money_accounts_v20». Es exactamente la trampa que este
ADR ya documentaba para `transactions`, repetida sobre la tabla de cuentas.

La versión local 23 lo repara con dos renombrados y ningún copiado: el primero
deja la tabla con el nombre que la referencia rota espera y el segundo la
devuelve a su nombre, reescribiéndola de paso. Es idempotente y no toca las
tablas grandes. Se verificó contra sqlite 3.51 reproduciendo la escalera
completa: `PRAGMA foreign_key_check` queda limpio y la foránea vuelve a
rechazar una cuenta inexistente.

Las tres capturas de error de las cuentas registran ahora la causa real con
`console.error` antes de mostrar el aviso genérico: sin eso, un fallo de
esquema era indistinguible de uno de validación.

## Corrección — dónde se crea una cuenta y cómo se asigna a un movimiento

Crear una cuenta sale del menú del botón flotante: ese botón sirve para
registrar dinero, no para configurarlo. La creación vive donde se ven las
cuentas, en Actividad: el estado vacío cuando no hay ninguna y `Añadir cuenta`
bajo la lista cuando ya existen.

El detalle del movimiento gana una fila de cuenta permanente —dice «Sin
cuenta» cuando no la tiene— que abre el selector y permite asignarla o
retirarla sin reabrir el formulario, del mismo modo que la fila de categoría
lleva a su detalle. Solo se ofrecen cuentas en la moneda del movimiento:
`updateLocalTransactionMoneyAccount` no cambia el importe ni la moneda, así
que aceptar otra divisa rompería el saldo de la cuenta.

## Corrección — varias monedas por cuenta, tres tipos en una fila y saldo opcional

Un banco puede guardar divisas distintas dentro de la misma cuenta, así que la
moneda deja de ser un campo de la cuenta y pasa a una tabla hija
(`money_account_balances` local en la versión 24, migración 32 en Supabase),
con el patrón que `category_budgets` ya usaba para los presupuestos. Cada
moneda lleva su propio saldo y **nunca se suman entre sí**: un total mezclando
divisas no significaría nada mientras no exista conversión, que sigue fuera de
alcance desde ADR-060.

- `money_accounts.currency` se conserva como moneda principal: encabeza la
  tarjeta y es la que se propone al registrar un movimiento.
  `opening_balance_minor` deja de leerse —el saldo vive en la tabla hija,
  incluida la principal— para no repetir el problema de dos fuentes del mismo
  dato que ya arrastra `categories.budget_minor`.
- Un movimiento solo puede asignarse a una cuenta que guarde su moneda. Al
  elegir cuenta en el modal, si el movimiento ya está en una de sus divisas se
  conserva; si no, se adopta la principal.
- Las monedas se reescriben enteras en cada sincronización, en vez de calcular
  altas y bajas: una divisa retirada en el otro dispositivo tiene que
  desaparecer, y un cálculo incremental dejaría huérfana la que ya no está.
- Los tres tipos caben en una sola fila con la variante `compact` de
  `SelectableOption`: ocupan mejor el ancho y se comparan de un vistazo.
- El saldo inicial se titula «Saldo inicial (opcional)»: nadie tiene que
  inventarse una cifra para crear una cuenta.

## Corrección — instalación marcada como v20 sin el esquema de cuentas

Una build de desarrollo dejó una instalación con `PRAGMA user_version = 20`
sin llegar a crear `money_accounts`, sus saldos ni las columnas opcionales de
movimientos y series. La siguiente escalera asumía erróneamente que el número
de versión demostraba la presencia del esquema, de modo que cualquier acceso
a SQLite fallaba y afectaba también a perfiles, sincronización y guardados no
relacionados con cuentas.

La versión local 25 comprueba esas piezas antes de avanzar. Si faltan, las
crea en la misma transacción, conserva todas las filas existentes con cuenta
nula y después reutiliza las migraciones 21–24 para terminar en el esquema
actual. Una migración inesperada ya no borra ni recrea la base automática e
indistintamente: los datos locales son la fuente de verdad del invitado y
deben quedar disponibles para reparación o exportación.

La normalización de los tipos históricos reconstruye el CHECK solo durante una
transacción controlada: antes se desactivan temporalmente las foráneas y se
activa `legacy_alter_table`, evitando que SQLite apunte movimientos o series a
la tabla temporal. `PRAGMA foreign_key_check` debe quedar vacío antes de
confirmar y los PRAGMA se restauran después.

## Pendiente

Transferencias entre cuentas, límite de crédito y fechas de corte, filtro por
cuenta en Actividad, asignar cuenta a un extracto importado y límites de plan
sobre el número de cuentas.

---

# ADR-082 — El detalle de movimiento edita sin pasar por el formulario

**Estado:** Aceptada

## Contexto

Cambiar la cuenta, la fecha o la recurrencia de un movimiento cerraba el
detalle, abría el formulario completo precargado en ese paso y, al guardar,
dejaba al usuario sin ningún modal abierto. Quien solo quería corregir una
fecha atravesaba el editor entero y perdía de vista el movimiento.

## Decisión

Categoría, cuenta, fecha y recurrencia abren **solo** su selector, apilado sobre
el detalle (`stackBehavior="push"`). Al guardar o cerrar se vuelve al mismo
movimiento, ya actualizado. El formulario completo queda para lo que de verdad
lo necesita: el título y el importe.

La categoría es el caso aparte: su selector arrastra la creación de categorías y
sus plantillas, así que lo sigue poseyendo la navegación y no se apila desde el
detalle. Lo que cambia es el destino de la selección —un `CategoryCreationContext`
nuevo, `transaction-detail`— en lugar de abrir el formulario.

- Los selectores son **los mismos componentes** que usa el formulario
  (`TransactionDatePickerModal`, `TransactionMoneyAccountPickerModal`,
  `TransactionRecurrencePickerModal`); solo cambia quién recibe la selección.
  `TransactionDetailQuickEditors` los agrupa para no engordar el detalle.
- El guardado **no** usa un UPDATE por campo. `applyTransactionQuickEdit`
  traduce el cambio al borrador completo y lo entrega a
  `updateLocalTransaction`, el mismo camino del formulario: series recurrentes,
  ocurrencias proyectadas y autoría se resuelven en un solo sitio. Un
  `UPDATE money_account_id` suelto ya existía y era exactamente la segunda regla
  que se desincroniza.
- `useTransactionEditing` extrae de `MainTabsNavigator` ese guardado compartido.
  La extracción era además obligatoria: el navegador está congelado en 1372
  líneas y el cambio lo dejaba en 1387. Ahora cierra en 1338.
- Si la ocurrencia era proyectada, `updateLocalTransaction` la materializa y le
  cambia el id; el detalle se reapunta al id devuelto en vez de cerrarse solo.
- `TransactionQuickEdit` es una unión discriminada y no un objeto de campos
  opcionales: retirar la cuenta es `moneyAccountId: undefined`, que en un objeto
  parcial no se distingue de «no toques la cuenta».

## Editar una recurrencia corta hacia adelante, no hacia atrás

Cambiar la recurrencia sustituye las repeticiones **posteriores** a la fecha del
movimiento editado y conserva las anteriores: ya ocurrieron y forman parte de
saldos y totales que el usuario ya ha visto.

Para una serie automática (`recurrence_series_id`) esa regla ya existía —el
archivado se acotaba con `occurred_on > ?`—, pero **no** para una lista de fechas
personalizada (`recurrence_group_id`), que no se tocaba en absoluto: editar una
fecha del grupo dejaba vivas todas las demás, también las futuras.

`archiveLaterOccurrences` unifica los dos casos en un solo sitio y se aplica en
las cuatro transiciones —a personalizada, a automática, a única y entre
automáticas—. Nunca alcanza al movimiento editado: cuando se ejecuta, o su fecha
todavía es la original y por tanto no es posterior a sí misma, o ya se le ha
asignado otro grupo.

## Consecuencias negativas

- Si una fecha de la nueva recurrencia coincide con una ocurrencia anterior que
  se conserva, quedan dos movimientos ese día. Deduplicar exigiría decidir cuál
  gana; queda fuera de esta entrega.

## Validación

`TransactionDetailModal.test.tsx` cubre que categoría, cuenta y recurrencia
abren su selector sin llamar a `onEdit`, y que guardar emite el cambio y cierra
el selector. `transactionQuickEdit.test.ts` cubre la construcción del borrador,
incluida la retirada de cuenta y el descarte de fechas personalizadas.
`localTransactionRepository.test.ts` cubre que un grupo personalizado pierde sus
fechas posteriores —y solo esas— al cambiar de recurrencia y al dejar de
repetirse, y que un movimiento que no repetía no archiva nada.

---

# ADR-081 — Un solo donut para categorías y cuentas

**Estado:** Aceptada

## Contexto

Actividad necesitaba en `Cuentas` el mismo reparto que ya ofrecía en
`Categorías`: qué cuenta genera más ingresos y de cuál salen más gastos, con
los mismos badges de leyenda y la misma navegación por meses.

`CategoryDonutChart` no era un componente de gráfica: era una gráfica más su
adaptador de datos de categoría, ambos en el mismo archivo de 325 líneas
(congelado en `frozenLineDebt` a 462).

## Opciones consideradas

1. **Duplicar el componente** cambiando el origen de los datos y los textos. Es
   exactamente lo que prohíbe `PROJECT_RULES.md` §4.1, y dejaría dos copias de
   la geometría, las animaciones y la alternativa textual accesible.
2. **Parametrizar `CategoryDonutChart`** con un modo «cuenta». El archivo
   congelado crecería y seguiría viviendo en `features/activity` mientras sirve
   a dos dominios.
3. **Extraer la gráfica** a `components/ui/Charts/DonutBreakdownChart.tsx` y
   dejar dos adaptadores finos encima.

## Decisión

La tercera. `DonutBreakdownChart` recibe porciones ya calculadas
(`{id, label, color, valueMinor}`) y no sabe de dónde salen; descarta los ceros,
ordena de mayor a menor y reparte. Los dos adaptadores —`CategoryDonutChart` y
`AccountDonutChart`, ambos en `features/activity/components`— solo traducen su
dominio a porciones.

- La gráfica es **controlada**: el mes y el modo viven en cada adaptador y
  llegan como `monthLabel`, `isCurrentMonth` y `mode`. Así `components/ui` no
  importa nada de `features/`, y cada adaptador conserva su `useMemo` sobre el
  mes elegido en lugar de recalcular en cada render de Actividad.
- `idPrefix` prefija los testID (`category-donut-chart`, `account-donut-chart`):
  las pruebas existentes de Actividad siguieron pasando sin tocarlas, que es la
  evidencia de que la extracción no cambió comportamiento.
- `summarizeMoneyAccountTotals` reparte por cuenta **una sola moneda**, la misma
  que el selector de movimientos: nunca suma divisas (ADR-060, ADR-080). Un
  movimiento sin cuenta es válido y no afecta a ningún saldo, así que tampoco
  pinta porción.
- No hay desempate de color entre cuentas: dos cuentas del mismo tipo comparten
  `colorToken` por defecto y por tanto color de arco. El nombre en el badge las
  distingue; inventar tonos derivados añadiría código para un problema que el
  usuario resuelve cambiando el color de la cuenta.

## Consecuencias positivas

- `CategoryDonutChart` baja de 325 a 73 líneas no vacías y sale de
  `frozenLineDebt`. `DonutBreakdownChart` queda en 321, bajo el umbral general.
- La tercera gráfica de reparto que haga falta ya no cuesta una copia.

## Consecuencias negativas

- Los dos adaptadores repiten el par de `useState` del mes y el modo. Es menos
  código que un hook compartido y mantiene visible dónde vive el estado.

## Validación

`src/features/activity/components/AccountDonutChart.test.tsx` cubre el reparto
por cuenta con dos divisas y un movimiento sin cuenta, el cambio a ingresos, la
apertura del detalle desde un badge y el retroceso de mes.

---

# ADR-083 — Salida individual de espacios de pareja

**Estado:** Aceptada

## Contexto

ADR-068 implementó «Eliminar espacio juntos» como una disolución simétrica:
una persona archivaba el espacio y retiraba también a la otra. Esa acción no
representaba una salida individual y hacía imposible que el espacio continuara
con quien quería quedarse o que quien salió volviera más tarde.

## Decisión

Se elimina `dissolve_couple_space` y la interfaz pasa a ofrecer únicamente
«Salir del espacio de pareja». `leave_couple_space` cambia a `'left'` solo la
membresía de quien llama. Mientras quede un miembro activo, el espacio se
mantiene sin archivar y una invitación nueva reactiva la fila de quien salió.

Si esa salida deja cero miembros activos, el RPC elimina el espacio y todos sus
datos dependientes en la misma transacción. Bloquear la fila de `spaces` antes
de modificar la membresía serializa dos salidas simultáneas y garantiza que la
última complete la limpieza.

## Consecuencias

- Una persona no puede sacar a la otra del espacio desde la interfaz ni por el
  RPC de salida.
- La última salida borra los datos compartidos porque ya no hay ningún miembro
  activo que pueda conservarlos o acceder a ellos.
- El reingreso requiere una invitación nueva emitida por quien permaneció;
  reutilizar una membresía existente evita violar `unique (space_id, user_id)`.
- Los espacios archivados por la antigua disolución no se reabren con esta
  migración: siguen siendo historial legado fuera del nuevo flujo.

## Validación

`space_invitations.test.sql` comprueba la retirada del RPC simétrico, los
permisos del RPC de salida, el bloqueo para concurrencia, la limpieza de cuentas
de dinero y la reactivación de membresías por ambos tipos de invitación. Las
suites de gateway, espacios y Ajustes cubren la llamada remota, la retirada del
catálogo local y el texto/confirmación de salida.

---

# ADR-084 — Los espacios compartidos no son accesibles sin sesión

**Estado:** Aceptada

## Contexto

El cierre de sesión eliminaba correctamente el token de Supabase, pero el
catálogo de espacios de AsyncStorage y la caché financiera de SQLite permanecían
en el dispositivo. Como `useSpaces` devolvía el catálogo sin atender a la
sesión, quien continuaba como invitado podía mantener seleccionado el espacio
Juntos y ver sus movimientos ya materializados localmente.

## Opciones consideradas

1. Borrar el catálogo y todas las filas SQLite del espacio compartido al cerrar
   sesión.
2. Conservar la caché local, pero proyectar el catálogo accesible según la
   sesión y excluir todos los espacios `couple` cuando no exista una.

## Decisión

Se adopta la opción 2. `useSpaces` conserva internamente el catálogo autenticado
para no destruir cambios offline, pero durante el propio render devuelve una
proyección sin espacios de pareja cuando `userId` es nulo. Si el espacio activo
era compartido, la proyección cae a Personal. El cálculo síncrono evita mostrar
datos del contexto anterior durante un frame mientras se procesa el cambio de
sesión.

Las consultas remotas continúan protegidas por RLS y no se realizan sin sesión.
Al autenticarse de nuevo, el refresco existente vuelve a reconciliar el espacio
de pareja contra Supabase y RLS valida la membresía en cada operación remota.

## Consecuencias positivas

- Un invitado no puede seleccionar ni navegar a un espacio compartido cacheado.
- Los movimientos compartidos pendientes no se borran por cerrar sesión.
- El cambio no requiere una migración destructiva de SQLite ni una dependencia
  nueva y se aplica igual en iOS y Android.

## Consecuencias negativas

- La caché compartida continúa ocupando espacio local después de cerrar sesión;
  queda inaccesible desde la interfaz, no eliminada físicamente.
- La política general de cifrado y separación física de cachés entre varias
  cuentas sigue perteneciendo a `DATABASE.md` §24 y no se redefine aquí.

## Validación

`useSpaces.test.ts` reproduce la transición con Juntos activo: la prueba falla
antes de la corrección porque el espacio sigue expuesto y pasa después al
comprobar que solo Personal permanece accesible.

---

# ADR-085 — Invitaciones solo por correo con aviso push

**Estado:** Aceptada

## Contexto

El modal mezclaba dos destinos —correo dirigido y enlace manual— con bloques,
divisor, compartir y copiar. El producto exige ahora un único flujo: escribir
el correo de una cuenta existente y entregar la invitación dentro de Juntoss.
Además, abrir la app era hasta ahora la única forma de descubrirla.

## Opciones consideradas

1. Programar una notificación local desde quien invita. No puede crear un aviso
   en el dispositivo de otra persona y no funciona con la app receptora cerrada.
2. Enviar directamente a Expo desde el cliente. Expondría tokens o permitiría
   elegir destinatarios sin una validación de servidor confiable.
3. Persistir primero la invitación existente y pedir a una Edge Function
   autenticada que resuelva los dispositivos mediante `service_role` y envíe
   un push genérico con Expo Push Service.

## Decisión

Se adopta la opción 3:

- `InvitePartnerScreen` elimina generar, compartir y copiar enlaces. Conserva
  únicamente el correo y una acción de envío. Si el RPC responde
  `invitee_not_registered`, explica que la persona debe descargar Juntoss y
  crear su cuenta antes de reintentar.
- Cambiar el correo revoca cualquier invitación pendiente anterior de ese
  espacio; nunca quedan dos posibles parejas compitiendo por aceptar primero.
- `space_invitations` continúa siendo la fuente de verdad. El gateway crea la
  invitación antes de invocar `send-space-invitation-push`; un fallo de push no
  revierte una invitación válida ni cambia el éxito mostrado por la interfaz.
- `user_push_tokens` está cerrado a `anon` y `authenticated`. Dos RPC
  `SECURITY DEFINER` permiten a la sesión registrar o retirar únicamente su
  dispositivo, y `claim_space_invitation_push` solo puede ejecutarse con
  `service_role`.
- La Edge Function vuelve a validar por RLS que quien llama creó la invitación,
  la reclama una sola vez y nunca acepta un correo o token de destino desde el
  cliente.
- El payload bloqueado solo dice que existe una invitación. Tocar el push abre
  Inicio, donde `PendingInvitationBanner` consulta el servidor y ofrece la
  aceptación normal.
- Tras explicar el uso, la app solicita el permiso una vez por cuenta. Si ya
  estaba concedido, registra el token silenciosamente al iniciar sesión y al
  volver a primer plano. Antes de cerrar sesión intenta retirarlo.

## Consecuencias

- Una cuenta existente siempre conserva la invitación in-app, incluso si no
  concedió notificaciones, no tiene un dispositivo registrado o Expo/APNs/FCM
  están temporalmente indisponibles.
- El push remoto requiere development/production build, `projectId` de EAS y
  credenciales APNs/FCM. Expo Go en Android no lo soporta con la versión actual.
- Los RPC de enlace anteriores permanecen para que invitaciones históricas no
  se invaliden, pero esta versión no puede crear ni compartir enlaces.
- El envío procesa errores inmediatos `DeviceNotRegistered`; queda pendiente un
  proceso programado para consultar receipts diferidos y retirar tokens que se
  invaliden después de que Expo acepte el mensaje.

## Validación

`InvitePartnerScreen.test.tsx` demuestra que no existe acción de enlace, que el
correo se normaliza y que una cuenta inexistente recibe la instrucción nueva.
Las pruebas del gateway cubren que el push se solicita después del RPC y que su
indisponibilidad no borra la invitación. `invitationPushNotifications.test.ts`
cubre permiso, registro y retirada, y
`invitation_push_notifications.test.sql` verifica privilegios, RLS, funciones
y la FK de tokens. La prueba real de recepción requiere aplicar la migración,
desplegar la Edge Function y usar builds nativas en staging según
`docs/setup/PUSH_NOTIFICATIONS_SETUP.md`.

---

# ADR-086 — Alta atómica del espacio y su primera invitación

**Estado:** Aceptada

## Contexto

El modal creaba el espacio remoto al pasar de la introducción al campo de
correo. Si la persona cerraba sin enviar, `activated_at = null` hacía que el
cliente interpretara ese borrador como una invitación confirmada y mostrara
`AwaitingPartnerScreen` con el texto «Invitación enviada».

## Decisión

El paso introductorio y el campo de correo son estado local del modal. La
primera escritura ocurre únicamente al pulsar «Enviar invitación» mediante
`create_couple_space_invitation`: espacio, membresía de quien invita e
invitación se insertan en una sola transacción PostgreSQL. El cliente incorpora
el espacio al catálogo y activa la pantalla de espera solo después de validar
la respuesta completa del RPC. El intento de push continúa siendo posterior y
no forma parte de esa confirmación, porque la invitación in-app es la fuente de
verdad.

## Consecuencias

- Cerrar el modal antes de enviar no crea ni consume el cupo de espacio juntos.
- Un correo sin cuenta o un fallo de base de datos no deja espacios huérfanos.
- No existe una ventana entre crear el espacio y crear la invitación, ni aunque
  la app se cierre durante la operación.
- El catálogo selecciona el espacio pendiente, pero su navegador se reinicia en
  Inicio y deshabilita Actividad y Mapa hasta que `activated_at` deje de ser
  nulo tras la aceptación.
- Cambiar una invitación de un espacio ya pendiente continúa usando
  `create_space_invitation`; ese espacio sí tiene una invitación confirmada.

## Validación

Las pruebas del modal cubren el cierre sin escritura y el envío atómico. Las
pruebas de `useSpaces` exigen que el estado de espera se publique después del
resultado completo; las del gateway verifican un único RPC y que el push se
intenta después. `space_invitations.test.sql` comprueba existencia, permisos y
el cuerpo transaccional de la función.

---

## 5. Principio final

> Una decisión no documentada se convierte con el tiempo en una suposición.

Registrar el motivo evita que una persona o asistente deshaga una decisión válida por desconocer su contexto.
