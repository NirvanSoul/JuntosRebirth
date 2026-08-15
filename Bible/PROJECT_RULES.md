# PROJECT_RULES.md

## 1. Propósito

Este documento contiene las reglas obligatorias para cualquier persona o asistente de programación que modifique `juntoss`.

Debe leerse antes de comenzar una tarea.

Estas reglas existen para evitar componentes duplicados, implementaciones innecesarias desde cero, refactors no solicitados, dependencias mal evaluadas, cambios demasiado amplios, rupturas entre iOS y Android, lógica de negocio dispersa y documentación desactualizada.

---

## 2. Orden de autoridad

Cuando exista una contradicción, se aplica este orden:

1. Instrucción explícita y actual del responsable del proyecto.
2. `PROJECT_RULES.md`.
3. `PRODUCT.md`.
4. `ARCHITECTURE.md`.
5. `DATABASE.md`.
6. `ROADMAP.md`.
7. `DECISIONS.md`.
8. Instrucciones auxiliares dentro de `instructions/`.
9. Convenciones inferidas del código existente.

Una instrucción puntual no debe interpretarse como permiso para ignorar reglas no relacionadas.

---

## 3. Regla principal

> Antes de crear algo nuevo, comprobar si ya existe una solución interna o externa adecuada.

Orden obligatorio de evaluación:

1. Comprender el problema real.
2. Revisar el código relacionado.
3. Buscar componentes, hooks, servicios, utilidades o patrones existentes.
4. Evaluar si lo existente puede reutilizarse.
5. Evaluar si puede extenderse sin romper su responsabilidad.
6. Investigar librerías cuando el problema lo justifique.
7. Implementar desde cero únicamente cuando las opciones anteriores no sean adecuadas.
8. Explicar la decisión cuando tenga impacto arquitectónico.

---

## 4. Clasificación de tareas

Antes de modificar código, clasificar la tarea como pequeña, mediana o grande.

### 4.1 Tarea pequeña

Ejemplos:

- Alinear un elemento.
- Cambiar un texto.
- Corregir un margen.
- Ajustar un tamaño.
- Sustituir un icono.
- Corregir un error localizado.
- Añadir una variante visual simple.

Proceso mínimo:

- Leer el archivo afectado.
- Revisar el componente o token aplicable.
- Hacer el cambio mínimo.
- No investigar librerías salvo que el problema resulte más complejo de lo esperado.
- No refactorizar zonas cercanas.
- Verificar que no se rompe la otra plataforma.

### 4.2 Tarea mediana

Ejemplos:

- Crear una pantalla.
- Añadir un filtro.
- Crear un modal específico.
- Añadir un flujo de edición.
- Incorporar una variante funcional reutilizable.
- Conectar una pantalla con un repositorio existente.

Proceso:

- Revisar documentación aplicable.
- Inspeccionar la feature completa.
- Buscar componentes y patrones reutilizables.
- Identificar estados y errores.
- Evaluar una librería si la interacción es compleja.
- Implementar pruebas proporcionales.
- Verificar iOS y Android.
- Actualizar documentación si cambia el comportamiento.

### 4.3 Tarea grande

Ejemplos:

- Cambiar navegación.
- Cambiar persistencia.
- Crear sincronización.
- Modificar autenticación.
- Añadir espacios compartidos.
- Diseñar permisos.
- Modificar esquema SQL.
- Introducir una librería transversal.
- Cambiar el sistema de diseño.

Proceso:

- Leer toda la documentación relacionada.
- Identificar decisiones previas.
- Investigar alternativas.
- Comparar al menos dos enfoques razonables cuando existan.
- Describir riesgos.
- Diseñar migración.
- Dividir en entregas pequeñas.
- Registrar la decisión.
- Añadir pruebas de integración.
- No ejecutar una reestructuración completa en un único cambio.

---

## 5. Alcance estricto

El trabajo debe limitarse a lo solicitado.

No permitido:

- Refactorizar archivos cercanos porque “se ven mal”.
- Renombrar carpetas no relacionadas.
- Cambiar librerías sin necesidad.
- Reescribir componentes completos para corregir un detalle.
- Modificar estilos globales para resolver una pantalla.
- Añadir funcionalidades no solicitadas.
- Eliminar código que parece no usarse sin confirmar.
- Cambiar contratos públicos silenciosamente.

Cuando se detecte una mejora fuera de alcance:

1. No modificarla.
2. Mencionarla en el resumen.
3. Proponer una tarea separada.
4. Explicar brevemente el riesgo o beneficio.

---

## 6. Reutilización de componentes

Antes de crear un componente:

1. Buscar por nombre.
2. Buscar por comportamiento.
3. Buscar por apariencia.
4. Revisar `src/components/`.
5. Revisar los componentes de la feature.
6. Revisar variantes de componentes existentes.

Ejemplo incorrecto:

- Crear `ModalFooterButtons`.
- Crear después `BottomModalActions`.
- Crear después `BackContinueButtons`.

Si todos representan acciones inferiores de un modal, debe existir una primitiva configurable.

Ejemplo preferido:

```tsx
<ModalActions
  secondaryAction={{ label: "Atrás", onPress: handleBack }}
  primaryAction={{ label: "Continuar", onPress: handleContinue }}
/>
```

No debe crearse una API excesivamente genérica antes de conocer variantes reales.

---

## 7. Extender frente a duplicar

Extender un componente cuando:

- La variante conserva la misma responsabilidad.
- El cambio puede expresarse con una prop clara.
- La API sigue siendo comprensible.
- La variante será reutilizada.

Crear un componente nuevo cuando:

- La responsabilidad es diferente.
- La lógica diverge sustancialmente.
- Extenderlo produciría demasiadas props condicionales.
- El nombre original dejaría de describirlo.

No utilizar props ambiguas como:

- `special`
- `custom`
- `isNew`
- `mode2`
- `differentStyle`

Preferir nombres semánticos:

- `variant="primary"`
- `placement="modalFooter"`
- `size="compact"`
- `destructive`
- `loading`

---

## 8. Investigación de librerías

### 8.1 Cuándo investigar

La investigación externa es obligatoria o recomendable cuando la tarea incluye:

- Gestos complejos.
- Bottom sheets.
- Modales interactivos.
- Scroll o teclado difícil de coordinar.
- Animaciones avanzadas.
- Gráficas.
- Calendarios.
- Selectores de fecha.
- Cifrado.
- Sincronización.
- Persistencia compleja.
- Accesibilidad especializada.
- Procesamiento de pagos.
- Funciones nativas.
- Problemas ya resueltos ampliamente por el ecosistema.

No es necesaria para cambios triviales y localizados.

### 8.2 Criterios de evaluación

Antes de instalar una librería, revisar:

- Mantenimiento reciente.
- Compatibilidad con la versión de React Native.
- Compatibilidad con iOS y Android.
- Compatibilidad con la arquitectura de compilación usada.
- Documentación.
- Tipos de TypeScript.
- Licencia.
- Tamaño e impacto.
- Dependencias transitivas.
- Problemas abiertos relevantes.
- Frecuencia de lanzamientos.
- Uso real en la comunidad.
- Accesibilidad.
- Calidad de la API.
- Posibilidad de eliminarla.
- Riesgo de quedar abandonada.

### 8.3 Resultado de la investigación

Para una decisión relevante, documentar:

- Problema.
- Opciones evaluadas.
- Opción recomendada.
- Razón.
- Riesgos.
- Alternativa si falla.
- Impacto en iOS.
- Impacto en Android.

### 8.4 Código copiado

No copiar código de GitHub sin:

- Verificar licencia.
- Registrar origen.
- Entender el código.
- Adaptarlo al estilo del proyecto.
- Añadir pruebas.
- Evaluar mantenimiento.

Preferir instalar una dependencia mantenida antes que copiar internamente cientos de líneas, salvo razón documentada.

---

## 9. Dependencias

No instalar una dependencia para resolver unas pocas líneas triviales.

No editar `node_modules`.

No añadir dos librerías que resuelvan el mismo problema sin una decisión explícita.

Toda dependencia importante debe:

- Tener propósito claro.
- Estar encapsulada cuando sea apropiado.
- Ser compatible con ambas plataformas.
- Incluir instrucciones de configuración.
- Contar con plan de retirada razonable.
- Añadirse al historial de decisiones cuando sea transversal.

---

## 10. Código específico de plataforma

Cada cambio visual o nativo debe considerar iOS y Android.

Reglas:

- No asumir que una API de iOS existe en Android.
- No ocultar una función en Android sin explicación.
- No añadir una condición de plataforma dispersa si puede encapsularse.
- Mantener la misma interfaz pública cuando existan archivos `.ios` y `.android`.
- Verificar safe areas, teclado, gestos y navegación en ambas plataformas.
- Proporcionar degradación visual adecuada.
- No sacrificar funcionalidad Android para lograr un efecto decorativo de iOS.

Cuando se implemente una experiencia visual avanzada específica de iOS, debe existir una alternativa coherente en Android.

---

## 11. Sistema de diseño

Obligatorio:

- Usar tokens de color.
- Usar escala de espaciado.
- Usar tipografías definidas.
- Usar radios y sombras del tema.
- Usar componentes base.
- Respetar estados disabled, pressed, loading y error.
- Considerar accesibilidad.
- Reutilizar animaciones definidas.

No permitido:

- Colores arbitrarios repetidos.
- Números mágicos sin contexto.
- Estilos casi idénticos duplicados.
- Crear un botón nuevo por cada pantalla.
- Implementar un modal completamente distinto sin necesidad.

### 11.1 Tipografía

Todo texto de la interfaz se renderiza con `@/components/ui/Text` indicando una variante de `src/theme/typography.ts`.

- No se declara `fontSize` en una pantalla ni en un componente de feature. La excepción son los `TextInput`, que toman el tamaño del token correspondiente.
- No se usa el `Text` de React Native: se salta el tope de escalado accesible de la variante.
- El color se elige con `tone` y el énfasis con `weight`; no se escriben colores de texto sueltos.
- Añadir una variante nueva exige justificar el hueco en la escala. La escala reproduce los estilos de texto de iOS y los roles de Material 3.

### 11.2 Espaciado y disposición

- Los márgenes, separaciones y rellenos salen de `src/theme/spacing.ts`, que sigue la rejilla de 8 pt con sub-rejilla de 4 pt.
- Las alturas de control, los objetivos táctiles y los tamaños de icono salen de `src/theme/layout.ts`.
- Todo control interactivo alcanza `layout.minTouchTarget` en altura y anchura, o lo compensa con `hitSlop`. El valor cubre a la vez los 44 pt de Apple y los 48 dp de Material.
- La adaptación al tamaño de pantalla se resuelve con `useLayoutDensity` y los tokens de densidad, no con cálculos proporcionales por componente.
- Un tamaño propio de un componente (el lado de un avatar, la altura de una tarjeta) se declara como constante con nombre junto al componente, nunca como número suelto dentro del estilo.

---

## 12. Estado

Antes de añadir estado global, preguntar:

1. ¿Lo necesitan múltiples features?
2. ¿Debe sobrevivir a navegación?
3. ¿Es información de servidor?
4. ¿Puede mantenerse local?
5. ¿Ya existe un sistema que lo administra?

El estado del formulario debe permanecer local salvo necesidad real.

El espacio activo y la sesión sí son globales.

Los movimientos no deben copiarse sin necesidad entre caché, store global y estado local.

---

## 13. Datos y reglas de negocio

No colocar reglas críticas únicamente en componentes.

Ejemplos de reglas críticas:

- Acceso a espacios.
- Propiedad.
- Permisos.
- Separación.
- Límites de plan.
- Idempotencia.
- Migración de invitado.
- Cálculo definitivo de operaciones sensibles.

Las validaciones de interfaz mejoran experiencia, pero no sustituyen seguridad de backend.

---

## 14. SQL y Supabase

Todo cambio SQL debe:

- Realizarse mediante migración.
- Tener nombre descriptivo.
- Poder revisarse.
- Evitar cambios destructivos sin plan.
- Incluir políticas cuando corresponda.
- Incluir índices cuando estén justificados.
- Actualizar tipos generados.
- Añadir pruebas de permisos.
- Actualizar `DATABASE.md`.
- Registrar decisiones relevantes.

No ejecutar manualmente cambios de producción que no estén representados en el repositorio.

---

## 15. Modo invitado

Reglas:

- Los datos se guardan localmente.
- No se crean filas remotas.
- La lógica funcional debe parecerse a la autenticada.
- Los identificadores locales deben permitir migración.
- La conversión a cuenta debe ser idempotente.
- No borrar datos locales hasta confirmar sincronización.
- No mezclar datos de invitado con una cuenta equivocada.
- Los límites deben centralizarse.
- La interfaz debe explicar por qué se solicita registro.

---

## 16. Espacios

Toda consulta y mutación de datos financieros debe tener un espacio explícito o derivado de forma segura.

No permitido:

- Consultas globales sin filtrar.
- Confiar únicamente en el espacio activo del cliente.
- Cambiar el espacio visual sin invalidar datos anteriores.
- Mostrar brevemente datos de un espacio previo durante la transición.
- Crear movimientos sin autor.
- Asumir que solo existen dos miembros a nivel de base de datos.

---

## 17. Formularios

Los formularios deben:

- Tener validación clara.
- Mostrar errores cerca del campo.
- Preservar datos ante errores recuperables.
- Evitar campos obligatorios innecesarios.
- Gestionar teclado.
- Evitar dobles envíos.
- Mostrar estado de guardado.
- Ser accesibles.

El modal de movimiento debe priorizar velocidad. No añadir campos avanzados al primer nivel si pueden vivir en una sección secundaria.

---

## 18. Modales

Antes de crear un modal:

- Revisar la primitiva global.
- Revisar el comportamiento de teclado.
- Revisar gestos.
- Revisar scroll.
- Revisar safe area.
- Revisar acciones inferiores.
- Revisar accesibilidad.
- Revisar Android.

Todo modal debe reservar, mediante la primitiva global y tokens de espaciado, una separación inferior visible entre su último control o botón y el borde útil del modal, adicional a la safe area. El último elemento interactivo nunca debe quedar pegado al borde inferior. Esta separación no debe resolverse de forma aislada en cada feature si puede garantizarse desde la primitiva compartida.

La superficie del modal puede ocupar todo el ancho disponible, pero su contenido
debe conservar el gutter horizontal definido por la primitiva global. Ese
espaciado pertenece al interior del modal y no debe simularse estrechando su
superficie exterior.

No reconstruir navegación, encabezado o botones del modal en cada feature.

---

## 19. Animaciones

Las animaciones deben:

- Tener propósito.
- Respetar preferencias de movimiento reducido.
- No bloquear acciones.
- No ocultar errores.
- Ser consistentes.
- Funcionar en dispositivos de rendimiento medio.
- Tener alternativa cuando una plataforma no soporte el mismo efecto.

No crear una animación compleja desde cero sin evaluar herramientas existentes.

---

## 20. Nombres

Los nombres deben describir intención.

Preferir:

- `CreateTransactionModal`
- `ActiveSpaceSelector`
- `useGuestMigration`
- `transactionRepository`
- `formatCurrency`

Evitar:

- `Component2`
- `NewModal`
- `Helper`
- `Common`
- `Stuff`
- `Manager` sin responsabilidad clara
- `Data`
- `Utils2`

---

## 21. TypeScript

Reglas:

- Evitar `any`.
- Usar tipos explícitos en contratos públicos.
- Validar datos externos en runtime cuando sea necesario.
- No confiar en casts para ocultar errores.
- Preferir uniones discriminadas para estados.
- Diferenciar identificadores cuando ayude a evitar mezclas.
- No duplicar tipos generados de Supabase manualmente.
- Mantener tipos de navegación actualizados.

Ejemplo:

```ts
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: AppError };
```

---

## 22. Errores

No mostrar mensajes técnicos crudos.

Cada error debe:

- Registrarse de forma segura.
- Normalizarse.
- Mapearse a un mensaje comprensible.
- Ofrecer recuperación cuando sea posible.
- Evitar exponer información sensible.

No usar bloques `catch` vacíos.

---

## 23. Pruebas

La cantidad de pruebas debe corresponder al riesgo.

### Pequeño cambio visual

- Verificación manual.
- Prueba existente actualizada si corresponde.

### Lógica de dominio

- Pruebas unitarias.

### Persistencia o sincronización

- Pruebas unitarias.
- Pruebas de integración.
- Casos de reintento.
- Casos de duplicación.

### Permisos o RLS

- Pruebas SQL.
- Casos permitidos.
- Casos denegados.
- Miembros y no miembros.
- Espacios distintos.

### Flujo crítico

- Prueba end-to-end cuando sea viable.

Nunca modificar pruebas para que pasen ocultando un defecto real.

---

## 24. Documentación

Actualizar documentación cuando cambie:

- Arquitectura.
- Modelo de datos.
- Flujo.
- Navegación.
- Regla de producto.
- Dependencia principal.
- Proceso de trabajo.
- Decisión transversal.
- Alcance del roadmap.

No repetir la misma fuente de verdad en varios archivos. Enlazarla.

---

## 25. Resumen obligatorio al finalizar una tarea

El resultado debe indicar:

1. Qué se cambió.
2. Qué archivos principales se tocaron.
3. Qué se reutilizó.
4. Qué dependencia se añadió, si alguna.
5. Qué pruebas se ejecutaron.
6. Qué plataformas se verificaron.
7. Qué riesgos o pendientes quedan.
8. Qué no se modificó deliberadamente.

No afirmar que se ejecutaron pruebas o compilaciones si no se ejecutaron.

Este resumen es el paquete de revisión que se entrega en el Gate 2 de `WORKFLOW.md` §5.

---

## 26. Prohibiciones explícitas

- No duplicar componentes existentes.
- No escribir una feature completa sin revisar el repositorio.
- No crear carpetas por costumbre.
- No inventar requisitos.
- No ampliar alcance sin permiso.
- No refactorizar toda una pantalla para cambiar un detalle.
- No instalar dependencias automáticamente sin evaluación.
- No copiar código sin revisar licencia.
- No editar archivos generados manualmente.
- No guardar secretos en el repositorio.
- No debilitar permisos para “hacer que funcione”.
- No desactivar TypeScript o lint para ocultar errores.
- No usar datos reales sensibles en pruebas.
- No borrar datos durante migración antes de confirmación.
- No asumir que el usuario está autenticado.
- No asumir que existe conexión.
- No asumir que el espacio activo autoriza una consulta.
- No implementar únicamente para iOS.
- No declarar una tarea terminada con documentación obsoleta.

---

## 27. Plantilla de inicio de tarea

```md
### Clasificación
Pequeña | Mediana | Grande

### Objetivo
Qué debe cambiar.

### Alcance
Archivos o dominios afectados.

### Fuera de alcance
Qué no se tocará.

### Reutilización
Componentes, hooks o servicios existentes.

### Investigación
No necesaria | Opciones evaluadas.

### Riesgos
Plataforma, datos, permisos, migración o regresión.

### Validación
Tipos, lint, pruebas, iOS, Android.
```

Para tareas pequeñas, esta plantilla puede reducirse a una nota breve.

---

## 28. Plantilla de decisión sobre librería

```md
### Problema

### Opciones evaluadas

### Librería recomendada

### Motivo

### Compatibilidad
- React Native:
- iOS:
- Android:
- TypeScript:

### Mantenimiento

### Licencia

### Riesgos

### Alternativa

### Plan de retirada
```

---

## 29. Regla final

> El mejor cambio es el menor cambio que resuelve correctamente el problema y conserva la coherencia del sistema.

La velocidad no justifica duplicación, pero la perfección arquitectónica tampoco justifica convertir una tarea pequeña en una reescritura.
