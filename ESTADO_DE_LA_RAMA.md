# Estado de la rama `limpieza/fases-1-y-1b`

> Instantánea del 2026-08-17. Es tu app reorganizada, no reescrita: no se ha
> quitado ninguna funcionalidad. Este archivo solo orienta; la documentación
> viva está en `Bible/`.

## Por dónde empezar

| Documento                                    | Qué cuenta                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`Bible/PLAN.md`](./Bible/PLAN.md)           | Qué se ha hecho, qué falta y por qué. Las secciones §7 y §8 tienen la historia completa con evidencia. |
| [`Bible/WORKFLOW.md`](./Bible/WORKFLOW.md)   | Cómo se trabaja: qué revisiones exige cada cambio y qué evidencia hay que aportar.                     |
| [`Bible/DECISIONS.md`](./Bible/DECISIONS.md) | Historial de decisiones técnicas. Se consulta por índice, no se lee entero.                            |

## Tres bugs reales encontrados y corregidos

Ninguno de los tres era visible en la suite de pruebas.

**1. La sincronización compartida no funcionaba en ningún sentido.**
Dentro de una transacción exclusiva de SQLite se usaba la conexión global, lo
que provoca un interbloqueo (`database is locked`) documentado por Expo SQLite.
El error lo silenciaba un `catch` vacío, por eso nunca se vio: los datos subían
al servidor correctamente y jamás bajaban al otro dispositivo. Verificado tras
la corrección en dos teléfonos físicos: el movimiento aparece en unos 2
segundos, en ambos sentidos y sin duplicarse.

**2. El onboarding ignoraba «Reducir movimiento».**
La preferencia del sistema se lee de forma asíncrona y llegaba después de que la
animación hubiera empezado, así que un usuario con esa opción activada veía la
animación igualmente.

**3. La importación categorizaba con el catálogo equivocado.**
Al reabrir el modal o cambiar de espacio, las categorías usadas para clasificar
los movimientos importados eran las del espacio anterior.

## Trabajo en curso: las monedas

La app guardaba correctamente la divisa de cada movimiento, pero los resúmenes
por categoría **sumaban importes de monedas distintas** y lo etiquetaban todo
como euros. Una categoría con 10 EUR y 40 VES mostraba «50 €».

El modelo ya está corregido y verificado: cada espacio tiene su moneda
principal, propagada al cliente, a la sincronización y a la migración de datos
de invitado.

La parte de interfaz —el último commit de la rama— **está en revisión con
defectos pendientes**. No la tomes como terminada.

## Backend

Las migraciones SQL de `supabase/migrations/` levantan un proyecto Supabase
desde cero; se comprobó creando uno limpio y aplicándolas en orden. Hay una
migración nueva, la 23, que preserva la moneda al migrar datos de invitado sin
sobrescribir las ya existentes.

Ojo: el número 09 no existe. Es un hueco heredado, documentado a propósito y no
rellenado, porque renumerar migraciones ya aplicadas es destructivo.

## Lo que no se ha tocado

Ninguna funcionalidad se ha eliminado. Los archivos grandes siguen ahí, pero con
un tope automático que impide que crezcan: cada vez que alguien los toca, o los
reduce o tiene que justificarlo por escrito.
