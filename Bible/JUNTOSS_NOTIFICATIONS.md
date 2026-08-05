# JUNTOSS_NOTIFICATIONS.md

## 1. Propósito

Este documento define las plantillas, el tono y las reglas de implementación de las notificaciones de `juntoss`.

La aplicación utiliza tres tipos de notificaciones:

1. **Recordatorios de gastos solicitados por el usuario.**
2. **Recordatorios de ingresos solicitados por el usuario.**
3. **Recordatorios diarios generados por la aplicación para fomentar el registro de movimientos.**

Las notificaciones deben sentirse humanas, claras y útiles. No deben parecer mensajes publicitarios ni recordatorios mecánicos.

---

## 2. Principios de redacción

Todas las notificaciones deben cumplir estas reglas:

- Comunicar la idea principal en las primeras palabras.
- Ser fáciles de entender en una lectura rápida.
- Utilizar frases cortas.
- Evitar lenguaje contable o técnico.
- Evitar culpabilizar al usuario.
- Evitar mensajes alarmistas.
- No utilizar más de un emoji.
- No utilizar emojis por defecto en la primera versión.
- No utilizar signos de exclamación excesivos.
- No repetir la misma plantilla dos veces seguidas.
- Priorizar el beneficio para el usuario sobre la promoción de la aplicación.
- Mantener un tono cercano, tranquilo y respetuoso.
- No asumir que el movimiento ya ocurrió cuando se trata de un recordatorio futuro.
- Utilizar la moneda y el formato numérico configurados por el usuario.
- Utilizar la categoría y el título únicamente cuando estén disponibles.
- No mostrar valores vacíos, `null`, `undefined` ni textos técnicos.

---

## 3. Variables disponibles

| Variable | Descripción | Ejemplo |
|---|---|---|
| `{{category}}` | Nombre de la categoría | Transporte |
| `{{title}}` | Título del movimiento | Abono mensual |
| `{{amount}}` | Importe formateado | 42,90 € |
| `{{date}}` | Fecha formateada | 12 de agosto |
| `{{userName}}` | Nombre del usuario | Alan |
| `{{appName}}` | Nombre de la aplicación | juntoss |

### Reglas para variables opcionales

- `{{category}}` debe usarse cuando exista.
- `{{amount}}` debe incluir moneda.
- `{{title}}` es opcional.
- `{{date}}` solo debe utilizarse si aporta claridad.
- `{{userName}}` debe utilizarse con moderación.
- Si falta una variable, se debe elegir una plantilla compatible.
- Nunca deben aparecer separadores sobrantes ni líneas vacías.

---

## 4. Iconos

### Recordatorios de gastos

Deben utilizar el icono de la categoría del gasto.

### Recordatorios de ingresos

Deben utilizar el icono de la categoría del ingreso.

### Recordatorios diarios de la aplicación

Deben utilizar el logo de `juntoss`.

### Limitaciones de plataforma

Los agentes deben verificar qué permite iOS y Android antes de asumir que el icono principal puede cambiar dinámicamente.

Cuando la plataforma lo limite:

- Mantener el icono permitido por el sistema.
- Mostrar el icono de categoría dentro del contenido enriquecido cuando sea posible.
- No romper la entrega de la notificación por forzar un icono no compatible.
- Documentar diferencias entre plataformas.

---

# 5. Recordatorios de gastos

## Plantilla 1

**Título:** Recuerda este gasto  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 2

**Título:** Tienes un gasto pendiente  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 3

**Título:** Hoy toca revisar este gasto  
**Texto:** `{{category}} por {{amount}}`

## Plantilla 4

**Título:** No olvides este gasto 
**Texto:** `{{title}} en {{category}} · {{amount}}`

## Plantilla 5

**Título:** Este gasto está por llegar  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 6

**Título:** Ten presente este gasto  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 7

**Título:** Próximo gasto: {{category}}  
**Texto:** `Importe previsto: {{amount}}`

## Plantilla 8

**Título:** Recuerda registrar este gasto  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 9

**Título:** Un gasto para tener en cuenta  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 10

**Título:** Hello, revisa este movimiento  
**Texto:** `{{title}} en {{category}} · {{amount}}`

---

# 6. Recordatorios de ingresos

## Plantilla 1

**Título:** Tienes un ingreso previsto  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 2

**Título:** Recuerda este ingreso  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 3

**Título:** Hoy podrías recibir {{amount}}  
**Texto:** `{{category}}`

## Plantilla 4

**Título:** Un ingreso está por llegar  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 5

**Título:** Revisa este cobro  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 6

**Título:** Tienes dinero pendiente por recibir  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 7

**Título:** Próximo ingreso: {{category}}  
**Texto:** `Importe previsto: {{amount}}`

## Plantilla 8

**Título:** No olvides registrar este ingreso  
**Texto:** `{{title}} · {{amount}}`

## Plantilla 9

**Título:** Mantente pendiente de este ingreso  
**Texto:** `{{category}} · {{amount}}`

## Plantilla 10

**Título:** Este ingreso merece seguimiento  
**Texto:** `{{title}} en {{category}} · {{amount}}`

### Regla de verbos

- **Cobrar:** freelance, facturas, ventas o trabajos.
- **Recibir:** salario, transferencias, ayudas o regalos.
- **Registrar:** cuando el contexto sea genérico.
- **Revisar:** cuando no se conozca con certeza la naturaleza del ingreso.

---

# 7. Recordatorios diarios de la aplicación

Frecuencia:

- Máximo una notificación al día.
- Nunca más de una notificación diaria de este tipo.
- No repetir la misma plantilla dos días seguidos.
- Hora fija definida por la aplicación, sin ajuste del usuario.
- Siempre activo: no existe una opción en Ajustes para desactivarlo. Si el
  usuario ya registró un movimiento ese día, no se envía; si la hora del día
  ya pasó, se reprograma para el día siguiente.

## Plantilla 1

**Título:** ¿Tienes movimientos por registrar?  
**Texto:** Pon tus finanzas al día en menos de un minuto.

## Plantilla 2

**Título:** Un minuto para organizarte  
**Texto:** Registra lo de hoy antes de que se te olvide.

## Plantilla 3

**Título:** Mantén tu dinero al día  
**Texto:** Añade tus últimos gastos o ingresos.

## Plantilla 4

**Título:** ¿Gastaste algo hoy?  
**Texto:** Regístralo ahora y evita recordarlo después.

## Plantilla 5

**Título:** Tu resumen mejora con cada movimiento  
**Texto:** Añade lo que falta de hoy.

## Plantilla 6

**Título:** Que no se te escape ningún gasto  
**Texto:** Revisa si tienes algo pendiente por registrar.

## Plantilla 7

**Título:** Tus finanzas, un poco más claras  
**Texto:** Registra tus movimientos recientes.

## Plantilla 8

**Título:** Haz memoria de tu día  
**Texto:** ¿Tuviste algún gasto o ingreso?

## Plantilla 9

**Título:** Organizarte sigue siendo sencillo  
**Texto:** Añade tus movimientos en juntoss.

## Plantilla 10

**Título:** Llevar tus finanzas al día es gratis  
**Texto:** Registra ahora lo que gastaste o recibiste.

## Plantilla 11

**Título:** Un pequeño hábito ayuda mucho  
**Texto:** Revisa y registra tus movimientos de hoy.

## Plantilla 12

**Título:** Tu balance necesita lo de hoy  
**Texto:** Añade cualquier gasto o ingreso pendiente.

## Plantilla 13

**Título:** Cierra el día con tus cuentas claras  
**Texto:** Registra lo que todavía falta.

## Plantilla 14

**Título:** Lo de hoy también cuenta  
**Texto:** Añade tus movimientos recientes.

## Plantilla 15

**Título:** Tu yo de mañana te lo agradecerá  
**Texto:** Registra hoy para no hacer memoria después.

---

## 8. Rotación de plantillas

El sistema debe:

- Evitar repetir la misma plantilla en días consecutivos.
- Evitar usar una plantilla más de dos veces en una semana.
- Guardar localmente las últimas plantillas utilizadas.
- Elegir solo plantillas compatibles con los datos disponibles.
- Permitir añadir plantillas sin cambiar la lógica principal.

Identificadores sugeridos:

- `expense_reminder_01`
- `income_reminder_01`
- `daily_engagement_01`

No se recomienda una selección completamente aleatoria.

Flujo recomendado:

1. Filtrar plantillas compatibles.
2. Excluir las utilizadas recientemente.
3. Seleccionar una de las restantes.
4. Guardar su identificador.

---

## 9. Horarios y frecuencia

### Recordatorios solicitados por el usuario

- Respetar fecha, hora, recurrencia y zona horaria.
- Permitir editar, pausar y eliminar.
- Evitar duplicados.
- Recalcular cuando cambie la zona horaria.
- Mostrar si el recordatorio está activo.

### Recordatorios diarios

- Máximo uno al día.
- Hora fija definida por la aplicación, fuera de horario nocturno.
- Siempre activo; no hay preferencia de usuario para desactivarlo.
- Se omite si el usuario ya registró un movimiento ese día.
- No usar patrones agresivos de reactivación.

---

## 10. Privacidad

La personalización debe mejorar la claridad, no resultar invasiva.

Permitido:

- Categoría.
- Título.
- Importe.
- Fecha.
- Nombre del usuario ocasionalmente.

Evitar:

- Notas privadas.
- Balances completos.
- Nombres de otros miembros sin necesidad.
- Demasiados datos en una sola notificación.

Debe existir una opción para ocultar importes o detalles sensibles en la pantalla bloqueada.

Ejemplo privado:

**Título:** Tienes un movimiento pendiente  
**Texto:** Abre juntoss para revisar los detalles.

---

## 11. Espacios compartidos

Cuando el movimiento pertenezca a un espacio compartido:

- Identificar el espacio solo si evita confusión.
- No mostrar nombres de miembros innecesariamente.
- No enviar el recordatorio a todos salvo que la regla lo indique.
- Un recordatorio personal pertenece al usuario que lo creó.
- Un recordatorio compartido debe indicar claramente su alcance.

Ejemplo:

**Título:** Gasto pendiente en Casa  
**Texto:** Supermercado · 64,20 €

---

## 12. Acciones rápidas

Cuando la plataforma lo permita:

- `Registrar`
- `Marcar como recibido`
- `Marcar como pagado`
- `Posponer`
- `Ver movimiento`

Reglas:

- Máximo dos acciones principales.
- La acción debe ser inequívoca.
- Las operaciones sensibles deben abrir la aplicación.
- No marcar como pagado o recibido sin confirmación cuando afecte a otros usuarios.

---

## 13. Navegación al abrir una notificación

### Recordatorio de gasto

Abrir el formulario o detalle del gasto correspondiente.

### Recordatorio de ingreso

Abrir el formulario o detalle del ingreso correspondiente.

### Recordatorio diario

Abrir la creación de movimiento o Inicio, según contexto.

Reglas:

- Mantener el espacio correcto.
- Restaurar el contexto después de autenticación.
- Gestionar correctamente la app cerrada o abierta.
- Evitar duplicados al pulsar varias veces.

---

## 14. Estados y errores

El sistema debe contemplar:

- Permiso denegado.
- Recordatorio sin datos.
- Movimiento eliminado.
- Categoría archivada.
- Cambio de moneda.
- Cambio de zona horaria.
- Usuario desconectado.
- Espacio eliminado o abandonado.
- Notificación ya procesada.
- Aplicación reinstalada.
- Programación duplicada.

---

## 15. Accesibilidad

- Lenguaje claro.
- No depender solo del icono.
- Título y texto comprensibles por separado.
- Evitar abreviaturas.
- Mantener la información importante al principio.
- Probar truncado.
- Respetar ajustes del sistema.

---

## 16. Analítica

Se puede medir:

- Entrega.
- Apertura.
- Acción utilizada.
- Posposición.
- Identificador de plantilla.
- Conversión a movimiento registrado.

No se debe enviar:

- Importe.
- Título.
- Categoría personalizada.
- Notas.
- Información financiera sensible.

---

## 17. Implementación recomendada

Las plantillas deben almacenarse como datos.

```ts
type NotificationTemplate = {
  id: string;
  type: "expense" | "income" | "daily";
  title: string;
  body: string;
  requiredVariables: Array<
    "category" | "title" | "amount" | "date" | "userName"
  >;
};
```

Ejemplo:

```ts
const expenseTemplates: NotificationTemplate[] = [
  {
    id: "expense_reminder_01",
    type: "expense",
    title: "Recuerda este gasto",
    body: "{{category}} · {{amount}}",
    requiredVariables: ["category", "amount"],
  },
];
```

La interpolación debe:

- Validar variables.
- Elegir una variante compatible.
- Eliminar separadores sobrantes.
- Aplicar formato local.
- Evitar resultados vacíos.
- No mostrar datos técnicos.

---

## 18. Checklist para agentes

- [ ] Leer este archivo.
- [ ] Identificar el tipo de notificación.
- [ ] Confirmar datos disponibles.
- [ ] Revisar privacidad.
- [ ] Revisar icono.
- [ ] Verificar iOS y Android.
- [ ] Confirmar zona horaria.
- [ ] Evitar duplicados.
- [ ] Revisar navegación al abrir.
- [ ] Probar variables faltantes.
- [ ] Probar truncado.
- [ ] Probar aplicación cerrada y abierta.
- [ ] No registrar datos sensibles.
- [ ] Actualizar este documento si cambia el comportamiento.

---

## 19. Regla final

> Una notificación de juntoss debe ayudar al usuario a recordar algo importante, no recordarle que la aplicación quiere su atención.

La utilidad, la claridad y el respeto por el usuario tienen prioridad sobre la frecuencia de apertura.
