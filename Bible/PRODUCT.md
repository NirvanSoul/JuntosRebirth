# PRODUCT.md

## 1. Propósito

Este documento define la visión funcional y de experiencia de `juntoss`. Debe impedir que nuevas pantallas o funcionalidades contradigan el producto principal.

---

## 2. Resumen

`juntoss` es una aplicación móvil de finanzas personales que comienza como herramienta individual y permite compartir dinero de forma selectiva con una pareja.

A largo plazo, el mismo modelo podrá ampliarse a:

- Familias.
- Personas que conviven.
- Viajes.
- Grupos de amigos.
- Proyectos compartidos.

La primera versión se enfoca en el caso personal y de pareja. La arquitectura puede prepararse para múltiples espacios, pero la interfaz no debe exponer complejidad futura antes de tiempo.

---

## 3. Propuesta de valor

La aplicación debe permitir:

- Registrar un gasto o ingreso en pocos segundos.
- Saber cuánto dinero está disponible.
- Entender en qué se gasta.
- Organizar movimientos mediante categorías.
- Probar la app antes de registrarse.
- Mantener separadas las finanzas personales y compartidas.
- Compartir únicamente dentro del espacio elegido.
- Trabajar con una pareja sin perder autoría ni control.
- Abandonar un espacio sin destruir información válida.

La aplicación no debe sentirse como una hoja de cálculo ni como una herramienta contable profesional.

---

## 4. Usuarios

### Usuario individual

Organiza ingresos, gastos, balance y categorías sin compartir.

### Pareja

Dos personas organizan parte de sus finanzas juntas sin fusionar automáticamente sus espacios personales.

### Grupos futuros

Familias, convivientes, amistades o grupos temporales. No son requisito de la primera versión.

---

## 5. Conceptos del dominio

### Usuario

Es una persona con cuenta registrada y correo verificado.

### Espacio

Contexto financiero que contiene miembros, movimientos, categorías, configuración y permisos.

Tipos iniciales:

- Personal.
- Pareja.

Tipos futuros:

- Familia.
- Hogar.
- Viaje.
- Grupo.
- Otro.

### Espacio activo

Contexto global que determina los datos mostrados y creados en Inicio, Actividad, Mapa, Categorías, Ahorros, Planes, filtros y formularios.

### Movimiento

Registro financiero de tipo gasto o ingreso.

Campos mínimos:

- Identificador.
- Importe.
- Moneda.
- Tipo.
- Título.
- Categoría.
- Fecha.
- Espacio.
- Autor.
- Fechas técnicas.
- Estado de sincronización.
- Recurrencia opcional.

### Categoría

Agrupa movimientos y puede contener tanto gastos como ingresos.

Cada espacio ofrece un catálogo de 18 plantillas, dividido en dos páginas de
nueve para su selección rápida:

- Salario, Supermercado, Vivienda, Transporte, Servicios, Restaurantes,
  Compras, Salud y Salidas.
- Freelance, Familia, Ocio, Educación, Suscripciones, Viajes, Mascotas, Deudas
  y Otros.

Las plantillas no son categorías creadas: en el modal de nueva categoría el
usuario puede seleccionar tantas como quiera y se copian juntas al espacio
activo mediante la acción Guardar. Las plantillas ya creadas permanecen
visualmente desactivadas, no muestran una marca de selección y explican «Ya
creaste esta categoría» al volver a tocarlas. Las 18 plantillas usan 18 colores
distintos, construidos como variaciones de la misma identidad visual. El usuario
también puede usar esa paleta completa al añadir categorías personalizadas con
nombre, color e icono. El selector de color de categorías y cuentas comparte
la misma paleta, en su orden visual definido en `src/theme/categoryColors.ts`,
con muestras cuadradas de radio 16 y una separación visible entre ellas. El
selector de iconos agrupa opciones relacionadas bajo subtítulos, en tres filas
dentro de un único carrusel horizontal. Ninguna categoría de plantilla o personalizada existe
implícitamente en otro espacio. Los iconos de categoría usan siempre su
variante rellena para mantener una identidad visual consistente.

En el detalle de un movimiento, el icono grande de la categoría abre el
detalle de esa categoría; la fila `Categoría` es la que permite cambiarla.

Una categoría puede tener un presupuesto opcional por moneda: cada moneda
tiene el suyo, independiente, o ninguno. Cada presupuesto tiene periodicidad
mensual (por defecto), semanal, quincenal o personalizada (cada N días, de 2 a
365, desde una fecha de inicio). Se reinicia en cada periodo y solo lo
consumen los gastos del periodo en curso en su moneda, incluidos los
recurrentes programados dentro de él. Inicio, Actividad y el detalle de la
categoría muestran el presupuesto de la moneda que se está viendo; si esa
moneda no tiene presupuesto, no se muestra ninguno y el detalle ofrece
`Añadir presupuesto` en esa moneda. El selector de moneda del detalle incluye
también las monedas con presupuesto aunque aún no tengan movimientos. El importe de un
periodo concreto, pasado o futuro, puede cambiarse sin tocar el resto, y la
periodicidad puede cambiar desde un periodo en adelante conservando la
anterior en los periodos previos. Cambiarla para todo el presupuesto, desde el
detalle de la categoría, descarta esos importes y tramos, avisándolo antes de
guardar. Cuando existe, las vistas previas pueden mostrar el progreso del gasto
del periodo frente a ese límite; cuando no existe, no deben simular ni mostrar
un anillo de progreso.

Ejemplo:

- Casa → reparación.
- Casa → venta de un mueble.

### Cuenta

Dónde está guardado el dinero. Solo hay tres tipos —efectivo, cuenta bancaria
y tarjeta—, porque son los que cualquiera distingue sin pensarlo. Es el segundo
eje de clasificación de un movimiento, junto a la categoría, y siempre
**opcional**: un movimiento sin cuenta es igual de válido y no afecta a ningún
saldo.

Una cuenta pertenece a un espacio, como la categoría, y tiene nombre, tipo,
color, icono, moneda y saldo inicial. Al crearla, el saldo inicial se registra
como un movimiento de hoy asociado a la cuenta: positivo como ingreso y
negativo como gasto. Así su saldo y el balance total comparten la misma fuente
de verdad. Una cuenta puede guardar varias monedas —hay bancos que
lo permiten— y cada una lleva su propio saldo; nunca se suman entre sí. Al
registrar un movimiento solo se ofrecen cuentas que guarden su moneda. El tipo
solo propone el icono y el color al crearla: los tres calculan el saldo igual y
cualquiera puede quedar en negativo.

El selector de cuenta —desde el formulario de movimiento, el detalle de un
movimiento y el cambio de divisa— muestra cada cuenta como su tarjeta de
preview en tamaño compacto, con icono, monedas, nombre, tipo y saldo. Las
tarjetas van en dos filas, dos por fila y cada una de la mitad del ancho
disponible; con más de cuatro cuentas las filas se recorren en horizontal. La
tarjeta elegida se rellena con el color de su cuenta y su texto e icono pasan a
blanco. Debajo, en una misma fila, `Sin cuenta` y `Crear cuenta` usan el badge
de creación de la sección de cuentas de Actividad: `Sin cuenta` lleva un signo
menos sobre fondo oscuro en lugar del más violeta y, al elegirla, marca su borde
con ese mismo tono oscuro. Si desde el selector del detalle de un movimiento se
crea una cuenta, esta nace con la moneda del movimiento, queda asignada a él al
guardarse y el selector se cierra. Toda cuenta creada se confirma con el aviso
inferior `Cuenta «nombre» creada`, con el icono de la cuenta sobre su color. En el selector la pulsación
larga no abre editar ni eliminar.

Después de registrar movimientos, las monedas ya guardadas y sus saldos
iniciales no se pueden alterar. Una cuenta nueva nace solo con la moneda
principal del espacio y el usuario indica su saldo inicial en el segundo paso.
Al asignarle por primera vez un movimiento de otra moneda, esa divisa se añade
automáticamente con saldo inicial cero: no reinterpreta los movimientos
existentes.

La vista previa de Inicio muestra las divisas de cada cuenta con su color y el
saldo de su moneda principal. Cuando el saldo de cierre de esa moneda en el mes
anterior no es cero, enseña su variación porcentual; las divisas nunca se
agregan para producir un único porcentaje.

El nombre y el icono son libres en los tres tipos, y el tipo se elige en una
sola fila con las tres opciones. El saldo inicial es opcional y se escribe
tal cual, con un signo menos delante si se arrastra una deuda: no hay un
control aparte para el signo, porque ese caso es poco frecuente y conviene
esperar al uso real antes de darle interfaz propia.

Eliminar una cuenta la archiva y conserva sus movimientos. Las transferencias
entre cuentas quedan fuera de esta versión.

### Balance

Definición consistente:

`balance = ingresos - gastos`

### Ahorro o plan

Objetivo financiero individual o compartido. Su implementación completa no forma parte del núcleo inicial.

---

## 6. Principios de experiencia

- Registrar dinero debe ser rápido.
- El espacio activo debe ser visible.
- Mostrar primero lo esencial.
- No forzar registro inicial.
- Mantener nombres y comportamientos consistentes.
- Hacer comprensible qué es personal y qué es compartido.
- No trasladar complejidad técnica al usuario.

---

## 7. Onboarding

### Objetivo

Explicar el uso personal y compartido en una única lámina, preguntar si se
permiten las notificaciones y completar el flujo con nombre, país, al menos
tres categorías, primer ingreso, primer gasto, cierre y acceso.

### Flujo propuesto

1. Captura del nombre.
2. Elección de país y moneda principal.
3. Uso personal y compartido.
4. Activación opcional del permiso de notificaciones.
5. Creación de al menos tres categorías.
6. Primer ingreso.
7. Primer gasto.
8. Cierre y listo para explorar.
9. Acceso: iniciar sesión o crear cuenta.

El acceso a la aplicación requiere una cuenta con correo verificado.

### Mensajes sugeridos

1. **Control diario:** registra ingresos y gastos en segundos.
2. **Organización clara:** usa categorías para entender tu dinero.
3. **Comparte cuando decidas:** mantén un espacio personal y crea otro con tu pareja.
4. **Tus datos continúan contigo:** se guardan localmente y se sincronizan con tu cuenta.

### Reglas

- Nueve pantallas en total; la última reutiliza el flujo real de Acceso.
- Todo el recorrido previo a una sesión verificada, incluidos onboarding,
  acceso, registro, inicio de sesión, OTP y recuperación, usa siempre el tema
  claro aunque la preferencia guardada o la del sistema sea oscura.
- El onboarding es la primera pantalla de una instalación nueva y se marca
  como completado al llegar a Acceso, aunque la autenticación ocurra después.
- Tras cerrar sesión, no se repite: el usuario vuelve directamente a Acceso.
- En Acceso, «Crear cuenta» e «Iniciar sesión» (y por tanto Google) quedan
  desactivados hasta marcar la casilla «Acepto los Términos de servicio y la
  Política de privacidad»; cada documento se abre dentro de la app. Al
  autenticar se registra la aceptación de las versiones vigentes en
  `POST /v1/me/legal-acceptances`; un fallo al registrarla no bloquea la entrada.
- La lámina de uso personal y compartido («Juntos, pero no revueltos») avanza mediante «Continuar» hacia la pregunta de notificaciones, sin botón de omitir.
- La lámina de notificaciones explica que los avisos sirven para recordatorios
  activados e invitaciones. `Activar notificaciones` solicita el permiso nativo
  y `Ahora no` continúa sin solicitarlo. Conceder o denegar nunca bloquea el
  paso a categorías.
- Pedir un primer ingreso y un primer gasto al final, para dejar el espacio local con datos reales.
- En los pasos 5, 6 y 7, enseñar la creación con el mismo botón flotante y el
  mismo menú de opciones de la app; las acciones ajenas al paso permanecen
  visibles pero deshabilitadas.
- No hay transición de pantalla entre láminas: el indicador de progreso se
  mantiene fijo y el segmento del paso que entra se rellena de izquierda a
  derecha, como el progreso de una story, mientras ilustración, título,
  subtítulo, contenido y botones de la lámina nueva suben escalonados desde
  abajo con la misma entrada de Home (`getOnboardingEntering`). Pulsar la
  acción que avanza (`Continuar`, `Ahora no`, etc.) da una respuesta háptica
  ligera.
- La ilustración cede alto si la lámina no cabe (imagen de borde a borde,
  textos largos o acción secundaria), de modo que `Atrás` y el botón principal
  ocupan siempre la misma posición al pie en todas las láminas.
- Permitir omitir cuando corresponda.
- No repetirlo sin acción explícita.

---

## 8. Activación de cuenta

Cuando el usuario se registra:

1. Se crea la cuenta.
2. Se verifica el correo con el código OTP de Better Auth.
3. Se crea o recupera el espacio personal remoto.
4. Se restaura su copia local/remota asociada a la cuenta.
5. Se muestra la aplicación.

---

## 9. Autenticación

### Registro

- Correo.
- Contraseña, con un segundo campo para confirmarla.
- Nombre editable.
- El registro se presenta a pantalla completa en cuatro pasos, con progreso.

### Verificación

La interfaz no debe asumir una longitud rígida del código. Debe aceptar la configuración real del proveedor, permitir pegar el código completo, reenviar con control y preservar los datos locales.

### Inicio de sesión

Al iniciar sesión se restauran únicamente los datos de la cuenta autenticada.

---

## 11. Navegación principal

Tiene tres destinos principales:

Al volver a pulsar Inicio o Actividad estando ya en ese destino, su contenido
se desplaza de forma animada al inicio.

### Inicio

- Espacio activo.
- Balance disponible como cifra principal, libre sobre el fondo.
- Selector de periodo sobre el arco de ingresos y gastos: el mismo de
  Categoría y los donuts, con el periodo en el centro que despliega `Todos`,
  semanal, quincenal, mensual, anual y `Personalizada`. Abre en el mes en curso
  y se conserva al cambiar de pantalla.
- Ingresos y gastos del periodo elegido.
- Un anuncio nativo de Google AdMob bajo los ingresos y gastos, con la
  etiqueta `Anuncio`. Solo aparece tras el mensaje de consentimiento de Google
  y no ocupa espacio si no hay anuncio. En desarrollo usa el bloque de prueba.
- Progreso circular por categoría únicamente cuando tenga presupuesto.
- Vista previa de categorías.
- Vista previa de cuentas.
- Movimientos recientes.
- Crear gasto.
- Crear ingreso.

Cuando todavía no existan categorías o movimientos, Inicio presenta tarjetas
accionables con la misma jerarquía tipográfica y una flecha de avance. La
tarjeta de categorías abre su flujo de creación y la de actividad abre
directamente la creación de un gasto. Estos estados no deben aparecer como
texto suelto sin una acción asociada.

Las secciones `Categorías` y `Movimientos Recientes` incluyen una acción
secundaria `Ver más`, visualmente ligera y de menor jerarquía que el título. La
primera abre Actividad posicionada en categorías y la segunda la posiciona en
movimientos; cambiar de pestaña sin llegar al bloque correspondiente no se
considera navegación completa.

El balance no se encierra en una tarjeta independiente. Los ingresos y gastos
del mes aparecen debajo como indicadores compactos, y la pantalla no debe
saturarse con gráficas complejas.

Inicio trabaja con un horizonte mensual. El balance acumula los movimientos de
meses anteriores y todos los ingresos y gastos registrados para el mes local
actual, aunque su día todavía no haya llegado. El arco y los indicadores de
ingresos y gastos muestran el periodo elegido en el selector (por defecto, ese
mes completo, con las recurrencias proyectadas si el periodo es futuro). El
balance disponible también sigue al selector: es el que quedaba al cerrar el
periodo elegido, es decir, lo que sobró de los periodos anteriores más lo del
periodo, igual que en Mapa. Con `Todos` es el balance acumulado actual. Ningún movimiento de un mes
posterior entra todavía en el balance, los totales, los presupuestos, las
categorías ni los movimientos recientes; sigue visible en Mapa para poder
consultarlo y editarlo.

Los indicadores compactos de ingresos y gastos son accionables. Cada uno abre
su propio modal con los movimientos del tipo elegido y permite
alternar entre semana, quincena (días 1–15 o 16–fin), mes y año. Sobre esos
filtros reutiliza el navegador temporal con flechas de la gráfica de Actividad:
su título muestra el mes, el rango semanal, el rango quincenal o el año elegido.
Permite recorrer periodos históricos y futuros. Al avanzar a meses posteriores,
proyecta en memoria las ocurrencias semanales, quincenales y mensuales de las
series abiertas sin sumarlas al resumen de Inicio ni persistir filas por
adelantado. Los filtros reutilizan la opción seleccionable compartida, con
superficie blanca y, al seleccionar, texto violeta y el mismo borde en violeta
en lugar de gris, sin check, para que quepan en una sola fila. Debajo muestran una tarjeta con el total de ingresos o gastos del
periodo seleccionado. La acción `Añadir ingreso` en verde o `Añadir gasto` en
rojo flota sobre el listado, anclada al pie del modal, para que nunca se pierda
por mucho que se baje.

Al terminar los movimientos del periodo elegido, el listado sigue hacia atrás
con los del periodo anterior, sin título propio, y al acercarse al final se
añade el siguiente. Se saltan los periodos sin movimientos y se detiene en el
primero registrado. El selector de periodo queda fijo arriba y, al bajar, pasa
al periodo que se está viendo (por ejemplo, de `Octubre 2026` a
`Septiembre 2026`); usar sus flechas u opciones desde ahí elige ese periodo y
vuelve el listado arriba. Así se revisan meses anteriores sin subir a cambiar
el selector; la tarjeta de total sigue refiriéndose solo al periodo elegido.
Con `Todos` no hay periodos anteriores.

Los movimientos de estos modales admiten la misma pulsación larga que en
Inicio y Actividad: abre sus acciones (editar, copiar, eliminar) y eliminar o
copiar pasan a la selección múltiple para actuar sobre varios a la vez.

El bloque completo de `Balance disponible`, incluidos su texto y su importe, es
accionable y abre una tercera variante del mismo modal. Esta combina ingresos y
gastos en un único listado, conserva los mismos filtros y navegador temporal y
muestra en la tarjeta resumen el balance del periodo. Su acción flotante dice
`Añadir movimiento` y abre el formulario con la posibilidad de alternar el tipo.

En un espacio juntos, las tres variantes muestran en la cabecera, a la izquierda
del botón de cerrar, el mismo botón de filtros de Actividad. Abre la variante
del modal de filtros que contiene solo `Autor`, porque el periodo ya vive a la
vista; el filtro elegido afecta al total, a la comparación y al listado. Al
abrir el modal se toma el autor filtrado en Actividad, o `Ambos` desde Inicio.

Las vistas previas de categoría y de movimiento con datos son accionables. Al
tocarlas abren directamente el modal de detalle del elemento elegido, sin
obligar a pasar antes por Actividad.

Cuando varias ocurrencias proceden de una misma recurrencia personalizada, las
listas de Inicio, Actividad y detalle de categoría las presentan como una única
preview apilada. Una flecha descendente dentro de la tarjeta despliega las
ocurrencias restantes como una rama sencilla: las tarjetas reales salen de
debajo de la principal con un fade breve de arriba abajo y desplazan suavemente
el contenido posterior. Al cerrar se comprimen en ese mismo orden, de arriba
abajo. La transición respeta la preferencia de movimiento reducido. El límite
de ocho movimientos recientes se aplica después de formar estos grupos, para
que un solo lote no desplace al resto de la actividad. Movimientos recientes
ordena por el instante en que cada movimiento se creó o se editó por última
vez, no por su fecha económica: un movimiento con fecha pasada o futura sube
al principio en cuanto se registra o se modifica. Actividad, Mapa y el
detalle de categoría, en cambio, ordenan por fecha económica. Cuando hay más
movimientos de los que caben en ese límite, debajo de la lista aparece un
enlace `Ver más movimientos` que lleva al mismo destino que el `Ver más` de la
cabecera de la sección, para no obligar a volver arriba tras revisar la
lista.

### Actividad

Nombre de trabajo para agrupar:

- Todos los movimientos.
- Balance.
- Distribución por categoría con selector de gastos e ingresos.
- Búsqueda.
- Filtro por fecha fuera del modal: el selector de periodo de Categoría va
  justo encima de los badges de balance, ingresos y gastos de Movimientos y se
  aplica al momento. No cuenta como filtro activo del botón de filtros.
  Empieza en el mes en curso; «Desde el inicio» (`Todos`) se elige a mano.
- Con «Desde el inicio», la lista va por meses, cada uno con su subtítulo
  («Noviembre 2026»): primero el mes en curso, al bajar los doce meses
  siguientes con lo previsto (recurrencias proyectadas y movimientos con fecha
  futura) y, tras el último, los meses anteriores hacia atrás. Dentro de cada
  mes, del día más reciente al más antiguo. Con cualquier otro periodo la
  lista es solo la de ese periodo, sin subtítulos.
- Cada subtítulo de mes es un botón con la flecha de las secciones de
  Actividad a la derecha, en la misma línea: pulsarlo pliega o despliega los
  movimientos de ese mes con la misma animación. Los meses plegados se
  recuerdan mientras Actividad sigue abierta.
- Filtro por tipo.
- Filtro por categoría.
- Filtro por recurrencia.
- Filtro por moneda cuando el espacio contiene movimientos en dos o más monedas.
- Filtro por autor en un espacio juntos: `Ambos`, `Yo` y el nombre de la
  pareja, en tres botones de una misma fila. Cuenta como de la pareja solo lo
  que firmó ella; lo creado antes de iniciar sesión o sin conexión es propio.
  El autor elegido se hereda al abrir desde Actividad los modales de gastos,
  ingresos y balance y el detalle de categoría.
- Con algún filtro aplicado, el botón de filtros —en cualquier pantalla— pinta
  su icono y su borde en violeta. Al aplicar, un aviso inferior como el de un movimiento
  creado confirma `Filtro aplicado` (o `Filtros quitados` si se limpian).
- Mapa filtra su calendario y su resumen mensual por tipo, categoría,
  recurrencia y, en un espacio juntos, autor; el mes y la moneda se eligen
  fuera del modal.
- Los filtros de Actividad y de Mapa se conservan al cambiar de pantalla o de
  pestaña y vuelven a su estado inicial al cerrar la app; solo viven en
  memoria.
- Detalle de movimiento.
- Categorías.
- Detalle de categoría.
- Movimientos asociados.
- Cuentas.
- Detalle de cuenta.

Las secciones `Categorías` y `Cuentas` se muestran plegadas la primera vez
que se abre Actividad. La aplicación recuerda en el dispositivo el último
estado elegido para cada una. Dentro de Categorías, junto a `Detalle por
categoría`, un botón alterna entre el listado continuo y una cuadrícula de tres
columnas formada por las mismas tarjetas de vista previa de Inicio, con borde
gris sutil; la aplicación también recuerda la última vista elegida. El icono
siempre indica la vista a la que se cambiará y el cambio se presenta con una
transición breve que respeta el movimiento reducido del sistema.

Debajo del título `Movimientos`, Actividad muestra un resumen compacto de
ingresos, gastos y balance. Las tres cifras se calculan sobre el mismo conjunto
de movimientos que presenta el listado y se actualizan al combinar o limpiar
sus filtros. Con «Desde el inicio» resumen el mes que se está viendo: cambia
cuando el subtítulo de un mes llega bajo el resumen fijo, y muestra los
ingresos y gastos de ese mes y el balance acumulado hasta su último día, que
arrastra el de los meses anteriores. Cuando el resumen alcanza la parte superior al recorrer los
movimientos, permanece flotando en la franja del selector de espacio y lo
sustituye temporalmente: el mismo bloque de badges pasa a sticky con una
transición breve y un borde visible, mientras el selector sale hacia la
izquierda. El selector reaparece y el bloque vuelve a su posición original al
volver por encima del resumen o al cambiar de pantalla. Cada badge abre la misma variante reutilizable de reporte temporal
que su acceso equivalente en Inicio, con navegación histórica y futura y la
acción para añadir un ingreso, gasto o movimiento. El conjunto incluye el mes local actual completo y excluye los
meses posteriores, que continúan accesibles desde Mapa.

Debajo de la sección de categorías aparece la sección `Cuentas`, también
plegable. La encabeza el mismo donut que reparte las categorías, aquí repartido
por cuenta: el arco de cada una crece con su importe y la leyenda de badges
lleva su color y su nombre. Su selector alterna entre gastos e ingresos —para
saber qué cuenta genera más de cada uno— y su encabezado usa el mismo selector
de periodo que la gráfica de categorías. Reparte solo la moneda
seleccionada en los movimientos, nunca suma divisas distintas, y deja fuera los
movimientos sin cuenta. Tocar un badge abre el detalle de esa cuenta. Debajo,
presenta el encabezado `Detalles por cuenta` con un botón que alterna entre la
lista compacta con icono, nombre y saldo y las tarjetas de cuenta físicas
desplazables en horizontal; ambas vistas no se muestran a la vez. Tocar una
tarjeta o una fila abre el
detalle de la cuenta, con su saldo, el saldo inicial, los totales de ingresos
y gastos, sus movimientos y las acciones de editar y eliminar. Cada tarjeta
muestra el saldo en la moneda de su propia cuenta, así que el selector de
moneda de los movimientos no las filtra ni mezcla divisas, y no se muestra
ningún total agregado de todas las cuentas. La variación frente al mes anterior
solo aparece si esa cuenta tuvo al menos un movimiento en dicho mes; su saldo
inicial o la ausencia de actividad no se usan como una base de comparación.
El cambio entre ambas vistas usa la misma transición breve de salida y entrada
que el selector de vista de Categorías y respeta el movimiento reducido.

Crear una cuenta se hace desde ahí: con el estado vacío cuando no hay ninguna
y con `Añadir cuenta` bajo la lista cuando ya existen. El botón flotante de
crear no ofrece cuentas: es para registrar dinero, no para configurarlo.

Inicio repite esa sección debajo de las categorías, pero solo con las
tarjetas: su enlace `Ver más` lleva a la sección de cuentas de Actividad.

La gráfica y el listado forman una única sección plegable antes de los
movimientos: el donut aparece primero y debajo se muestra el detalle por
categoría. La gráfica siempre ofrece el total y los porcentajes como alternativa
textual accesible. Su leyenda de badges ocupa como máximo tres filas; los que no
caben siguen en horizontal y se desplazan a todo el ancho de la pantalla, sin
cortarse en los márgenes. La vista de cuadrícula de `Detalle por categoría`
sigue la misma regla: tres columnas y hasta tres filas, y el resto se desplaza
hacia la derecha. La vista de lista agrupa las categorías de cuatro en cuatro:
con más de cuatro, cada grupo es una tarjeta que se desliza en horizontal y deja
asomar la siguiente. El encabezado de la gráfica reutiliza el selector de periodo
del detalle de categoría: abre en el mes en curso y, al pulsar el texto del
periodo, despliega `Todos`, semana, quincena, mes, año o un rango
`Personalizado`. Las flechas recorren periodos anteriores y vuelven hacia el
actual, sin permitir avanzar más allá del periodo en curso. Sus segmentos
se trazan al entrar en Actividad, cambiar de periodo y alternar entre gastos e
ingresos. Cuando el tipo y periodo elegidos no tienen movimientos asociados a
categorías, la pantalla indica que debe registrarse y asociarse uno. Las vistas
previas de categoría de esta pantalla muestran el icono y el nombre y, cuando
existe presupuesto, el gasto acumulado y su progreso lineal. No muestran la
cantidad de movimientos; cuando no existe presupuesto conservan una barra lineal
vacía, sin simular importes ni progreso. Si una categoría reúne gastos e
ingresos, alterna sus importes en la misma posición cada ocho segundos mediante
un fade cruzado con desplazamiento horizontal de 350 ms. El importe se muestra
siempre en tono oscuro y una flecha
diagonal a su izquierda identifica el tipo: roja y descendente para gastos,
verde y ascendente para ingresos. Cuando solo existe un tipo, muestra su importe
sin animación con esa misma flecha. Las previews de
categoría forman un
único bloque continuo: el borde, la sombra y las esquinas redondeadas pertenecen
al contenedor exterior, no a cada fila; una línea interior separa las categorías
consecutivas y un chevron derecho refuerza que cada una es pulsable. Los badges
de la leyenda del donut también son pulsables y abren directamente
el detalle de su categoría. Las previews de movimientos
usan en Actividad la misma separación vertical que en Inicio. Su flecha semántica
aparece a la derecha del importe, en rojo para gastos y verde para ingresos,
sin una cápsula de fondo. Ambas abren un modal de detalle al tocarlas. Los filtros se
configuran en una hoja modal breve: las selecciones se preparan como borrador,
se aplican juntas mediante una acción explícita y se descartan al cerrar sin
aplicar. El grupo de tipo se puede plegar para reducir la altura de la hoja;
tipo, categoría, recurrencia y fecha forman un acordeón animado que mantiene un
solo grupo abierto; Moneda se integra en ese mismo acordeón cuando corresponde.
Todos reutilizan la opción seleccionable del formulario de
movimiento o la tarjeta existente de categoría. Las opciones de texto no llevan
check: la seleccionada se marca con texto violeta y su borde pasa de gris a
violeta con el mismo grosor. Las tarjetas de categoría conservan su check.
Categoría permite seleccionar varias tarjetas existentes en un catálogo
horizontal de dos filas que ocupa todo el ancho de la hoja; Recurrencia usa una
sola fila horizontal desplazable.
Fecha aparece como primer grupo y reutiliza el navegador temporal de los
reportes de Inicio. Todos, Semana, Quincena, Mes, Año y Personalizada comparten
opciones sin check en una sola fila horizontal desplazable; Personalizada se
ubica al final y permite elegir un rango en el calendario. Los cuatro
periodos regulares permiten recorrer fechas históricas y futuras. Las acciones inferiores reutilizan las acciones
comunes de modal y `Aplicar filtros` usa el CTA violeta. Las
animaciones respetan la preferencia de movimiento reducido. La interfaz interna
puede usar segmentos o secciones, pero debe seguir siendo clara.
Cuando el espacio activo contiene dos o más monedas, la hoja añade el grupo
plegable `Moneda`, con una única divisa seleccionable. El listado, sus totales y
el detalle por categoría se calculan con esa misma selección: no se suman ni se
convierten importes de monedas distintas. Con una sola moneda presente el grupo
no se muestra.

### Mapa

Presenta los gastos e ingresos del espacio activo en un calendario semanal
continuo, con desplazamiento vertical y mini tarjetas dentro del día de cada
movimiento. El calendario ocupa todo el ancho de la pantalla. El selector del
mes enfocado —nombre en negrita y año con menor énfasis— permanece encima de la
superficie y se actualiza con el mes que domina la pantalla. Mapa usa
exclusivamente esta vista semanal; no ofrece una vista mensual ni un control
para alternar vistas. La fila Lun-Dom queda fija en la parte superior del
calendario y no se repite dentro de cada semana.

Justo bajo el selector aparecen siempre los tres indicadores compactos
reutilizados de Movimientos —ingresos, gastos y balance— calculados para el mes
enfocado y para la moneda global seleccionada. El selector de moneda del
encabezado también está disponible en Mapa cuando el espacio ofrece más de una,
por lo que estos importes cambian entre las monedas reales del espacio sin
sumarlas ni convertirlas entre sí. Al pulsar cada indicador se abre el detalle
reutilizado de Ingresos, Gastos o Balance, ya situado en ese mes y moneda.

El balance de Mapa no es solo el del mes: suma el saldo que arrastran los meses
anteriores —lo que sobró o la deuda acumulada— para indicar el dinero disponible
al cerrar el mes enfocado. Los indicadores de ingresos y gastos siguen mostrando
únicamente ese mes. El detalle de Balance abierto desde Mapa aplica la misma
regla a cualquier periodo elegido, titula su total `Balance disponible`, indica
debajo cuánto procede de periodos anteriores y compara con el balance disponible
del periodo previo. Con `Todos` no hay nada anterior que arrastrar.

En un espacio juntos, Mapa muestra a la derecha de la cabecera flotante, a su
misma altura, el botón de filtros de Actividad. Abre la variante con solo
`Autor` (`Ambos`, `Yo` y el nombre de la pareja) y filtra los movimientos del
calendario, los indicadores del mes y la hoja de cada día. El detalle de
Ingresos, Gastos o Balance abre con el mismo autor. La cabecera reserva ese
hueco solo en Mapa para que el nombre del espacio y la bandera de moneda no
pisen el botón. En un espacio personal el botón no aparece.

Cada movimiento se representa con la mini tarjeta de su categoría. Por defecto se muestra la vista de pastillas horizontales y la sección `Visualización` de filtros permite elegir `Medianas` o `Pequeñas` con una transición breve que conserva la posición del calendario y respeta el movimiento reducido: muestra hasta tres movimientos por día y, si hay más, el número restante debajo. En esta vista la pulsación larga no abre acciones; la vista de tarjetas conserva su comportamiento. Su título
ocupa una única línea y, cuando no cabe, se desplaza horizontalmente en bucle
dentro de una tarjeta de altura fija; con movimiento reducido permanece estático
y truncado. Al elegir un día, se abre una hoja con sus movimientos reutilizando
las vistas previas y el detalle existentes. La hoja
mantiene abajo una acción morada `Agregar movimiento` que abre el formulario con
el día elegido. La acción permanece flotante mientras los movimientos se
desplazan por debajo y el final de la lista reserva espacio para no ocultar
contenido.

El historial navegable comienza en enero de 2024 y el horizonte futuro llega
hasta diciembre de 2080. Dentro del periodo visible, Mapa proyecta las
ocurrencias futuras de las series semanales, quincenales y mensuales; así refleja
tanto el pasado persistido como el futuro planificado sin crear por adelantado
todas esas filas en la base local.

Los números de todos los meses mantienen el mismo contraste, sin cambios de
opacidad ligados al foco o al scroll. El día actual se destaca con fondo morado; abrir un día no deja una selección visual. Entre meses aparece el nombre del nuevo mes, y las semanas se separan con líneas horizontales.

El selector fijo del mes conserva además una separación
superior amplia para no quedar cubierto por el selector flotante de espacio. Al
alejarse seis meses o más del mes actual aparece, sobre la navegación flotante,
el botón `Volver a hoy`: usa doble flecha hacia arriba al
recorrer meses futuros y hacia abajo al recorrer meses antiguos. El botón se
mantiene cerca de la acción `+` y usa un borde gris sutil. Al pulsarlo,
la superficie del calendario desaparece durante 200 ms, la vista semanal se
reinicia localmente con hoy como ancla y la superficie reaparece
durante 300 ms. El retorno no recorre los periodos intermedios ni muestra texto,
loader o estado direccional.

Los espacios no ocupan una pestaña.

### Ajustes

Se accede desde el bloque de acciones del menú lateral de espacios y se presenta
como una pantalla independiente, sin ocupar una pestaña principal.

La flecha de la cabecera y el gesto horizontal de izquierda a derecha regresan
a Inicio sin cambiar el espacio que estaba activo al abrir Ajustes; ese gesto no
abre el menú lateral desde esta pantalla.

Reúne:

- Estado del perfil y de la cuenta.
- Preferencias de moneda, idioma y privacidad de importes.
- Gestión de espacios, categorías archivadas y recurrencias.
- Notificaciones.
- Estado local de los datos, importación, exportación y privacidad.
- Ayuda, soporte, política de privacidad y versión de la aplicación.
- Analítica de Microsoft Clarity activada por defecto, con desactivación
  persistente desde Preferencias de privacidad. Si el módulo nativo no está
  disponible (Expo Go), se conserva la preferencia sin cargar ni capturar con
  el SDK.

El modo oscuro se controla desde el menú lateral de espacios.

### Bandeja de notificaciones

Una campana flota en la esquina superior derecha de las pestañas principales,
a la altura del botón del espacio activo, y abre un modal con avisos de los gastos e ingresos futuros de todos los
espacios: movimientos guardados con fecha futura y ocurrencias proyectadas de
series recurrentes. Cada movimiento aparece dos días antes y el día anterior;
el día del movimiento deja de mostrarse. El modal los reparte en dos secciones,
«En 1 día» y «En 2 días», con un máximo de cinco movimientos cada una.

Cada aviso usa la tarjeta de movimiento habitual (importe y flecha de gasto o
ingreso) y, si hay más de un espacio, añade el espacio tras la fecha
(«29/11/2026 · Juntos»). El mismo movimiento copiado en varios espacios se
muestra como un hilo, igual que una recurrencia personalizada: arriba el de
Personal y, al desplegarlo, el de Juntos y los demás. Tocar una tarjeta abre el
detalle del movimiento, cambiando antes al espacio del aviso si no es el
activo. Las tarjetas de Juntos muestran la miniatura de quien creó el
movimiento, aunque el espacio activo sea Personal. La pulsación larga ofrece
eliminar, editar y copiar, con selección múltiple, como en el resto de la app;
igual que allí, solo actúa sobre los movimientos del espacio activo, así que
los avisos de otro espacio no la abren. La bandeja se calcula en el
dispositivo y no depende de las reglas de recordatorios push ni de los
permisos de notificación.

Mientras haya avisos sin ver, la campana muestra un punto morado sobre su
borde. Si la pestaña tiene botón de moneda, este queda a la izquierda de la
campana; en Mapa, su botón de filtros también. Abrir la bandeja marca como vistos los avisos actuales. Lo
visto se guarda localmente; el aviso del día anterior cuenta como nuevo aunque
se viera el de dos días antes.

La preferencia «Símbolos de moneda» pertenece al perfil y se conserva en el
dispositivo. Al desactivarla, todos los importes visibles muestran únicamente
el número formateado; no cambia la moneda del movimiento, sus cálculos, filtros
ni datos sincronizados. Está activada por defecto.

Las monedas activas deciden qué divisas muestra la app. Al quitar una, sus
movimientos y los saldos de cuenta en esa moneda dejan de verse en Inicio,
Actividad, Mapa y el detalle de categoría, aunque el espacio naciera en ella;
no se borra nada y todo reaparece al reactivarla. La primera moneda activa es
la predeterminada. En un espacio compartido siguen visibles las monedas de los
demás miembros y las de los movimientos que ellos registran.

Mientras una capacidad todavía no esté implementada, su fila permanece visible
para validar la arquitectura de la pantalla, muestra un punto rojo junto a la
acción y comunica al tocarla que está pendiente. Las acciones operativas no
usan ese indicador ni simulan que la operación se haya completado.

La tarjeta de perfil permite tocar la foto para elegir una imagen de la
cámara o la galería; se recomprime en el dispositivo antes de guardarse para
no acumular imágenes pesadas. La fila
«Cerrar sesión» devuelve al acceso a pantalla completa y oculta todos los
datos de la cuenta. Si quedan cambios sin subir, antes ofrece subirlos; si no
se puede, avisa de que se borrarán del dispositivo sin recuperación y solo
cierra la sesión si la persona lo confirma. El aviso también nombra lo que
no se guarda en la cuenta y se borrará siempre: importaciones sin terminar y
configuraciones de recordatorios (`API.md`, «Sesión y restauración»).

La fila «Recordatorios y alertas» ya no es pendiente: abre un modal con una
regla por tipo de movimiento del espacio activo (gastos e ingresos por
separado). Cada regla se activa de forma independiente y define cuántos días
de antelación avisar y a qué horas del día, con un atajo para añadir mañana y
tarde a la vez además de horas personalizadas. Una regla activada avisa de
todos los movimientos de ese tipo dentro del espacio, incluidas las
ocurrencias futuras de series recurrentes, sin sustituir el recordatorio
manual que ya existe por movimiento individual desde su propio detalle. El
texto de estos tres tipos de aviso (manual, por regla y diario) rota entre
varias plantillas para no sonar siempre igual, según las reglas de
`Bible/JUNTOSS_NOTIFICATIONS.md`.

Además, la app entrega un recordatorio diario para animar a registrar
movimientos. No tiene fila propia en Ajustes ni se puede desactivar: siempre
está activo, a una hora fija definida por la aplicación, independiente del
espacio. Como máximo entrega un aviso al día, y no lo hace si el usuario ya
registró algo ese día o si la hora ya pasó, en cuyo caso lo reprograma para el
día siguiente.

---

## 12. Selector de espacios

El usuario debe poder cambiar de espacio desde cualquier pantalla.

Opciones compatibles:

- Nombre del espacio en el encabezado.
- Selector desplegable.
- Avatar con panel lateral.
- Hoja modal.

Reglas:

- Mostrar siempre el espacio activo.
- Integrar la representación del perfil dentro del selector de espacio, con
  foto circular y nombre. Al tocarla se abre una edición breve de ambos, sin
  reservar un segundo botón permanente en el extremo opuesto del encabezado.
- Mantener fijo el selector de espacio y el acceso al perfil mientras se
  desplaza el contenido de cualquier pestaña principal.
- Mantener la pantalla actual al cambiar, cuando sea posible.
- Recargar los datos del nuevo contexto.
- Evitar mezclar o mostrar brevemente datos anteriores.
- Marcar claramente cuál está activo.
- Separar selección rápida de gestión profunda.
- Permitir crear y seleccionar espacios locales desde un menú lateral. Tras
  los espacios, un divisor separa el acceso a Ajustes y el interruptor de modo
  claro u oscuro; Ajustes abre su pantalla independiente.

Plan gratuito previsto, sujeto a definición:

- Un espacio personal.
- Un espacio de pareja.

Los límites deben centralizarse como capacidades.

---

## 13. Creación de movimientos

### Acceso

La acción debe ser prominente, mediante botones de gasto e ingreso, botón
flotante o acción central. La navegación principal se presenta como un menú
flotante: Inicio, Actividad, Mapa y Pronto comparten una cápsula, y el botón morado `+`
permanece separado a su lado en la misma línea. La franja que contiene ambos es
transparente y se superpone al contenido; la cápsula conserva su superficie y
la pestaña seleccionada se distingue solo por su icono relleno, sin fondo. El
conjunto permanece visible al desplazarse y al cambiar entre las pestañas
principales.
No queda disponible mientras hay un modal o el menú lateral abierto y no
aparece en Ajustes.

### Pronto

Pantalla informativa accesible desde la pestaña Pronto, también durante la
espera de una invitación de pareja. Conserva el encabezado del espacio activo
y muestra el titular centrado «Lo que viene lo construiremos» completado por
el logo de Juntos, con contraste adaptado al tema.
Debajo presenta siete tarjetas con iconos y la indicación «Próximamente»:
Ahorros, Lista de deseos, Espacios familiares, Planes, Préstamos, Escáner de
facturas y Chat de voz con IA. Cada tarjeta abre un modal con una propuesta
breve de funcionamiento, sin habilitar la función ni prometer fechas.
Chat de voz con IA aparece primero con un micrófono clásico. Los modales
reutilizan el icono de la tarjeta, separan la propuesta en dos párrafos y
reservan un bloque inferior para compartir ideas. La pantalla también ofrece
un botón amplio «Compartir mi idea» para sugerencias generales.
El botón «Compartir mi idea» abre el cliente de correo con destinatario
`aora.estudio.o@gmail.com` y asunto relativo a la función; el usuario decide
qué escribir y cuándo enviarlo. Si no se puede abrir, se muestra la dirección
como alternativa. Se reutilizan los tokens visuales de las previews y el modal global.

### Modal

Contenido base:

- Alternar gasto o ingreso.
- Cerrar.
- Importe con teclado o calculadora.
- Categoría.
- Cuenta opcional.
- Título.
- Fecha.
- Recurrencia opcional.
- Guardar.

El botón de cuenta acompaña a los de fecha y recurrencia, y solo aparece
cuando el espacio activo ya tiene alguna cuenta. La moneda no vive en esa
fila: cuando el espacio tiene dos o más monedas activas se elige desde un
botón situado junto al campo de título, que muestra la bandera de la moneda
actual. Así la fila que hay sobre el teclado numérico queda para fecha,
recurrencia y cuenta, y la información se reparte mejor. Al elegir una cuenta
el movimiento conserva su moneda y, si es nueva para esa cuenta, se añade con
saldo inicial cero; ese botón desaparece. Al quitarla, vuelve a la moneda del
espacio. Desde el propio selector se puede crear una cuenta sin
salir del flujo.

El espacio se deriva del contexto activo y no se pregunta de nuevo por defecto.
El importe debe ser válido y la categoría es obligatoria: el movimiento no se
puede guardar hasta seleccionar una categoría creada en el espacio activo.

### Comprar / vender dólares (Venezuela)

El menú del botón flotante añade la acción «Comprar / vender dólares» solo
cuando la capacidad Venezuela está activa (`useCurrencyCapabilities`). El
resto de usuarios no la ve y su flujo no cambia.

No es un tipo de movimiento nuevo. Al confirmar, la operación se guarda como
dos movimientos normales en una sola transacción local:

- Comprar dólares: gasto en VES + ingreso en USD.
- Vender dólares: gasto en USD + ingreso en VES.

Reglas del modal:

- Dos bloques, «Entregas <moneda>» y «Recibes <moneda>», con el importe
  grande y el mismo teclado numérico del modal de movimiento (sin
  calculadora). El título nombra la moneda, así que el modal no necesita uno
  propio. Tocar un bloque lo activa para el teclado; la primera tecla
  sustituye el valor sugerido.
- Una flecha entre los dos bloques intercambia los lados y con ello la
  operación (comprar o vender); los importes y cuentas siguen pegados a su
  moneda.
- El teclado y el botón de guardar quedan anclados abajo: lo que crece arriba
  nunca los desplaza.
- Con una fuente oficial manda la tasa: el importe que se escribe es el ancla
  y el otro se recalcula con ella, aunque ya viniera derivado. Así se puede
  empezar por los dólares o por los bolívares sin que la fuente cambie sola.
- Con «Personalizada» mandan los importes: se escribe cuántos dólares se
  entregan y cuántos bolívares se reciben, los dos se conservan y el recuadro
  de la tasa muestra la implícita entre ambos. Solo se deriva el importe que
  falte, y al borrar los dos la tasa sugerida vuelve a cero. Lo mismo ocurre
  sin ninguna tasa disponible.
- Fuentes de tasa: BCV, Tasa EUR y Personalizada. La tasa vigente siempre se
  ve en el mismo recuadro editable («1 USD = ___ Bs»), sea cual sea la
  fuente; escribir sobre ella la convierte en personalizada partiendo del
  valor mostrado. Sin respuesta del backend solo queda la personalizada. El
  contravalor calculado en la app es una sugerencia: se guardan los importes
  confirmados y el servidor congela su propio snapshot por movimiento, como
  en cualquier otro.
- Cuenta opcional por lado, como un botón pequeño al lado de su importe, con
  el mismo selector y la misma regla de añadir la divisa con saldo inicial
  cero que el modal de movimiento.
- Sin fecha, título ni recurrencia: hoy, «Compra de dólares» / «Venta de
  dólares» y único.
- Ambos movimientos van a la categoría «Cambio de divisa», que se crea sola
  en el espacio la primera vez. No se ofrece como plantilla a otros países.

Consecuencia visible: los dos movimientos cuentan en gastos e ingresos como
cualquier otro. En contabilidad USD el efecto neto es cero a tasa BCV, o la
diferencia frente a BCV cuando se registró una tasa personalizada. No existe
un enlace entre ambos movimientos; se editan y eliminan por separado.

### Calculadora

Debe priorizar entrada rápida, separador decimal local, agrupación visible de
millares mediante puntos, prevención de importes inválidos, accesibilidad y
comportamiento táctil natural. La entrada `1000000` se presenta como
`1.000.000` sin alterar las unidades menores usadas para calcular y guardar.

Antes de implementar desde cero una interacción compleja, deben evaluarse librerías mantenidas.

### Recurrencia

Debe ser opcional y secundaria:

- Único.
- Semanal.
- Quincenal.
- Mensual.
- Personalizada.

Semanal, quincenal y mensual crean una serie sin fecha final. La recurrencia
quincenal avanza cada 15 días desde la fecha económica elegida. Las ocurrencias
se registran al alcanzar su fecha y, si la aplicación permaneció cerrada, se
recuperan juntas la próxima vez que se cargan los movimientos.
Una ocurrencia distinta del movimiento inicial se puede eliminar de forma
individual, incluida una futura que todavía solo esté proyectada: se omite
únicamente esa fecha y la serie continúa sin alterar sus demás ocurrencias. La
eliminación del movimiento inicial conserva el comportamiento general de la
serie ya establecido.
Al editar una ocurrencia de una serie automática sin cambiar su frecuencia, el
cambio se aplica a esa ocurrencia y a las posteriores, incluidas las que ya se
hubieran materializado. Las ocurrencias anteriores conservan sus valores
históricos. Esta regla se aplica por igual a gastos e ingresos.
En las listas de previews, cada ocurrencia de estas series automáticas ocupa
una tarjeta independiente y muestra su propia fecha económica. Al recorrer
periodos futuros, la proyección crea una preview para la fecha concreta del
periodo consultado; nunca sustituye su fecha por la próxima fecha global de la
serie. El despliegue en árbol continúa reservado para la recurrencia
personalizada.

`Personalizada` abre un segundo flujo dentro del selector de recurrencia. El
usuario puede indicar la cantidad total de repeticiones y después elegir
exactamente esas fechas en el mismo calendario reutilizado por el selector de
fecha. Si todavía no conoce la cantidad, `No estoy seguro` permite continuar al
calendario y seleccionar tantos días como quiera, sin un límite previo. Cada
fecha elegida crea una ocurrencia finita e independiente del movimiento.
Las ocurrencias conservan además un identificador común de presentación para
que puedan plegarse sin perder su identidad, detalle ni efecto individual en
los cálculos. La misma regla se aplica al editar un movimiento Único, Semanal,
Quincenal o Mensual y cambiarlo a Personalizada: el movimiento editado se
convierte en la primera ocurrencia del nuevo grupo y las demás fechas elegidas
se incorporan a su carpeta.

---

## 14. Categorías

Reglas:

- Pertenecen a un espacio.
- Admiten gastos e ingresos.
- Conservan autoría en espacios compartidos.
- Pueden existir con el mismo nombre en espacios diferentes.
- Se prefiere archivar cuando tienen movimientos.
- Las predeterminadas deben poder localizarse y migrarse sin duplicados.

### Separación de un espacio

Política de trabajo:

- Los movimientos compartidos no se copian automáticamente a espacios personales.
- Las categorías creadas durante la relación pueden copiarse a ambos espacios personales.
- Las copias reciben nuevos identificadores.
- Se conserva referencia al origen cuando sea necesario.
- Deben evitarse duplicados equivalentes.
- La operación final debe ser segura y transaccional.

### Detalle de categoría

El detalle reúne el nombre, icono, totales con actividad y movimientos asociados.
Sobre los totales, un selector de periodo decide qué se suma y qué se lista. El
detalle abre en el mes en curso. Las opciones permanecen plegadas: al pulsar el
texto del periodo entre las flechas se despliegan de arriba abajo, a todo el
ancho de la pantalla, y se pliegan al elegir una. El usuario puede cambiar a
`Todos` (todo el historial), a una semana, quincena, mes o año que recorre con
las flechas, o a un rango `Personalizado`. Reutiliza el selector de periodo y el
calendario de rango de Actividad. El periodo filtra los totales, `Movimientos` y
`Movimientos futuros` por igual: los totales de un periodo suman también sus
movimientos programados, así que un mes futuro muestra lo que ya está previsto.
Vuelve al mes en curso cada vez que se abre el detalle. Un total de ingresos o gastos igual a cero se omite. El presupuesto solo aparece
en el resumen cuando existe y muestra mediante una barra lineal el progreso del
periodo en curso, su importe, cuánto queda disponible y la periodicidad. Desde
el mismo modal se puede añadir, editar o retirar el presupuesto y elegir su
periodicidad mediante un submodal con teclado numérico propio. Pulsar el
resumen abre `Detalle de Presupuesto`, que recorre los periodos del propio
presupuesto con flechas; al pulsar el periodo se despliegan las mismas opciones
que en el detalle (semana, quincena, mes, año o un rango personalizado), con el
presupuesto proporcional a los días cuando la vista no coincide con su
periodicidad. Muestra gastado (o previsto, en periodos futuros) frente al
presupuesto y, en un periodo del presupuesto, `Editar este periodo`: con la
misma periodicidad cambia solo ese importe; con otra, la nueva periodicidad e
importe rigen desde ese periodo en adelante y los anteriores se conservan.
`Hoy` vuelve al periodo en curso. También se puede
crear un movimiento con la categoría preseleccionada y copiar la categoría a otro
espacio disponible mediante otro submodal. La acción de copia solo aparece cuando
existe al menos un espacio de destino. La copia es independiente y no traslada
movimientos. Eliminar y editar aparecen desde el inicio como dos botones
independientes en la esquina superior izquierda: papelera primero y edición a su
derecha. Usan los SVG específicos de papelera y edición guardados en
`assets/icons`, oscuros y de trazo visual grueso sobre
superficies cuadradas redondeadas. Eliminar archiva la categoría y
conserva sus movimientos asociados. Al solicitar eliminarla, la confirmación
aparece inmediatamente debajo del bloque superior con su título, antes de las
métricas y acciones secundarias. Como el detalle ya incorpora una acción de
cierre propia, no reserva la franja superior del tirador del bottom sheet: su
fondo ocupa esa zona como una única superficie. La barra superior conserva una
separación interna equivalente para que editar, eliminar y cerrar mantengan una
distancia cómoda respecto al borde redondeado. El detalle registra un único
`BottomSheetScrollView` como contenido gestual del modal; la barra superior se
superpone al viewport completo y su altura se reserva dentro del contenido. Así
el desplazamiento conserva su posición entre gestos y no aparece un recorte
intermedio debajo de las acciones superiores.

Al completar una copia de categoría o movimiento entre espacios, la app confirma
el resultado con una tarjeta flotante oscura sobre la interfaz. La tarjeta nombra
el elemento y el espacio de destino, y destaca en verde un icono de confirmación
y la palabra «exitosamente». Esta confirmación se anuncia también a tecnologías
de asistencia y desaparece automáticamente sin bloquear la interacción.

Los movimientos usan esa misma tarjeta en la parte inferior, sobre el menú
flotante, con el icono de su categoría a la izquierda: al crearlos («Gasto
agregado», «Ingreso agregado» o «Movimientos agregados» para el par de una
compra o venta de dólares) y al copiarlos a otro espacio («Movimiento
copiado»). Un aviso nuevo sustituye al anterior. Permanece 3,5 segundos y, si
confirma un único movimiento creado, toda la tarjeta se puede tocar para abrir
su detalle; en ese caso muestra una flecha a la derecha que lo indica.

Regla para toda tarjeta informativa flotante, arriba o abajo: al aparecer, el
teléfono vibra de forma sutil (impacto ligero), una sola vez por aviso, para
dar peso a la confirmación. Su duración no depende de la pantalla que la lanzó:
si el usuario cambia de pestaña mientras está a la vista, se retira a su hora
igualmente.

Los movimientos asociados se dividen en dos secciones dentro del mismo bloque,
en el mismo orden y ubicación de siempre. `Movimientos` reúne los que ya
sucedieron, con fecha económica de hoy o anterior. Cuando existe al menos un
movimiento con fecha posterior a hoy, aparece debajo una segunda sección
`Movimientos futuros`, ordenada de la fecha más próxima a la más lejana, sin
límite mensual propio: a diferencia de Inicio, un movimiento futuro de este
espacio es visible aquí en cuanto se crea, sin esperar a que su mes llegue,
siempre que caiga dentro del periodo elegido (con `Todos`, cualquiera). Ambas
secciones reutilizan la misma lista de vistas previas y el mismo detalle al
tocar un movimiento.

En un espacio juntos, a la derecha del número de `Movimientos`, el mismo botón
de filtros de Actividad abre su hoja modal reutilizada. Esta variante contiene
solo `Autor`, porque el periodo ya vive a la vista en el detalle, para filtrar
entre ambos, los movimientos propios o los
de la pareja; esta última opción muestra su nombre cuando el censo está disponible.

### Detalle de movimiento

El bloque de metadatos incluye una fila de cuenta, exista o no: cuando el
movimiento no tiene ninguna dice «Sin cuenta». Las filas de categoría, cuenta,
fecha y recurrencia abren **solo** su selector, encima del propio detalle: al
guardar o cerrar se vuelve al movimiento que se estaba mirando, ya actualizado,
y el formulario completo no llega a aparecer. La categoría ya no navega a su
detalle desde aquí. Solo se ofrecen cuentas en la misma moneda del movimiento,
porque el importe no cambia al entrar en un saldo.

Cambiar la recurrencia de un movimiento afecta a lo que viene después, no a lo
que ya pasó: las repeticiones posteriores a su fecha se sustituyen por la nueva
recurrencia y las anteriores se conservan intactas, porque ya ocurrieron y
forman parte de saldos y totales que el usuario ya ha visto. La regla vale igual
para una recurrencia automática y para una lista de fechas personalizada.

El detalle de movimiento conserva la distribución general del detalle de
categoría: una superficie expandida con cierre propio, identidad visual,
importe principal, metadatos y acciones relacionadas. Muestra título, importe,
categoría, fecha y recurrencia. En el mismo bloque de metadatos indica además la
próxima repetición. Cuando quedan fechas futuras, una flecha descendente
despliega las cinco siguientes; `Ver más` incorpora cinco fechas adicionales en
cada pulsación. Las series semanal, quincenal y mensual se proyectan sin fecha
final, sin crear movimientos futuros en persistencia, y la recurrencia
personalizada muestra únicamente las fechas futuras reales de su grupo finito.
Los movimientos únicos y los grupos personalizados agotados comunican que no
habrá otra repetición y no muestran un desplegable vacío. El tipo se comunica junto al importe mediante
la etiqueta «Importe ingresado» o «Importe gastado» y la flecha direccional
correspondiente, no como texto secundario bajo el título. No muestra ni permite gestionar
presupuestos, porque el presupuesto pertenece a la categoría y no al
movimiento.

Editar y eliminar reutilizan los mismos botones superiores independientes del
detalle de categoría. Editar abre el formulario de movimiento con todos sus
datos precargados y guarda sobre el mismo identificador. Eliminar requiere una
confirmación dentro del detalle, mostrada inmediatamente debajo del bloque
superior con su título antes del importe y los metadatos, y actualiza los
agregados del espacio.

Cuando existe otro espacio disponible, el movimiento puede copiarse mediante
un submodal de selección. La copia es independiente, conserva importe, tipo,
título, fecha y recurrencia, y siempre queda asociada a una categoría válida
del espacio de destino. Si allí existe una categoría equivalente se reutiliza;
si no, se crea una copia de la categoría sin presupuesto. La operación no
modifica ni elimina el movimiento original y utiliza la confirmación flotante
común de las copias entre espacios. Al completarse la copia, el detalle del
movimiento se cierra para dejar a la vista esa confirmación.

Copiar nunca duplica en el destino. Copiar una repetición de una serie
semanal, quincenal o mensual crea en el destino la serie entera desde esa
fecha, así que todas las repeticiones de la serie cuentan como la misma copia:
- En la selección múltiple, al marcar una repetición las demás de su serie
  quedan atenuadas en cualquier mes, y vuelven a estar disponibles al
  desmarcarla.
- Copiar no se ofrece hacia un espacio donde el movimiento (o su serie) ya
  existe por una copia anterior, en ningún sentido: tampoco se puede devolver
  una copia al espacio de su original. Si se elimina la copia, se puede volver
  a copiar.
- Como red de seguridad, si llegaran varias repeticiones de una misma serie
  solo se copia la más antigua, y se omite lo que ya existe en el destino.

### Acciones rápidas de una tarjeta

Mantener pulsada la tarjeta de vista previa de un movimiento, una categoría o
una cuenta (tarjeta o fila) abre sus acciones sin pasar por el detalle. Vale en cualquier lugar donde
aparezca la tarjeta: Inicio, Actividad, Mapa (también las tarjetas pequeñas
del calendario) y las listas dentro de hojas, como el detalle de categoría o de
cuenta y el día del mapa.

- Todo se desenfoca salvo la tarjeta pulsada, que se eleva ligeramente en su
  sitio.
- Tres botones circulares brotan de la tarjeta y forman un arco encima de
  ella: eliminar, editar y copiar a otro espacio. Si la tarjeta está pegada al
  borde superior, el arco pasa por debajo.
- Eliminar pide la misma confirmación que el detalle, con el mismo texto, en
  la propia superposición. Editar abre el mismo formulario precargado que el
  detalle. Copiar abre el mismo selector de espacio de destino.
- En las tarjetas horizontales de movimientos (las filas de las listas),
  eliminar y copiar abren la selección múltiple en vez de actuar solo sobre
  esa tarjeta. La tarjeta pulsada queda marcada. Las demás tarjetas de
  movimiento, encima y debajo, se encogen ligeramente y abren a su izquierda
  un círculo animado. Tocar una tarjeta o su círculo la marca o desmarca, en
  lugar de abrir su detalle. Mientras dura la selección, el menú principal
  y el botón `+` bajan fuera de la pantalla, y vuelven a subir al salir. El
  círculo marcado usa el morado de la app (`cta`) al copiar y el mismo rojo
  de la confirmación al eliminar. Una barra inferior cuenta
  lo marcado y ofrece cancelar y la acción elegida, con el color de los
  círculos: morado al copiar y rojo al eliminar, con texto e icono blancos. Eliminar pide confirmación para todos a la
  vez. Copiar abre el selector de espacio con «N movimientos» y confirma con
  un solo aviso, «N movimientos copiados». El selector muestra hasta cinco
  iconos de los movimientos marcados, apilados sin separación ni borde y
  levemente girados. Mientras está abierto, la barra de la selección baja para no
  taparlo; cerrarlo sin copiar la devuelve con lo marcado intacto. Las tarjetas que no admiten la
  acción aparecen atenuadas y no se marcan, como una repetición proyectada al
  copiar o un grupo plegado; al copiar, tampoco otra repetición de una serie
  ya marcada ni un movimiento ya copiado al otro espacio. El gesto de volver de Android o cancelar salen de
  la selección. Editar sigue siendo de una sola tarjeta. Las categorías y las
  cuentas, en tarjeta grande, mini o fila, mantienen la acción individual.
- Se aplican las reglas del detalle: copiar solo aparece si existe otro
  espacio, y una repetición proyectada no se copia y al eliminarse solo se
  omite esa fecha. Una cuenta, como en su detalle, solo ofrece eliminar y
  editar.
- Tocar fuera, tocar la tarjeta o el gesto de volver de Android cierran sin
  hacer nada.
- Un grupo plegado de movimientos no abre acciones, porque representa varios
  movimientos a la vez.
- Lectores de pantalla: la tarjeta ofrece la acción «Mostrar acciones».

---

## 15. Espacio de pareja

Un usuario registrado puede crear un espacio, invitar a otra persona y comenzar a compartir.

Principios:

- Unirse no fusiona espacios personales.
- Cada cuenta puede pertenecer a un único espacio de pareja activo, incluido un
  espacio propio que todavía esté esperando a la otra persona. La API garantiza
  este límite también ante solicitudes simultáneas.
- La invitación se dirige exclusivamente al correo de una cuenta existente;
  la app no genera enlaces manuales para compartir.
- Si el correo no tiene cuenta, no se crea la invitación y quien invita debe
  pedir a esa persona que descargue Juntos y se registre con ese correo.
- Sin una invitación activa, «Espacio de pareja» muestra el formulario de
  correo integrado en Inicio: conserva la cabecera global y las acciones
  flotantes, no añade una flecha ni una cabecera secundaria, y presenta la
  ilustración de la pareja. Abrir el formulario no crea todavía ningún espacio.
  El primer espacio de pareja y su invitación se confirman juntos al pulsar
  enviar; hasta ese éxito, Personal conserva el espacio activo y nunca muestra
  una espera falsa.
- Mientras la invitación confirmada no haya sido aceptada, ese espacio
  permite Inicio con la pantalla de espera y la pantalla informativa Pronto:
  Actividad y Mapa permanecen
  deshabilitados y no exponen datos ni acciones del espacio pendiente.
- La invitación guardada y visible dentro de la app es la fuente de verdad. El
  push es un aviso inmediato adicional cuando el dispositivo tiene permisos.
- Al recibir una invitación dirigida a la sesión, se muestra un popup modal centrado con fondo difuminado en ambos espacios (personal y de pareja) con el título «[Nombre] te invitó a un espacio juntos», un icono morado sin fondo a la izquierda, una lista con 3 beneficios con checkmarks morados y líneas divisorias entre cada uno, y las acciones «Aceptar» y «Cancelar». Aceptar redirige de inmediato al espacio de pareja compartido; cancelar envía la notificación de rechazo al backend y cierra el popup.
- Los datos personales permanecen aislados.
- Los movimientos compartidos conservan autor.
- Salir revoca solo el acceso de quien lo solicita.
- Cambiar a un país distinto provoca la salida automática del espacio
  compartido. Ajustes muestra una confirmación breve. Al abrir «Espacio de
  pareja» sin un espacio actual, explica la salida y cómo regresar: configurar
  el país anterior y pedir una nueva invitación a quien permanece dentro.
  También ofrece invitar a otra persona con el mismo país actual para crear un
  nuevo espacio. Este aviso se guarda por cuenta en el dispositivo al confirmar
  el cambio desde Ajustes y se retira cuando vuelve a existir un espacio.
- Mientras quede otra persona dentro, quien salió puede volver a entrar con una nueva invitación.
- Cuando ya no queda nadie dentro, el espacio y sus datos se eliminan automáticamente.
- Las acciones sensibles requieren confirmación.

La interfaz inicial ofrece únicamente la salida del propio usuario; no permite
expulsar a la otra persona ni disolver o archivar el espacio manualmente.

---

## 16. Ahorros y planes

Funcionalidad futura:

- Crear meta.
- Definir importe objetivo.
- Definir fecha opcional.
- Añadir aportaciones.
- Consultar progreso.
- Compartir dentro de un espacio.
- Registrar quién aportó.
- Cancelar o completar.

No debe mezclarse prematuramente con movimientos recurrentes o presupuestos.

---

## 17. Estados obligatorios

Cuando aplique:

- Cargando.
- Vacío.
- Con datos.
- Error recuperable.
- Sin conexión.
- Sin permisos.
- Límite alcanzado.
- Sincronización pendiente.
- Conflicto.
- Operación completada.

Los estados vacíos deben dirigir a una acción útil.

---

## 18. Accesibilidad y localización

- Etiquetas accesibles.
- Objetivos táctiles adecuados.
- No depender solo del color.
- Respetar tamaños de texto cuando sea viable.
- Formatos locales de moneda y fecha.
- Español e inglés. Por defecto se usa el idioma del dispositivo (español si
  no es ninguno de los dos), y se puede cambiar en Ajustes › Idioma.
- En el onboarding, al elegir Estados Unidos, Reino Unido o Canadá, un popup
  pregunta si la app se usa en inglés o en español. La elección se aplica al
  continuar a la siguiente lámina y se puede cambiar después en Ajustes.
- En inglés también se traducen las categorías predefinidas, los países, las
  monedas, las notificaciones y los documentos legales.
- Compatibilidad con modo claro y oscuro, seleccionable mediante un interruptor en Ajustes.

---

## 19. Métricas sugeridas

- Finalización del onboarding.
- Primer movimiento.
- Tiempo hasta el primer movimiento.
- Verificación de correo completada.
- Errores de migración.
- Primera categoría.
- Creación o unión a espacio de pareja.
- Retención.
- Uso del selector de espacios.
- Abandono del modal.

No recopilar contenido financiero sensible sin necesidad, consentimiento y protección.

---

## 20. Importación de movimientos bancarios

Permite añadir varios gastos e ingresos a la vez desde un archivo del banco, en vez de crearlos uno por uno. Especificación completa en `Bible/JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md`.

### Formatos soportados

Excel (`.xls`/`.xlsx`) y CSV. PDF se implementó on-device (ADR-071) y luego se eliminó por completo: generaba errores recurrentes y era una función de uso marginal frente a su coste de mantenimiento. Ver ADR-073.

### Flujo

1. Elegir un archivo dentro del espacio activo.
2. Detectar y, si hace falta, mapear manualmente las columnas (fecha, descripción, importe).
3. Normalizar fecha, importe, moneda y tipo (gasto o ingreso).
4. Sugerir categoría a partir de reglas personales del usuario o coincidencia con comercios ya categorizados.
5. Detectar duplicados contra los movimientos existentes del espacio.
6. Revisar: los movimientos se agrupan por comercio normalizado, de forma que corregir una categoría se aplica a todas las filas de ese comercio conservando la fecha y el importe de cada una. Los duplicados exactos aparecen deseleccionados por defecto.
7. Importar: los movimientos seleccionados se guardan con el mismo flujo de creación que un movimiento manual, y Inicio, Actividad y Mapa se actualizan de inmediato.

Si el usuario cierra la revisión sin terminar, la importación queda pendiente y puede retomarse o descartarse desde un centro de importaciones dentro del espacio activo.

### Aprendizaje

Una categoría corregida durante la revisión se recuerda para ese comercio y ese espacio, y se sugiere automáticamente en la próxima importación. Estas correcciones también pueden alimentar, de forma anónima y solo tras suficiente consenso entre usuarios, candidatos de regla global para revisión manual; nunca se aplican automáticamente al catálogo general de categorías.

### Fuera de esta versión

PDF (digital o escaneado), reconocimiento óptico de texto, conexión bancaria directa y perfiles de importación por banco.

---

## 21. Fuera de alcance inicial

- Gráficas complejas.
- Grupos avanzados.
- Contabilidad empresarial.
- Inversiones.
- Conexión bancaria.
- Gestión fiscal.
- Presupuestos altamente configurables.
- Conversión avanzada de divisas.
- División compleja de deudas.
- Automatizaciones extensas.
- Funciones sociales públicas.

---

## 22. Criterio de producto

Una nueva funcionalidad debe:

- Hacer más rápido registrar dinero, o
- Ayudar a comprender la situación financiera, o
- Facilitar compartir sin perder privacidad, o
- Reducir errores o confusión, o
- Apoyar una prioridad del roadmap.

Si no cumple ninguna, probablemente no pertenece a la versión actual.
