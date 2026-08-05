# juntoss

> **Leer antes de escribir o modificar una sola línea de código.**

`juntoss` es una aplicación móvil de finanzas personales construida con React Native para iOS y Android. Ayuda a registrar, comprender y organizar el dinero con la menor fricción posible, y permite compartir finanzas de forma selectiva con una pareja y, en el futuro, con otros grupos.

La aplicación debe ser sencilla, consistente, rápida y predecible. La complejidad técnica nunca debe trasladarse al usuario.

---

## 1. Estado del proyecto

Este repositorio corresponde a una reconstrucción de la aplicación.

La versión anterior acumuló funcionalidades, duplicación de componentes, responsabilidades mezcladas y decisiones difíciles de mantener. La nueva versión prioriza:

1. Simplicidad.
2. Reutilización.
3. Arquitectura clara.
4. Experiencia nativa en iOS y Android.
5. Desarrollo incremental.
6. Reglas explícitas para personas y asistentes de programación.
7. Una base preparada para crecer sin implementar prematuramente funcionalidades futuras.

---

## 2. Documentación obligatoria

| Archivo | Propósito |
|---|---|
| [`README.md`](./README.md) | Visión general y punto de entrada. |
| [`PRODUCT.md`](./PRODUCT.md) | Producto, navegación, pantallas y reglas funcionales. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitectura técnica y estructura de carpetas. |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Reglas obligatorias para modificar el código. |
| [`DATABASE.md`](./DATABASE.md) | Persistencia local, Supabase, SQL y sincronización. |
| [`ROADMAP.md`](./ROADMAP.md) | Fases y criterios de finalización. |
| [`DECISIONS.md`](./DECISIONS.md) | Historial de decisiones técnicas y de producto. |

Si una modificación cambia una regla, flujo, arquitectura o decisión relevante, también debe actualizarse el documento correspondiente.

---

## 3. Visión del producto

`juntoss` permite:

- Registrar ingresos y gastos.
- Organizar movimientos mediante categorías.
- Consultar el balance disponible.
- Revisar actividad reciente.
- Filtrar movimientos.
- Comprender cuánto se ha gastado en cada categoría.
- Trabajar dentro de un espacio personal.
- Crear un espacio compartido con una pareja.
- Mantener aisladas las finanzas personales y compartidas.
- Separar un espacio compartido sin destruir información válida.
- Incorporar posteriormente espacios familiares, de convivencia, viajes o grupos.
- Añadir más adelante ahorros, planes y objetivos compartidos.

La primera versión se centra en el uso personal y de pareja. La arquitectura no debe asumir que solo existirá un único espacio compartido.

---

## 4. Principios fundamentales

### 4.1 Reutilizar antes de crear

Antes de crear código nuevo:

1. Comprender el problema.
2. Buscar una solución existente en el proyecto.
3. Reutilizar o extender componentes, hooks, servicios y utilidades existentes.
4. Cuando la tarea lo justifique, investigar librerías maduras y mantenidas.
5. Crear una implementación propia únicamente cuando las opciones anteriores no sean adecuadas.

No se permite duplicar un componente para cambiar únicamente texto, espaciado, posición, icono, variante o comportamiento configurable.

### 4.2 La simplicidad es una restricción

Debe preferirse:

- Menos capas cuando no añadan valor.
- Menos abstracciones prematuras.
- Menos dependencias innecesarias.
- Componentes pequeños con responsabilidades claras.
- Flujos directos.
- Nombres explícitos.
- Código fácil de eliminar o sustituir.

### 4.3 Registrar un movimiento es la acción principal

Crear un ingreso o gasto debe ser la acción más rápida de toda la aplicación.

El flujo base incluye:

- Importe.
- Tipo: gasto o ingreso.
- Categoría.
- Título o descripción breve.
- Fecha.
- Recurrencia opcional.
- Espacio activo implícito.
- Acción de guardar.

Cualquier paso adicional debe justificarse.

### 4.4 El espacio activo es contexto global

Los espacios no son una pestaña ni una pantalla aislada.

El usuario trabaja siempre dentro de un espacio activo:

- Personal.
- Pareja.
- En el futuro: familia, convivencia, viaje u otros grupos.

Al cambiar el espacio activo, todas las pantallas deben actualizar su información sin alterar innecesariamente la posición de navegación. El espacio activo debe ser visible desde cualquier pantalla.

### 4.5 Claridad antes que decoración

Inicio debe responder rápidamente:

- ¿Cuánto he ingresado y gastado este mes?
- ¿En qué categorías estoy gastando?
- ¿Cuáles fueron mis movimientos recientes?

Las gráficas complejas no son prioridad inicial. Se permiten indicadores simples cuando aporten información inmediata.

### 4.6 Experiencia nativa en ambas plataformas

La aplicación debe funcionar correctamente en iOS y Android.

Se permiten diferencias por plataforma cuando:

- Mejoren la experiencia nativa.
- Estén encapsuladas.
- No rompan la paridad funcional.
- Estén documentadas.
- Tengan una alternativa adecuada para la otra plataforma.

### 4.7 Privacidad y propiedad

La aplicación debe distinguir claramente:

- Información personal.
- Información compartida.
- Autoría.
- Visibilidad.
- Propiedad lógica.
- Estado de sincronización.

El cliente no es la autoridad final de permisos.

---

## 5. Experiencia inicial

Flujo previsto:

1. El usuario abre la aplicación.
2. Introduce únicamente su nombre.
3. Visualiza un onboarding de dos a cuatro pantallas.
4. Entra como invitado.
5. Sus datos se almacenan localmente.
6. Prueba las funciones principales con límites razonables.
7. Cuando supera un límite o intenta compartir o sincronizar, se le invita a crear una cuenta.
8. Tras registrarse y verificar su correo, sus datos locales se migran.
9. Se crea o asigna su espacio personal remoto.

El usuario invitado no escribe datos en Supabase.

---

## 6. Navegación inicial

Propuesta base:

- **Inicio**
- **Actividad**
- **Mapa**, calendario desplazable de gastos e ingresos

`Actividad` agrupa:

- Movimientos.
- Categorías.
- Balance.
- Búsqueda.
- Filtros.
- Detalle por categoría.

Los espacios no ocupan una pestaña principal. Se seleccionan como contexto global desde el encabezado, avatar o selector.

---

## 7. Clasificación de tareas

### Tarea pequeña

Ejemplos:

- Centrar un elemento.
- Corregir un texto.
- Ajustar un espaciado.
- Cambiar un icono.
- Resolver un error localizado.

Requisitos:

- Revisar el archivo afectado.
- Comprobar si existe un token, componente o patrón aplicable.
- Hacer el cambio mínimo.
- No investigar externamente salvo necesidad real.
- No modificar código no relacionado.

### Tarea mediana

Ejemplos:

- Crear una pantalla.
- Añadir un formulario.
- Incorporar un filtro.
- Añadir una variante a un componente.
- Crear un flujo dentro de una feature existente.

Requisitos:

- Revisar la feature completa.
- Buscar componentes y hooks reutilizables.
- Evaluar librerías si la interacción no es trivial.
- Añadir pruebas proporcionales.
- Actualizar documentación si cambia el comportamiento.

### Tarea grande

Ejemplos:

- Cambiar navegación.
- Crear sincronización local-nube.
- Diseñar espacios compartidos.
- Modificar el esquema de datos.
- Introducir una dependencia transversal.
- Cambiar autenticación o autorización.

Requisitos:

- Revisar todos los documentos relacionados.
- Investigar alternativas.
- Comparar enfoques.
- Documentar la decisión.
- Definir riesgos y migración.
- Dividir el trabajo en entregas pequeñas.
- Actualizar `DECISIONS.md`.

---

## 8. Reglas rápidas

- No duplicar componentes.
- No crear carpetas sin necesidad demostrable.
- No hacer refactors no solicitados.
- No mezclar cambios funcionales con limpieza masiva.
- No implementar desde cero una interacción compleja sin evaluar soluciones existentes.
- No instalar una dependencia sin revisar mantenimiento, compatibilidad, licencia y necesidad.
- No colocar lógica de negocio crítica únicamente en la interfaz.
- No confiar en validaciones del cliente para proteger datos.
- No introducir código exclusivo de iOS sin estrategia para Android.
- No añadir fricción al registro de movimientos sin justificación.
- No asumir que un usuario tendrá siempre un único espacio.
- No guardar datos de invitados en la nube.
- No borrar datos locales hasta confirmar una migración exitosa.
- No declarar una tarea terminada con documentación desactualizada.

---

## 9. Flujo de trabajo mínimo

Antes de codificar:

1. Clasificar la tarea.
2. Leer la documentación aplicable.
3. Identificar archivos y dominios afectados.
4. Buscar soluciones internas reutilizables.
5. Evaluar dependencias externas cuando corresponda.
6. Definir el cambio mínimo necesario.

Durante:

1. Mantener el alcance.
2. Evitar refactors laterales.
3. Reutilizar tokens y componentes.
4. Mantener tipos explícitos.
5. Conservar paridad entre plataformas.
6. Añadir estados de carga, vacío, éxito y error cuando apliquen.

Antes de finalizar:

1. Ejecutar typecheck.
2. Ejecutar lint.
3. Ejecutar pruebas.
4. Verificar iOS y Android cuando corresponda.
5. Revisar accesibilidad básica.
6. Confirmar que no existe duplicación evidente.
7. Actualizar documentación.
8. Resumir qué cambió y qué no cambió.

---

## 10. Tecnologías previstas

- React Native.
- TypeScript.
- Supabase para autenticación y base de datos.
- Persistencia local para modo invitado.
- Migraciones SQL versionadas.
- Sistema central de diseño.
- Navegación tipada.
- Estado global limitado a información verdaderamente global.

La elección concreta de librerías debe documentarse cuando afecte arquitectura o mantenimiento.

---

## 11. Definición general de terminado

Una tarea está terminada cuando:

- Cumple el comportamiento solicitado.
- No introduce duplicación innecesaria.
- Respeta la arquitectura.
- Funciona en las plataformas afectadas.
- Incluye manejo de errores relevante.
- Mantiene privacidad y aislamiento por espacio.
- Cuenta con pruebas proporcionales al riesgo.
- No contiene código muerto.
- Actualiza la documentación afectada.
- Puede explicarse de forma clara y breve.

---

## 12. Orden recomendado de lectura

1. `README.md`
2. `PROJECT_RULES.md`
3. `PRODUCT.md`
4. `ARCHITECTURE.md`
5. `DATABASE.md`, si afecta datos
6. `ROADMAP.md`
7. `DECISIONS.md`

---

## 13. Principio final

> El objetivo no es escribir más código. El objetivo es construir una aplicación coherente, mantenible y fácil de usar.
