# Estado de la rama `main`

> Instantánea del 2026-08-20. Es tu app reorganizada, no reescrita: no se ha
> quitado ninguna funcionalidad. Este archivo solo orienta; la documentación
> viva está en `Bible/`.
>
> El trabajo venía de `limpieza/fase-3` y continúa aquí, sobre `main`, tras el
> traspaso del código. Las ramas `limpieza/fase-3` y `limpieza/fases-1-y-1b`
> quedan como historia y ya no reciben commits.

## Aviso antes de instalar esta rama

**No instales esta rama en un teléfono con datos reales.** Está a mitad de un
cambio en la escala monetaria (ADR-080): el formateo ya usa la unidad menor real
de cada divisa, pero la entrada por teclado todavía asume dos decimales. Con
euros, dólares o bolívares el comportamiento es el de siempre; con yenes, pesos
chilenos o guaraníes los importes se guardarían con un factor equivocado. El
cambio se despliega completo o no se despliega: es una regla escrita, no un
descuido.

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

**Cerrado.** Limpieza de imports y helpers duplicados, optimización de imágenes
(8,70 → 7,04 MiB), auditoría de supresiones de lint, spike de sincronización
end-to-end, y todo el modelo y consumo de monedas, verificado en dos teléfonos.
Cerrado también el frente SQL: las migraciones 24 y 25 retiran la ejecución
anónima de seis funciones —solo la vista previa de invitación la conserva a
propósito— y dejan `legal_acceptances` con permiso de lectura e inserción y
nada más. Las doce suites pgTAP pasan contra staging: 174 aserciones; en
local, con la migración 26 aún sin publicar, son trece archivos y 186 tests.

**En curso.** La escala monetaria real por divisa (ADR-080), en tres entregas.
Las dos primeras están cerradas y verificadas: catálogo con la unidad menor de
cada moneda, formateo, importación, entrada por teclado y calculadora. La
tercera —inmutabilidad de `spaces.currency` en PostgreSQL— está implementada
en local y pasó revisión: los dos bloqueantes detectados (enteros inseguros en
la calculadora y un bypass del RPC `migrate_guest_data` sobre la moneda) están
cerrados y documentados en `Bible/DECISIONS.md` (ADR-080). Falta publicar la
migración 26 en staging, repetir la suite enlazada y hacer los smokes físicos;
el despliegue sigue siendo conjunto para las tres entregas.

**Pendiente, ya decidido.** La Fase 4 está abierta en siete frentes: autoría
visible de cada movimiento, perfiles y avatares de miembros, cuentas de dinero,
consolidación visual, copias entre espacios, internacionalización a español e
inglés, e inicio de sesión con Google y Apple. Las tres primeras son capacidades
que tú propusiste y que entran como alcance obligatorio del MVP, implementadas
desde los contratos de esta rama.

**Pendiente de decisión.** La librería `xlsx`, que se usa en tiempo de ejecución
para importar y arrastra vulnerabilidades sin versión corregida. El flujo legal
ya no está aquí: el macrobloque de integración (ADR-083) lo implementó, con la
puerta de sesión obligatoria, el paso legal en el registro y la intención
durable. El Gate 2 (ronda 1) rechazó cinco bloqueantes conductuales (B1–B5) y
dos condiciones (C1–C2); se corrigieron escribiendo primero la tabla de
transiciones de la puerta y una prueba roja por bloqueante. La ronda 2
(2026-08-24) rechazó B6–B8 —identidad del snapshot, sesión del OTP viva al
cancelar y ranura única de intención—; los tres se corrigieron con prueba roja
previa por defecto y evidencia `COMANDO`+`EXIT=`. El veredicto conjunto de la
ronda 3 aprobó B6 y B8 sin reservas y rechazó B7 con dos rutas nuevas en
`AuthModal` (Atrás desde reset sin `cancelReset`, y cierre manual que despausaba
por orden de efectos); la ronda 4 corrigió B7 de forma estructural —pausa
gobernada solo por la fase de recuperación, toda salida posterior a la sesión
del OTP por `cancelReset`, descarte manual desactivado durante la recuperación
y guards en `useRecoveryPhase`— con tres pruebas rojas de transición real. El
veredicto de la ronda 4 (GPT) aceptó esa base pero rechazó la entrega por B9
(guardar la contraseña después de un `cancelReset` fallido dejaba la máquina
incoherente: cierre por éxito con pausa retenida y sesión recién terminada) e
I1 (la idempotencia de `cancelReset` no era atómica: dos llamadas inmediatas
abrían dos `signOut`). La ronda 5 introdujo `completeRecovery` —terminación
confirmada tras el éxito real de la nueva contraseña, `inactive` sin `signOut`,
serializada detrás de una cancelación en vuelo— y la publicación síncrona de la
fase en la ref, con una prueba roja por anfitrión y una prueba directa del hook.
Queda corregida la afirmación previa: `requestClose` es el único camino de
cancelación hacia `onClose`; el cierre por éxito es una transición distinta.
Validación actual: **135 suites / 883
pruebas / EXIT=0**. Queda el veredicto de la ronda 5 del Gate 2 y, solo
después, el smoke físico (recuperación de contraseña incluida, y con
`enable_confirmations` activado en local para los pasos del OTP) antes de
marcar la tarea cerrada.

## Backend

Las migraciones SQL de `supabase/migrations/` levantan un proyecto Supabase
desde cero; se comprobó creando uno limpio y aplicándolas en orden. La migración
23 preserva la moneda al migrar datos de invitado sin sobrescribir las
existentes, y la 26 consolida `spaces.currency` como inmutable: ni escrituras
directas autenticadas ni el RPC de migración pueden cambiarla después de crear
el espacio.

El número 09 no existe: es un hueco heredado, documentado a propósito y no
rellenado, porque renumerar migraciones ya aplicadas es destructivo. Las
migraciones nuevas de esta rama siguen desde el 26.

## Cómo se trabaja aquí

Cada cambio pasa por revisión de dos verificadores independientes cuando toca
dinero, sincronización, permisos, autenticación o navegación. Toda corrección de
un defecto exige una prueba que **falle antes** del arreglo y pase después, con
ambas ejecuciones adjuntas. Los archivos grandes tienen un tope automático que
impide que crezcan sin justificación escrita.

## Lo que no se ha tocado

Ninguna funcionalidad se ha eliminado.
