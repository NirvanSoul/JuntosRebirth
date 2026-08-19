# Estado de la rama `limpieza/fase-3`

> Instantánea del 2026-08-19. Es tu app reorganizada, no reescrita: no se ha
> quitado ninguna funcionalidad. Este archivo solo orienta; la documentación
> viva está en `Bible/`.
>
> Sustituye a `limpieza/fases-1-y-1b`, que quedó con historia divergente. Esta
> rama parte del mismo punto y continúa el trabajo.

## Por dónde empezar

| Documento                                    | Qué cuenta                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`Bible/PLAN.md`](./Bible/PLAN.md)           | Qué se ha hecho, qué falta y por qué. Las secciones §7 y §8 tienen la historia completa con evidencia. |
| [`Bible/WORKFLOW.md`](./Bible/WORKFLOW.md)   | Cómo se trabaja: qué revisiones exige cada cambio y qué evidencia hay que aportar.                     |
| [`Bible/DECISIONS.md`](./Bible/DECISIONS.md) | Historial de decisiones técnicas. Se consulta por índice, no se lee entero.                            |

## Cinco defectos reales encontrados y corregidos

Ninguno era visible en la suite de pruebas. Los cinco compartían la misma causa
de fondo: **una prueba en verde que no reproducía la condición real**.

**1. La sincronización compartida no funcionaba en ningún sentido.**
Dentro de una transacción exclusiva de SQLite se usaba la conexión global, lo
que provoca un interbloqueo documentado por Expo SQLite. El error lo silenciaba
un `catch` vacío: los datos subían al servidor y jamás bajaban al otro
dispositivo. Verificado tras la corrección en dos teléfonos físicos: llega en
unos 2 segundos, en ambos sentidos y sin duplicarse.

**2. El onboarding ignoraba «Reducir movimiento».**
La preferencia del sistema se lee de forma asíncrona y llegaba después de que la
animación hubiera empezado.

**3. La importación categorizaba con el catálogo equivocado.**
Al reabrir el modal o cambiar de espacio se usaban las categorías del espacio
anterior.

**4. Los resúmenes por categoría sumaban monedas distintas.**
Una categoría con 10 EUR y 40 VES mostraba «50 €». Ahora cada espacio tiene su
moneda principal, los totales se aíslan por divisa y el presupuesto solo se
compara contra gastos en la moneda del espacio.

**5. La recuperación de contraseña desde una invitación era un callejón sin
salida**, y al cablearla apareció un segundo defecto: verificar el código creaba
una sesión que expulsaba al usuario del flujo antes de poder escribir la
contraseña nueva.

## Estado del trabajo

**Cerrado:** limpieza de imports y helpers duplicados, optimización de imágenes
(8,70 → 7,04 MiB), auditoría de supresiones de lint, spike de sincronización
end-to-end, y todo el modelo y consumo de monedas, verificado en dos teléfonos.

**En curso:** un lote de seis tareas pequeñas. Dos están implementadas y
esperando revisión y prueba en dispositivo —ver la contraseña al escribirla, y
cerrar la espera muerta al registrarse con un correo ya usado—. Una está
bloqueada esperando autorización para tocar la base de datos.

**Pendiente y decidido pero sin empezar:** un indicador de novedades en el
selector de espacio, los decimales de monedas sin céntimos (JPY, CLP, PYG), y la
internacionalización a español e inglés, que debe completarse antes de publicar
en tiendas.

## Backend

Las migraciones SQL de `supabase/migrations/` levantan un proyecto Supabase
desde cero; se comprobó creando uno limpio y aplicándolas en orden. La migración
23 preserva la moneda al migrar datos de invitado sin sobrescribir las
existentes.

El número 09 no existe: es un hueco heredado, documentado a propósito y no
rellenado, porque renumerar migraciones ya aplicadas es destructivo.

## Cómo se trabaja aquí

Cada cambio pasa por revisión de dos verificadores independientes cuando toca
dinero, sincronización, permisos, autenticación o navegación. Toda corrección de
un defecto exige una prueba que **falle antes** del arreglo y pase después, con
ambas ejecuciones adjuntas. Los archivos grandes tienen un tope automático que
impide que crezcan sin justificación escrita.

## Lo que no se ha tocado

Ninguna funcionalidad se ha eliminado.
