# ROADMAP.md

## 1. Propósito

Este roadmap organiza la reconstrucción de `juntoss` en fases pequeñas, verificables y con alcance controlado.

No es una promesa de fechas. Es un orden de implementación.

Principios:

- Construir primero el flujo central.
- Evitar funcionalidades futuras antes de validar las actuales.
- No implementar una capa completa si todavía no existe una necesidad real.
- Mantener una aplicación ejecutable al finalizar cada fase.
- Tratar la documentación, las pruebas y la paridad de plataformas como parte del trabajo.

---

## 2. Definición de prioridad

### P0 — imprescindible

La aplicación no puede cumplir su propósito sin ello.

### P1 — importante

Mejora sustancialmente la experiencia o permite completar el producto inicial.

### P2 — posterior

Aporta valor, pero puede esperar hasta validar el núcleo.

### P3 — futuro

Idea compatible con la visión, no comprometida para la primera versión.

---

## 3. Resultado de la primera versión útil

La primera versión útil debe permitir:

- Entrar como invitado.
- Completar un onboarding corto.
- Tener un espacio personal local.
- Crear gastos e ingresos.
- Crear y seleccionar categorías.
- Consultar balance.
- Consultar movimientos.
- Filtrar actividad.
- Revisar resumen en Inicio.
- Crear una cuenta.
- Verificar el correo.
- Migrar datos locales sin pérdida.
- Sincronizar datos con Supabase.
- Funcionar en iOS y Android.

Los espacios de pareja pueden entrar después de consolidar el flujo personal y la sincronización.

---

# Fase 0 — Base del repositorio

**Prioridad:** P0

## Objetivo

Crear una base mínima, coherente y comprobable antes de implementar funcionalidades.

## Tareas

- [ ] Inicializar el proyecto React Native con TypeScript.
- [ ] Confirmar estrategia de framework y compilación.
- [ ] Configurar aliases.
- [ ] Configurar lint.
- [ ] Configurar format.
- [ ] Configurar typecheck.
- [ ] Configurar pruebas.
- [ ] Configurar variables de entorno.
- [ ] Crear estructura mínima de carpetas.
- [ ] Añadir documentación base.
- [ ] Configurar CI inicial.
- [ ] Verificar build limpio en iOS.
- [ ] Verificar build limpio en Android.
- [ ] Añadir manejo de errores global.
- [ ] Definir convención de nombres.
- [ ] Definir mecanismo de configuración por entorno.

## Entregables

- Repositorio ejecutable.
- Pantalla temporal de arranque.
- Comandos documentados.
- CI ejecutando validaciones básicas.

## Criterios de terminado

- La app inicia en iOS y Android.
- TypeScript no presenta errores.
- Lint pasa.
- Una prueba mínima se ejecuta.
- La estructura coincide con `ARCHITECTURE.md`.
- No hay código heredado copiado sin revisión.

---

# Fase 1 — Sistema de diseño mínimo

**Prioridad:** P0

## Objetivo

Crear las primitivas necesarias para evitar que cada pantalla invente sus propios componentes.

## Tareas

### Tokens

- [ ] Colores.
- [ ] Tipografía.
- [ ] Espaciado.
- [ ] Radios.
- [ ] Elevación o sombras.
- [ ] Duraciones de movimiento.
- [ ] Tokens específicos de plataforma cuando sean necesarios.

### Componentes base

- [ ] `Text`.
- [ ] `Button`.
- [ ] `IconButton`.
- [ ] `Card`.
- [ ] `Input`.
- [ ] `Switch` o control segmentado.
- [ ] `Screen`.
- [ ] `Stack`.
- [ ] `Row`.
- [ ] `Divider`.
- [ ] `LoadingState`.
- [ ] `EmptyState`.
- [ ] `ErrorState`.
- [ ] `AppModal` o primitiva equivalente.
- [ ] `ModalActions`.
- [ ] Encabezado de pantalla.
- [ ] Indicador de progreso circular base, si se mantiene.

## Investigación requerida

- Gestos y modales.
- Coordinación con teclado.
- Animaciones.
- Comportamiento nativo en ambas plataformas.

## Criterios de terminado

- Los componentes tienen variantes claras.
- Existe al menos una muestra o pantalla de catálogo interna.
- Los botones del pie de modal no se duplican.
- El modal funciona con teclado y safe areas.
- Android dispone de alternativa coherente a los efectos exclusivos de iOS.
- Se documenta cualquier dependencia relevante.

---

# Fase 2 — Onboarding y modo invitado

**Prioridad:** P0

## Objetivo

Permitir que una persona entre y pruebe la aplicación sin cuenta.

## Tareas

### Onboarding

- [ ] Pantalla de bienvenida.
- [ ] Captura de nombre.
- [ ] Dos o tres láminas de valor.
- [ ] Opción de avanzar u omitir según diseño.
- [ ] Persistir finalización.
- [ ] Accesibilidad.
- [ ] Assets optimizados.

### Sesión invitada

- [ ] Crear identidad local.
- [ ] Crear espacio personal local.
- [ ] Crear categorías iniciales.
- [ ] Restaurar sesión al abrir la app.
- [x] Definir versión del esquema local.
- [ ] Definir límites configurables.
- [ ] Mostrar estado de invitado de manera no intrusiva.

## Decisión necesaria

Seleccionar almacenamiento local después de evaluar mantenimiento, migraciones, consultas y compatibilidad.

## Criterios de terminado

- Un usuario nuevo entra sin registro.
- El onboarding no supera cuatro láminas.
- El nombre se conserva al reiniciar.
- Existe un espacio personal local.
- No se realiza ninguna escritura en Supabase.
- iOS y Android restauran correctamente el estado.

---

# Fase 3 — Núcleo de movimientos

**Prioridad:** P0

## Objetivo

Construir la acción más importante: registrar un gasto o ingreso con rapidez.

## Tareas

### Dominio

- [ ] Definir entidad `Transaction`.
- [ ] Definir tipos gasto e ingreso.
- [ ] Definir importe en unidades menores.
- [ ] Definir fecha económica.
- [ ] Definir relación con espacio, autor y categoría.
- [ ] Definir validaciones.
- [x] Implementar repositorio local.

### Modal de creación

- [ ] Abrir desde Inicio.
- [ ] Cambiar entre gasto e ingreso.
- [ ] Cerrar sin guardar.
- [ ] Introducir importe.
- [ ] Implementar calculadora o teclado de importe.
- [ ] Seleccionar categoría.
- [ ] Añadir título.
- [x] Seleccionar fecha.
- [ ] Preparar recurrencia como opción no bloqueante.
- [ ] Guardar.
- [ ] Evitar doble envío.
- [ ] Mostrar error recuperable.
- [ ] Gestionar teclado, scroll y gestos.
- [ ] Mantener el espacio activo implícito.

### Acciones rápidas

- [ ] Botón de gasto.
- [ ] Botón de ingreso.
- [ ] Acceso coherente desde otras pantallas si se decide.

## Investigación requerida

- Bottom sheet o modal.
- Teclado numérico.
- Gestos.
- Scroll.
- Accesibilidad.
- Diferencias de plataforma.

## Pruebas

- [ ] Crear gasto.
- [ ] Crear ingreso.
- [ ] Rechazar cero.
- [ ] Decimales.
- [ ] Fecha.
- [ ] Rechazar movimientos sin categoría.
- [ ] Categoría del espacio activo.
- [ ] Espacio.
- [x] Persistencia.
- [ ] Cierre sin guardar.
- [ ] Doble toque.

## Criterios de terminado

- Crear un movimiento requiere el mínimo número razonable de pasos.
- El modal se siente estable en iOS y Android.
- Los datos permanecen tras reiniciar.
- No existen implementaciones duplicadas de acciones inferiores.
- El movimiento queda asociado al espacio local activo.
- Se cubren errores y estados de guardado.

---

# Fase 4 — Categorías

**Prioridad:** P0

## Objetivo

Permitir organización flexible sin separar artificialmente gastos e ingresos.

## Tareas

- [x] Definir entidad `Category`.
- [x] Incluir categorías iniciales.
- [x] Crear categoría personalizada.
- [x] Editar nombre, icono o color.
- [x] Seleccionar categoría en un movimiento.
- [x] Consultar categorías del espacio.
- [x] Mostrar total por categoría.
- [x] Abrir detalle.
- [x] Mostrar movimientos asociados.
- [x] Archivar categoría.
- [x] Resolver categorías con movimientos.
- [ ] Aplicar límite del modo invitado.
- [ ] Mostrar conversión a cuenta al alcanzar límite.

## Reglas

- La misma categoría admite ingresos y gastos.
- La categoría pertenece a un espacio.
- El borrado físico no es la opción predeterminada.
- La interfaz debe evitar nombres ambiguos o duplicados accidentales.

## Criterios de terminado

- El usuario puede organizar movimientos.
- La selección es rápida.
- Los totales son correctos.
- Las categorías permanecen tras reiniciar.
- Los límites están centralizados.
- El estado vacío guía a crear la primera categoría.

---

# Fase 5 — Inicio

**Prioridad:** P0

## Objetivo

Responder de forma inmediata a las preguntas financieras principales.

## Contenido

- [ ] Espacio activo.
- [x] Balance disponible como cifra principal libre sobre el fondo.
- [ ] Ingresos y gastos durante el mes.
- [ ] Progreso circular por categoría solo con presupuesto.
- [ ] Vista previa de categorías.
- [ ] Movimientos recientes.
- [ ] Acciones de gasto e ingreso.
- [x] Estados vacíos.
- [x] Estado sin movimientos.
- [ ] Estado con sincronización pendiente, cuando aplique.

## Reglas

- No añadir gráficas complejas.
- No mostrar métricas sin acción o interpretación.
- No saturar con tarjetas.
- Mostrar el balance sin una tarjeta independiente y acompañarlo con
  indicadores compactos de ingresos y gastos del mes.
- Mantener jerarquía visual.
- Los cálculos deben provenir de funciones probadas.

## Pruebas

- [ ] Balance con ingresos y gastos.
- [ ] Mes sin datos.
- [ ] Categorías.
- [ ] Movimientos recientes.
- [ ] Cambio de fecha.
- [ ] Moneda y locale.

## Criterios de terminado

- El usuario entiende su situación sin navegar.
- Los valores coinciden con Actividad.
- El progreso no afecta rendimiento.
- La pantalla funciona en tamaños y plataformas soportados.

---

# Fase 6 — Actividad

**Prioridad:** P0

## Objetivo

Agrupar movimientos, balance, filtros y categorías en una sección comprensible.

## Tareas

- [ ] Lista de movimientos.
- [x] Distribución circular por categoría para gastos e ingresos.
- [x] Navegación mensual de la distribución.
- [x] Sección plegable conjunta para gráfica y categorías.
- [ ] Agrupación o secciones por fecha, si aporta claridad.
- [x] Resumen de ingresos, gastos y balance sobre los movimientos filtrados.
- [ ] Búsqueda.
- [x] Filtro por fecha.
- [x] Filtro por tipo.
- [x] Filtro por categoría.
- [x] Filtro por recurrencia.
- [x] Combinación de filtros.
- [x] Limpiar filtros.
- [x] Detalle de movimiento.
- [x] Edición.
- [x] Archivado o eliminación según política.
- [x] Acceso a categorías.
- [x] Detalle de categoría.
- [ ] Estados vacío, error y sin resultados.
- [ ] Rendimiento con listas largas.

### Mapa de movimientos

- [x] Sustituir el destino vacío Extras por Mapa.
- [x] Reutilizar el calendario del selector de fecha.
- [x] Permitir desplazamiento vertical continuo entre meses.
- [x] Marcar gastos e ingresos del espacio activo.
- [x] Mostrar los movimientos al seleccionar un día.
- [x] Ocupar todo el ancho sin desplazar el encabezado fijo.
- [x] Atenuar los meses adyacentes y animar el cambio de foco.
- [x] Separar las marcas del estado seleccionado.
- [x] Evitar que el selector de espacio cubra el título.
- [x] Crear un movimiento para el día elegido desde una acción inferior fija.
- [x] Ofrecer un retorno flotante a hoy al alejarse seis meses del mes actual.
- [x] Alternar entre calendario mensual continuo y vista semanal cercana.
- [x] Limitar ambas vistas entre enero de 2024 y diciembre de 2080, estabilizar
  el scroll semanal rápido y conservar sus listas en memoria al alternar.
- [x] Unificar el modelo local de fechas, corregir la geometría virtual mensual
  y hacer reiniciable la transición entre vistas ya montadas.

## Decisión de diseño

Validar el nombre `Actividad` y cómo conviven movimientos y categorías:

- Segmentos internos.
- Secciones.
- Acceso secundario.
- Otra jerarquía clara.

## Criterios de terminado

- El usuario encuentra un movimiento.
- Los filtros son predecibles.
- El balance coincide con Inicio.
- Cambiar filtros no mezcla espacios.
- La lista mantiene rendimiento adecuado.
- Mapa no mezcla datos de otros espacios.
- Gastos e ingresos se distinguen sin depender solo del color.

---

# Fase 7 — Autenticación

**Prioridad:** P0

## Objetivo

Permitir crear una cuenta sin perder los datos invitados.

## Tareas

- [ ] Pantalla de registro.
- [ ] Correo.
- [ ] Contraseña.
- [ ] Validaciones.
- [ ] Verificación por código.
- [ ] Entrada de código flexible.
- [ ] Pegado completo.
- [ ] Reenvío controlado.
- [ ] Inicio de sesión.
- [ ] Cierre de sesión.
- [ ] Recuperación de contraseña.
- [ ] Mensajes de error normalizados.
- [ ] Almacenamiento seguro de sesión.
- [ ] Manejo de cuenta ya existente.
- [ ] Manejo de sesión caducada.

## Criterios de terminado

- El código no asume una longitud fija no configurable.
- Los datos locales no se pierden al fallar el registro.
- El usuario puede reintentar.
- La sesión se restaura de forma segura.
- No se registran secretos ni tokens en logs.

---

# Fase 8 — Supabase y esquema remoto

**Prioridad:** P0

## Objetivo

Crear la infraestructura remota con aislamiento y pruebas.

## Tareas

- [ ] Configurar proyecto y entornos.
- [x] Crear migraciones iniciales.
- [x] Crear `profiles`.
- [x] Crear `spaces`.
- [x] Crear `space_members`.
- [x] Crear `categories`.
- [x] Crear `transactions`.
- [x] Activar RLS.
- [x] Crear políticas.
- [x] Crear índices.
- [ ] Crear seeds.
- [x] Crear pruebas SQL.
- [ ] Generar tipos.
- [x] Crear operación idempotente de espacio personal.

## Criterios de terminado

- Un usuario no puede leer datos de otro espacio.
- La autoría no puede falsificarse.
- Una categoría de otro espacio no puede asignarse.
- Las migraciones recrean el entorno.
- Las pruebas de RLS pasan.
- Los tipos están actualizados.

---

# Fase 9 — Migración invitado-cuenta

**Prioridad:** P0

## Objetivo

Convertir la experiencia local en una cuenta sincronizada sin fricción.

## Tareas

- [x] Crear lote de sincronización.
- [x] Recuperar o crear espacio personal remoto.
- [x] Subir categorías.
- [x] Mapear identificadores.
- [x] Subir movimientos.
- [x] Implementar idempotencia.
- [x] Implementar reintentos.
- [x] Preservar copia local temporal.
- [ ] Mostrar progreso.
- [ ] Mostrar error recuperable.
- [ ] Confirmar resultado.
- [x] Evitar mezcla con cuenta equivocada.
- [x] Probar fallo parcial.
- [x] Probar reinstentos.

## Criterios de terminado

- Repetir el proceso no duplica datos.
- Una interrupción no causa pérdida.
- Los conteos local y remoto coinciden.
- La interfaz no declara éxito antes de confirmación.
- El usuario continúa viendo sus datos.

---

# Fase 10 — Espacio activo global

**Prioridad:** P1

## Objetivo

Preparar la aplicación para múltiples contextos sin convertirlos en una pestaña.

## Tareas

- [x] Store global de espacio activo.
- [x] Selector visible desde todas las pantallas.
- [x] Encabezado con nombre del espacio.
- [x] Persistir selección.
- [x] Invalidar o recargar datos al cambiar.
- [x] Evitar destello de datos anteriores.
- [x] Conservar pantalla actual cuando sea posible.
- [ ] Mostrar estado de transición.
- [x] Añadir opción de gestión.
- [x] Preparar interfaz para lista de espacios.
- [x] Activar Ajustes desde el menú lateral y distinguir sus capacidades
  pendientes mediante un indicador explícito.

## Criterios de terminado

- El contexto siempre es visible.
- Cambiar espacio actualiza Inicio y Actividad.
- No se mezclan datos.
- El usuario no tiene que volver siempre a Inicio.
- La navegación principal no dedica una pestaña a espacios.

---

# Fase 11 — Espacio de pareja

**Prioridad:** P1

## Objetivo

Permitir que dos personas compartan un espacio sin fusionar sus finanzas personales.

## Tareas

### Creación e invitación

- [ ] Crear espacio de pareja.
- [ ] Generar invitación.
- [ ] Aceptar.
- [ ] Caducidad.
- [ ] Revocación.
- [ ] Estado pendiente.
- [ ] Errores comprensibles.

### Datos compartidos

- [ ] Categorías del espacio.
- [ ] Movimientos.
- [ ] Autoría visible cuando aporte valor.
- [ ] Permisos.
- [ ] Actividad compartida.
- [ ] Inicio compartido.
- [ ] Cambio entre Personal y Pareja.

### Seguridad

- [ ] RLS.
- [ ] No miembros.
- [ ] Miembros inactivos.
- [ ] Autoría.
- [ ] Edición de movimientos ajenos según política.

## Decisiones necesarias

- Quién puede editar un movimiento ajeno.
- Quién puede archivar categorías.
- Qué ocurre al salir.
- Qué historial permanece visible.
- Qué ocurre si el propietario abandona.

## Criterios de terminado

- Los espacios personales permanecen separados.
- Ambos miembros ven el espacio compartido.
- Los permisos se aplican en backend.
- Cambiar de espacio es claro.
- Los datos no se filtran entre contextos.

---

# Fase 12 — Separación de espacio

**Prioridad:** P1

## Objetivo

Permitir abandonar o disolver un espacio sin pérdida arbitraria ni exposición indebida.

## Tareas

- [ ] Diferenciar salir, eliminar miembro, archivar y disolver.
- [ ] Diseñar confirmaciones.
- [ ] Definir política de historial.
- [ ] Copiar categorías elegibles.
- [ ] Evitar duplicados.
- [ ] Conservar metadatos de origen.
- [ ] Desactivar membresías.
- [ ] Revocar acceso.
- [ ] Registrar auditoría.
- [ ] Crear función transaccional.
- [ ] Probar fallos.
- [ ] Probar reintentos.

## Criterios de terminado

- Los movimientos no se copian incorrectamente a espacios personales.
- Las categorías se copian según política.
- La autoría se conserva.
- No existen estados parciales.
- La operación es comprensible y reversible cuando corresponda.

---

# Fase 13 — Recurrencias

**Prioridad:** P2

## Objetivo

Permitir registrar movimientos repetitivos sin complicar el flujo básico.

## Decisión previa

Elegir entre:

- Generar automáticamente.
- Recordar al usuario.
- Crear al llegar la fecha.
- Ejecutar en backend.

## Tareas

- [x] Modelo local de serie.
- [x] Selector simple y personalizado.
- [x] Próxima ejecución local al cargar movimientos.
- [ ] Pausar.
- [ ] Editar serie.
- [x] Editar una ocurrencia, incluidas las futuras proyectadas.
- [x] Evitar duplicados locales por serie y fecha.
- [x] Fechas económicas locales sin conversión UTC.
- [x] Pruebas de intervalos, fechas personalizadas y materialización local.
- [x] Agrupar previews de fechas personalizadas y mostrar cada ocurrencia
  automática como una preview independiente con su fecha económica.
- [x] Convertir una ocurrencia editada a recurrencia personalizada agrupada.
- [x] Mostrar en el detalle la próxima repetición y paginar sus fechas futuras
  de cinco en cinco, incluida la recurrencia personalizada.
- [ ] Ejecución remota cuando ningún cliente abre la aplicación.

## Criterios de terminado

- La recurrencia no añade fricción al movimiento normal.
- No duplica movimientos.
- La edición tiene comportamiento claro.
- Las fechas se procesan correctamente.

---

# Fase 14 — Ahorros y planes

**Prioridad:** P2

## Objetivo

Crear objetivos individuales o compartidos.

## Tareas

- [ ] Definir diferencia entre ahorro y plan.
- [ ] Crear objetivo.
- [ ] Importe meta.
- [ ] Fecha meta.
- [ ] Aportaciones.
- [ ] Progreso.
- [ ] Autoría.
- [ ] Espacio.
- [ ] Cancelación.
- [ ] Finalización.
- [ ] Estados vacíos.
- [ ] Pruebas.

## Criterios de terminado

- Las aportaciones no se confunden con movimientos ordinarios.
- El progreso es correcto.
- Funciona en espacio personal y compartido.
- La navegación mantiene simplicidad.

---

# Fase 15 — Calidad offline y sincronización avanzada

**Prioridad:** P2

## Objetivo

Mejorar confiabilidad fuera de línea si las métricas lo justifican.

## Posibles tareas

- [x] Escritura local-first para categorías y movimientos.
- [ ] Cola.
- [ ] Reintentos.
- [ ] Resolución de conflictos.
- [ ] Indicador de sincronización.
- [ ] Caché.
- [ ] Invalidación.
- [ ] Pruebas con conexión intermitente.

No iniciar esta fase únicamente por preferencia técnica.

---

# Fase 16 — Analítica y observabilidad

**Prioridad:** P1/P2

## Objetivo

Comprender errores y uso sin recopilar información financiera innecesaria.

## Tareas

- [ ] Crash reporting.
- [ ] Eventos de onboarding.
- [ ] Primer movimiento.
- [ ] Conversión a cuenta.
- [ ] Fallos de migración.
- [ ] Uso de espacios.
- [ ] Abandono del modal.
- [ ] Política de privacidad.
- [ ] Consentimiento cuando aplique.
- [ ] Sanitización de eventos.

## Regla

No enviar importes, títulos, categorías personalizadas ni datos sensibles salvo necesidad y consentimiento explícitos.

---

# Fase 17 — Suscripciones y límites

**Prioridad:** P2

## Objetivo

Aplicar límites de espacios o funciones mediante capacidades centralizadas.

## Tareas

- [ ] Definir plan gratuito.
- [ ] Definir plan de pago.
- [ ] Capa de capacidades.
- [ ] Pantalla de mejora.
- [ ] Integración de pagos adecuada a móvil.
- [ ] Backend.
- [ ] Webhooks.
- [ ] Idempotencia.
- [ ] Restauración.
- [ ] Estados de suscripción.
- [ ] Pruebas.

## Regla

La interfaz no debe confiar únicamente en una bandera local para desbloquear funciones.

---

# Fase 18 — Gráficas y estadísticas

**Prioridad:** P3

## Objetivo

Añadir análisis visual únicamente después de validar preguntas reales de usuarios.

## Posibles métricas

- Comparación mensual.
- Distribución por categoría.
- Tendencia de balance.
- Ingresos frente a gastos.
- Evolución de ahorro.

## Reglas

- Cada gráfica debe responder una pregunta.
- Debe existir alternativa textual.
- Debe ser accesible.
- Debe funcionar con pocos y muchos datos.
- Debe evaluarse una librería mantenida.
- No debe perjudicar el rendimiento de Inicio.

---

# Fase 19 — Familias y grupos

**Prioridad:** P3

## Objetivo

Extender los espacios a más de dos miembros.

## Tareas futuras

- Roles.
- Permisos.
- Aportaciones.
- División de gastos.
- Miembros adultos.
- Hogares.
- Grupos temporales.
- Invitaciones múltiples.
- Límites de plan.
- Administración.
- Salida de miembros.
- Historial.

La base de datos debe permitir esta evolución, pero la interfaz inicial no debe construirla anticipadamente.

---

## 4. Orden recomendado inmediato

Secuencia de trabajo recomendada:

1. Fase 0 — Base.
2. Fase 1 — Sistema de diseño.
3. Fase 2 — Onboarding e invitado.
4. Fase 3 — Modal de movimiento.
5. Fase 4 — Categorías.
6. Fase 5 — Inicio.
7. Fase 6 — Actividad.
8. Fase 7 — Autenticación.
9. Fase 8 — Supabase.
10. Fase 9 — Migración.
11. Fase 10 — Espacio activo.
12. Fase 11 — Pareja.

El modal de movimiento debe recibir atención temprana porque condiciona componentes, persistencia, categorías, teclado, gestos y experiencia general.

---

## 5. Plantilla de epic

```md
# Epic

## Objetivo

## Problema del usuario

## Alcance

## Fuera de alcance

## Dependencias

## Riesgos

## Decisiones necesarias

## Tareas

- [ ]

## Pruebas

- [ ]

## Criterios de terminado

- [ ]
```

---

## 6. Regla para mover tareas

Una tarea puede adelantarse si:

- Desbloquea una fase actual.
- Reduce un riesgo crítico.
- Permite validar una hipótesis esencial.
- Corrige seguridad o pérdida de datos.

Una tarea no debe adelantarse únicamente porque resulte más interesante técnicamente.

---

## 7. Deuda técnica

La deuda debe registrarse con:

- Descripción.
- Impacto.
- Riesgo.
- Área.
- Motivo por el que se acepta.
- Condición para resolverla.

No utilizar “limpiar después” como sustituto de una decisión.

---

## 8. Criterio de lanzamiento

Antes de una versión pública deben verificarse, como mínimo:

- Flujo de onboarding.
- Creación de movimiento.
- Persistencia.
- Balance.
- Categorías.
- Conversión a cuenta.
- Migración sin pérdida.
- RLS.
- Manejo de errores.
- iOS.
- Android.
- Accesibilidad básica.
- Privacidad.
- Crash reporting.
- Proceso de soporte.
- Eliminación de cuenta y datos según requisitos aplicables.

---

## 9. Principio final

> Cada fase debe dejar una aplicación más útil, no únicamente una arquitectura más grande.
