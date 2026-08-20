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

### Invitado

Prueba la aplicación sin crear cuenta ni enviar datos a la nube.

### Grupos futuros

Familias, convivientes, amistades o grupos temporales. No son requisito de la primera versión.

---

## 5. Conceptos del dominio

### Usuario

Puede existir como invitado local o usuario registrado.

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
nombre, color e icono. Ninguna categoría de plantilla o personalizada existe
implícitamente en otro espacio. Los iconos de
categoría usan siempre su variante rellena para mantener una identidad visual
consistente.

Una categoría puede tener un presupuesto simple opcional. Cuando existe, las
vistas previas pueden mostrar el progreso del gasto frente a ese límite; cuando
no existe, no deben simular ni mostrar un anillo de progreso.

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
color, icono, moneda y saldo inicial. Su saldo es el saldo inicial más los
ingresos menos los gastos que tenga asignados, con la misma regla de horizonte
mensual que el balance. Una cuenta puede guardar varias monedas —hay bancos que
lo permiten— y cada una lleva su propio saldo; nunca se suman entre sí. Al
registrar un movimiento solo se ofrecen cuentas que guarden su moneda. El tipo
solo propone el icono y el color al crearla: los tres calculan el saldo igual y
cualquiera puede quedar en negativo.

Después de registrar movimientos, las monedas ya guardadas y sus saldos
iniciales no se pueden alterar. Si la cuenta solo tenía una moneda, el usuario
puede añadir una segunda con su propio saldo inicial: esa alta no reinterpreta
los movimientos existentes.

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

Explicar el valor en tres láminas (bienvenida, calendario y uso compartido) y completar el flujo con nombre, país, primera categoría, primer ingreso, primer gasto y cierre.

### Flujo propuesto

1. Captura del nombre.
2. Elección de país y moneda principal.
3. Bienvenida: simplicidad y control diario.
4. Calendario y mapa financiero.
5. Uso personal y compartido.
6. Creación de la primera categoría.
7. Primer ingreso.
8. Primer gasto.
9. Cierre y listo para explorar.

Después del onboarding, el usuario entra como invitado o crea su cuenta (ver §8).

### Mensajes sugeridos

1. **Control diario:** registra ingresos y gastos en segundos.
2. **Organización clara:** usa categorías para entender tu dinero.
3. **Comparte cuando decidas:** mantén un espacio personal y crea otro con tu pareja.
4. **Tus datos continúan contigo:** prueba localmente y sincroniza al crear una cuenta.

### Reglas

- Nueve pantallas en total (ver `DECISIONS.md` ADR-012, ampliación).
- No pedir correo ni contraseña antes de probar.
- No pedir permisos sin explicar por qué.
- Pedir un primer ingreso y un primer gasto al final, para dejar el espacio local con datos reales.
- En los pasos 6, 7 y 8, enseñar la creación con el mismo botón flotante y el
  mismo menú de opciones de la app; las acciones ajenas al paso permanecen
  visibles pero deshabilitadas.
- La transición entre láminas usa un fundido breve y el segmento del paso que
  entra se rellena de izquierda a derecha, como el progreso de una story.
- Permitir omitir cuando corresponda.
- No repetirlo sin acción explícita.

---

## 8. Modo invitado

El invitado:

- Tiene un espacio personal local.
- Puede crear espacios locales adicionales que permanecen en el dispositivo.
- Puede crear movimientos.
- Puede crear categorías con límites.
- Puede navegar por el producto principal.
- No sincroniza con Supabase.
- No puede crear espacios compartidos.
- Puede perder datos si elimina la app o pierde el dispositivo.

Límites sugeridos, sujetos a validación:

- Entre 5 y 10 movimientos.
- Hasta 3 categorías personalizadas.
- Sin sincronización.
- Sin espacios compartidos.

Al alcanzar un límite, se bloquea únicamente la acción excedida y se ofrece registro.

---

## 9. Conversión a cuenta

Cuando el usuario se registra:

1. Se crea la cuenta.
2. Se verifica el correo con el código de Supabase.
3. Se crea o recupera el espacio personal remoto.
4. Se prepara un lote de migración.
5. Se suben categorías y movimientos.
6. Se validan resultados.
7. Se marcan como sincronizados.
8. Solo después se limpia o archiva la copia temporal.

La migración debe ser idempotente.

---

## 10. Autenticación

### Registro

- Correo.
- Contraseña, con un segundo campo para confirmarla.
- Nombre ya capturado o editable.
- El modal de crear cuenta es un formulario de 4 pasos, con una barra de
  progreso debajo del título del modal que da sensación de avance y facilita
  que el usuario continúe.

### Verificación

La interfaz no debe asumir una longitud rígida del código. Debe aceptar la configuración real del proveedor, permitir pegar el código completo, reenviar con control y preservar los datos locales.

### Inicio de sesión

Si existen datos invitados en el dispositivo, no deben mezclarse con una cuenta equivocada sin confirmación.

---

## 11. Navegación principal

Tiene tres destinos principales:

### Inicio

- Espacio activo.
- Balance disponible como cifra principal, libre sobre el fondo.
- Ingresos y gastos del mes.
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
actual, aunque su día todavía no haya llegado. Los indicadores de ingresos y
gastos muestran únicamente ese mes completo. Ningún movimiento de un mes
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
superficie blanca, check circular y borde violeta al seleccionar. Debajo muestran una tarjeta con el total de ingresos o gastos del
periodo seleccionado. Después del listado aparece la acción `Añadir ingreso` en
verde o `Añadir gasto` en rojo.

El bloque completo de `Balance disponible`, incluidos su texto y su importe, es
accionable y abre una tercera variante del mismo modal. Esta combina ingresos y
gastos en un único listado, conserva los mismos filtros y navegador temporal y
muestra en la tarjeta resumen el balance del periodo. Su acción inferior dice
`Añadir movimiento` y abre el formulario con la posibilidad de alternar el tipo.

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
- Filtro por fecha.
- Filtro por tipo.
- Filtro por categoría.
- Filtro por recurrencia.
- Filtro por moneda cuando el espacio contiene movimientos en dos o más monedas.
- Detalle de movimiento.
- Categorías.
- Detalle de categoría.
- Movimientos asociados.
- Cuentas.
- Detalle de cuenta.

Debajo del título `Movimientos`, Actividad muestra un resumen compacto de
ingresos, gastos y balance. Las tres cifras se calculan sobre el mismo conjunto
de movimientos que presenta el listado y se actualizan al combinar o limpiar
sus filtros. Cuando el resumen alcanza la parte superior al recorrer los
movimientos, permanece flotando en la franja del selector de espacio y lo
sustituye temporalmente: el mismo bloque de badges pasa a sticky con una
transición breve y un borde visible, mientras el selector sale hacia la
izquierda. El selector reaparece y el bloque vuelve a su posición original al
volver por encima del resumen o al cambiar de pantalla. Cada badge abre la misma variante reutilizable de reporte temporal
que su acceso equivalente en Inicio, con navegación histórica y futura y la
acción para añadir un ingreso, gasto o movimiento. El conjunto incluye el mes local actual completo y excluye los
meses posteriores, que continúan accesibles desde Mapa.

Debajo de la sección de categorías aparece la sección `Cuentas`, también
plegable. Presenta las cuentas del espacio como tarjetas con la forma de una
tarjeta física, desplazables en horizontal, y debajo la misma información como
lista compacta con icono, nombre y saldo. Tocar una tarjeta o una fila abre el
detalle de la cuenta, con su saldo, el saldo inicial, los totales de ingresos
y gastos, sus movimientos y las acciones de editar y eliminar. Cada tarjeta
muestra el saldo en la moneda de su propia cuenta, así que el selector de
moneda de los movimientos no las filtra ni mezcla divisas, y no se muestra
ningún total agregado de todas las cuentas.

Crear una cuenta se hace desde ahí: con el estado vacío cuando no hay ninguna
y con `Añadir cuenta` bajo la lista cuando ya existen. El botón flotante de
crear no ofrece cuentas: es para registrar dinero, no para configurarlo.

Inicio repite esa sección debajo de las categorías, pero solo con las
tarjetas: su enlace `Ver más` lleva a la sección de cuentas de Actividad.

La gráfica y el listado forman una única sección plegable antes de los
movimientos: el donut aparece primero y debajo se muestra el detalle por
categoría. La gráfica siempre ofrece el total y los porcentajes como alternativa
textual accesible. El encabezado de la gráfica permite recorrer meses anteriores
y volver hacia el mes actual, sin permitir navegar a meses futuros. Sus segmentos
se trazan al entrar en Actividad, cambiar de mes y alternar entre gastos e
ingresos. Cuando el tipo y mes elegidos no tienen movimientos asociados a
categorías, la pantalla indica que debe registrarse y asociarse uno. Las vistas
previas de categoría de esta pantalla muestran el icono y el nombre y, cuando
existe presupuesto, el gasto acumulado y su progreso lineal. No muestran la
cantidad de movimientos; cuando no existe presupuesto conservan una barra lineal
vacía, sin simular importes ni progreso. Las previews de categoría forman un
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
movimiento o la tarjeta existente de categoría, manteniendo un check visible al
seleccionar.
Categoría permite seleccionar varias tarjetas existentes y, como Recurrencia,
usa un catálogo horizontal de dos filas que ocupa todo el ancho de la hoja.
Fecha aparece como primer grupo y reutiliza el navegador temporal de los
reportes de Inicio. Todos, Semana, Quincena, Mes, Año y Personalizada comparten
opciones con check en un catálogo horizontal de dos filas; Personalizada se
ubica junto a Quincena y permite elegir un rango en el calendario. Los cuatro
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

Presenta los gastos e ingresos del espacio activo en un calendario continuo con
desplazamiento vertical entre meses. El calendario ocupa todo el ancho de la
pantalla, mientras el nombre de la sección y su explicación permanecen fijos
arriba con el gutter habitual. Debajo de la explicación, una pestaña con el
mismo fondo blanco que el calendario muestra el mes enfocado —su nombre en
negrita y el año con menor énfasis— unida sin separación a la superficie del
calendario, como una pestaña que nace de ella; se actualiza con el mes que
domina la pantalla tanto en la vista mensual como en la semanal. Dentro de la
vista mensual, la fila Lun-Dom queda fija en la parte superior del calendario y
solo los números se desplazan debajo: el nombre del mes y los días de la semana
ya no se repiten dentro de cada bloque mensual. Los gastos se marcan en rojo y
los ingresos en verde, sin una leyenda de texto adicional junto a los puntos de
color. Al elegir un día, se abre una hoja con sus movimientos reutilizando
las vistas previas y el detalle existentes. La hoja mantiene abajo una acción
morada `Agregar movimiento` que abre el formulario con el día elegido. La
acción permanece flotante mientras los movimientos se desplazan por debajo y
el final de la lista reserva espacio para no ocultar contenido.

El historial navegable de ambas vistas comienza en enero de 2024. No se generan
ni se muestran meses o semanas anteriores a ese límite. El horizonte futuro de
ambas vistas llega hasta diciembre de 2080. Dentro del periodo visible, Mapa
proyecta las ocurrencias futuras de las series semanales, quincenales y
mensuales; así refleja tanto el pasado persistido como el futuro planificado sin
crear por adelantado todas esas filas en la base local.

Esa misma fila mantiene a la izquierda la pestaña con el mes enfocado y a la
derecha un control con el mismo tamaño y tratamiento de pestaña, con el texto
de la vista activa. Empieza en `Semanal` y al tocarlo cambia a `Mensual`. La
vista semanal presenta una lista vertical de semanas:
debajo del número de cada día aparecen tarjetas compactas de sus
movimientos, reutilizando la identidad visual de las previews de categoría de
Inicio pero mostrando únicamente el icono de categoría y el título del
movimiento. Tocar una tarjeta abre el detalle del movimiento y tocar el día abre
su hoja habitual. La primera entrada muestra inmediatamente la ventana del mes
actual. Al desplazarse hacia atrás se incorporan semanas anteriores hasta enero
de 2024 sin reemplazar la posición visible. Ese historial queda preparado tras
el primer layout para que un desplazamiento rápido no espere nuevas cargas; al
avanzar se muestran las semanas y movimientos futuros disponibles.
La variante semanal conserva el fondo blanco, las siete columnas y la escala
tipográfica de la vista mensual. Lun-Dom queda fijo en la parte superior igual
que en la vista mensual: cada semana repite el número de cada día, pero no su
nombre. Tampoco repite el nombre del mes sobre ninguna semana: la pestaña fija
ya lo muestra, así que anunciarlo de nuevo dentro de la lista sería redundante.
Las tarjetas son la única
capa añadida bajo los números y usan un borde interior de un píxel para mantener
contraste sobre el calendario blanco. Ambas variantes llevan los siete centros
de columna hasta el mismo ancho útil, cercano a los bordes del teléfono, y el
cambio entre ellas usa una transición breve que respeta movimiento reducido.
La transición actúa sobre las dos superficies completas mediante opacidad y un
desplazamiento vertical corto. Los días, etiquetas y tarjetas permanecen
estables dentro de sus listas para que alternar repetidamente no reinicie trabajo
por elemento. El periodo de la vista activa es la única referencia: la vista de
destino se adelanta en segundo plano mediante el mismo tracker local, como máximo
una vez cada 100 ms y solo cuando representa otra semana u otro mes. Al alternar,
la posición visible confirmada vuelve a compararse con el periodo activo para no
confiar únicamente en una solicitud de scroll todavía incompleta.

Al volver a tocar el control se recupera la vista mensual continua.

Los números de todos los meses mantienen el mismo contraste, sin cambios de
opacidad ligados al foco o al scroll. Las marcas quedan separadas del fondo de
selección para conservar su legibilidad.

El bloque fijo de nombre, explicación y pestaña de mes conserva además una
separación superior amplia para no quedar cubierto por el selector flotante de
espacio. Al
alejarse seis meses o más del mes actual aparece, a la izquierda de la acción
global de creación, el botón `Volver a hoy`: usa doble flecha hacia arriba al
recorrer meses futuros y hacia abajo al recorrer meses antiguos. El botón se
alinea verticalmente con la acción `+` y usa un borde gris sutil. Al pulsarlo,
la superficie del calendario desaparece durante 200 ms, las vistas mensual y
semanal se reinician localmente con hoy como ancla y la superficie reaparece
durante 300 ms. El retorno no recorre los periodos intermedios ni muestra texto,
loader o estado direccional. Dentro del contenedor de Mapa, el botón compensa 32
pt hacia abajo la diferencia respecto al nivel global de la acción `+`.

Los espacios no ocupan una pestaña.

### Ajustes

Se accede desde la acción inferior del menú lateral de espacios y se presenta
como una pantalla independiente, sin ocupar una pestaña principal. Reúne:

- Estado del perfil y de la cuenta.
- Preferencias de moneda, idioma, apariencia y privacidad de importes.
- Gestión de espacios, categorías archivadas y recurrencias.
- Notificaciones.
- Estado local de los datos, importación, exportación y privacidad.
- Ayuda, soporte, política de privacidad y versión de la aplicación.

Mientras una capacidad todavía no esté implementada, su fila permanece visible
para validar la arquitectura de la pantalla, muestra un punto rojo junto a la
acción y comunica al tocarla que está pendiente. Las acciones operativas no
usan ese indicador ni simulan que la operación se haya completado.

La tarjeta de perfil permite tocar la foto para elegir una imagen de la
cámara o la galería; se recomprime en el dispositivo antes de guardarse para
no acumular imágenes pesadas (`Bible/DATABASE.md` §5.4, versión 9). La fila
«Iniciar sesión o crear cuenta» ya no es pendiente: abre las pantallas de
autenticación existentes (registro, verificación de código, inicio de sesión,
recuperación de contraseña y migración de los datos de invitado).

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
- Integrar la representación del perfil dentro del selector de espacio, sin
  reservar un segundo botón permanente en el extremo opuesto del encabezado.
- Mantener fijo el selector de espacio y el acceso al perfil mientras se
  desplaza el contenido de cualquier pestaña principal.
- Mantener la pantalla actual al cambiar, cuando sea posible.
- Recargar los datos del nuevo contexto.
- Evitar mezclar o mostrar brevemente datos anteriores.
- Marcar claramente cuál está activo.
- Separar selección rápida de gestión profunda.
- Permitir crear y seleccionar espacios locales desde un menú lateral. El
  acceso a Ajustes permanece al pie y abre su pantalla independiente.

Plan gratuito previsto, sujeto a definición:

- Un espacio personal.
- Un espacio de pareja.

Los límites deben centralizarse como capacidades.

---

## 13. Creación de movimientos

### Acceso

La acción debe ser prominente, mediante botones de gasto e ingreso, botón
flotante o acción central. El botón flotante global de creación permanece
visible al desplazarse y al cambiar entre las pestañas principales.

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

El botón de cuenta acompaña a los de recurrencia y moneda, y solo aparece
cuando el espacio activo ya tiene alguna cuenta. Al elegir una, el movimiento
adopta su moneda y el selector de moneda desaparece; al quitarla, vuelve a la
moneda del espacio. Desde el propio selector se puede crear una cuenta sin
salir del flujo.

El espacio se deriva del contexto activo y no se pregunta de nuevo por defecto.
El importe debe ser válido y la categoría es obligatoria: el movimiento no se
puede guardar hasta seleccionar una categoría creada en el espacio activo.

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
Un total de ingresos o gastos igual a cero se omite. El presupuesto solo aparece
en el resumen cuando existe y muestra mediante una barra lineal el progreso, el
importe original y cuánto queda disponible. Desde el mismo modal se puede añadir
o retirar un presupuesto simple mediante un submodal con teclado numérico propio,
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

Los movimientos asociados se dividen en dos secciones dentro del mismo bloque,
en el mismo orden y ubicación de siempre. `Movimientos` reúne los que ya
sucedieron, con fecha económica de hoy o anterior. Cuando existe al menos un
movimiento con fecha posterior a hoy, aparece debajo una segunda sección
`Movimientos futuros`, ordenada de la fecha más próxima a la más lejana, sin
límite mensual: a diferencia de Inicio, un movimiento futuro de este espacio
es visible aquí en cuanto se crea, sin esperar a que su mes llegue. Ambas
secciones reutilizan la misma lista de vistas previas y el mismo detalle al
tocar un movimiento.

### Detalle de movimiento

El bloque de metadatos incluye una fila de cuenta, exista o no: cuando el
movimiento no tiene ninguna dice «Sin cuenta». Tocarla abre el selector y
permite asignarla o retirarla sin reabrir el formulario, igual que la fila de
categoría lleva a su detalle. Solo se ofrecen cuentas en la misma moneda del
movimiento, porque el importe no cambia al entrar en un saldo.

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
común de las copias entre espacios.

---

## 15. Espacio de pareja

Un usuario registrado puede crear un espacio, invitar a otra persona y comenzar a compartir.

Principios:

- Unirse no fusiona espacios personales.
- Los datos personales permanecen aislados.
- Los movimientos compartidos conservan autor.
- La salida no borra silenciosamente información.
- Las acciones sensibles requieren confirmación.

Debe diferenciarse entre:

- Abandonar.
- Expulsar.
- Disolver.
- Archivar.
- Copiar categorías.
- Conservar historial.
- Revocar acceso.

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
- Español como idioma inicial sin cerrar otros idiomas.
- Compatibilidad con modo claro y oscuro, seleccionable mediante un interruptor en Ajustes.

---

## 19. Métricas sugeridas

- Finalización del onboarding.
- Primer movimiento.
- Tiempo hasta el primer movimiento.
- Conversión de invitado a cuenta.
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
