# WORKFLOW.md

## 1. Propósito

Este documento define la jerarquía de trabajo del proyecto y las comprobaciones
obligatorias («checks») que un cambio debe superar antes de considerarse
terminado.

Complementa a `PROJECT_RULES.md`; no lo sustituye. En caso de contradicción,
gana la instrucción explícita del responsable y, después, `PROJECT_RULES.md`.

Existe para evitar el desorden detectado en la auditoría inicial: artefactos de
trabajo de agentes commitados, commits gigantes, componentes monstruo, imports
internos de librerías y documentación desincronizada.

---

## 2. Jerarquía y roles

Orden de autoridad en el trabajo diario:

1. **Responsable del proyecto (humano).** Aprueba prioridades, alcance y
   decisiones. Es la voz final.
2. **Cline — actor principal de código.** Implementa, ejecuta los checks
   automáticos y corrige los hallazgos.
3. **Claude — verificador / supervisor de auditorías.** Revisa el trabajo de
   Cline y busca errores, bugs y desviaciones de las reglas.
4. **ChatGPT — segundo verificador.** Revisión cruzada e independiente.

Reglas de la jerarquía:

- El responsable decide **qué** se construye y **qué** se acepta.
- Cline **no declara su propio trabajo «terminado»** sin la revisión de al menos
  un verificador.
- Los verificadores **no editan código**: señalan problemas; Cline implementa
  las correcciones.
- Un hallazgo de un verificador no es una orden automática de cambio: el
  responsable lo prioriza.

---

## 3. Ciclo de vida de una tarea (checks)

### Gate 0 — Alineación (antes de codificar)

- Cline clasifica la tarea: pequeña, mediana o grande (`PROJECT_RULES.md` §4).
- Cline lee la documentación aplicable según el presupuesto de lectura (§3.1).
- Cline escribe una ficha de tarea (`PROJECT_RULES.md` §27).

Aprobación del responsable:

- **Tarea pequeña:** no requiere aprobación previa. La ficha se entrega junto
  con el resultado. Si durante el trabajo la tarea deja de ser pequeña, Cline
  para y la reclasifica antes de seguir.
- **Tarea mediana:** aprobación previa solo del alcance y el fuera de alcance.
- **Tarea grande:** aprobación previa obligatoria, con enfoques comparados.

La pre-aprobación no es permiso para ampliar alcance: `PROJECT_RULES.md` §5
sigue aplicando.

### Gate 1 — Checks automáticos

```sh
npm run validate   # typecheck + lint + format:check + tests
```

No se pasa al siguiente gate con estos checks en rojo. Nunca se desactivan
TypeScript, lint o tests para «hacer que pase».

### Gate 2 — Verificación

Cline entrega el paquete de revisión (§5) y lo envía **a la vez** a los
verificadores que correspondan. No se encadenan: revisar en serie duplica la
espera sin mejorar el resultado.

Verificadores necesarios según la tarea:

| Tarea | Verificación |
|---|---|
| Pequeña | Checks automáticos (Gate 1). Sin verificador humano/IA salvo que toque datos, permisos o dinero. |
| Mediana | Un verificador. |
| Grande, o cualquier tarea que toque SQL, permisos, sincronización, migración de invitado o cálculo de importes | Dos verificadores, en paralelo. |

Cada verificador responde una de dos cosas:

- **Visto bueno sin hallazgos.** Es un resultado válido y esperado. Un
  verificador no debe fabricar hallazgos menores para justificar la revisión.
- **Lista de hallazgos** clasificados: `bloqueante`, `importante`, `menor`. Un
  hallazgo sin escenario de fallo concreto no es un hallazgo: es una opinión, y
  va aparte, en una sección de sugerencias.

Si los verificadores se contradicen, ninguno tiene prioridad sobre el otro: se
presentan ambas posturas al responsable, que decide. Cline no elige la revisión
que le resulta más cómoda ni promedia las dos.

### Gate 3 — Corrección e iteración

- Cline corrige los hallazgos aprobados por el responsable.
- Cline reejecuta el Gate 1.
- Si los cambios son sustanciales, el paquete vuelve al Gate 2.

### Gate 4 — Cierre

- `npm run validate` final en verde.
- Commit atómico con mensaje claro.
- Documentación (`Bible/`) actualizada si el cambio lo exige.
- Resumen de cierre (`PROJECT_RULES.md` §25).

### 3.1 Presupuesto de lectura

Leer documentación tiene coste. Antes de codificar se lee lo aplicable, no todo
lo existente.

| Tarea | Lectura obligatoria |
|---|---|
| Pequeña | El archivo afectado y sus vecinos directos. Nada de `Bible/` salvo duda concreta. |
| Mediana | `PROJECT_RULES.md` §§3-7 y el documento de dominio aplicable (`PRODUCT.md`, `ARCHITECTURE.md` o `DATABASE.md`). |
| Grande | Documentos de dominio completos + índice de `DECISIONS.md`, y solo las decisiones concretas que el índice señale como relevantes. |

`DECISIONS.md` no se lee entero nunca. Se consulta por índice.

---

## 4. Definición de «terminado»

Un cambio está terminado **solo** cuando:

1. Pasa el Gate 1 en verde.
2. Tiene la verificación que le corresponde según el Gate 2.
3. Está commiteado y documentado.

«Compila» o «los tests pasan» **no** es suficiente sin la verificación que
corresponda.

Una casilla se marca `[x]` solo cuando existe implementación y evidencia
proporcional a su naturaleza, ya ejecutada y registrada: una prueba
automática, una configuración verificable, o el resultado anotado de una
verificación manual, nativa o SQL. Permanece `[ ]` mientras esa evidencia no
se haya producido — no porque el criterio dependa de un dispositivo, de un
Supabase real, de pgTAP, de accesibilidad, de rendimiento o de una decisión
humana, sino porque todavía no se han hecho. Que exista un archivo no cierra
nada.

---

## 5. Paquete de revisión

El paquete de revisión es el **resumen obligatorio de `PROJECT_RULES.md` §25**,
entregado en el Gate 2, más:

- Lista de archivos tocados.
- Resumen del diff.
- Resultado del Gate 1.
- Riesgos y pendientes conocidos.

Los verificadores responden con lo indicado en el Gate 2 (visto bueno o
hallazgos).

---

## 6. Higiene de Git

- Un cambio lógico = un commit.
- Mensajes descriptivos.
- **Prohibidos** los commits gigantes («montón de cambios»): dividir en entregas
  pequeñas y revisables.
- Rama por feature cuando el cambio sea grande; merge pequeño.
- Los artefactos de trabajo de agentes no se commitean: hay un check de CI y
  patrones en `.gitignore` que lo impiden.

---

## 7. Prohibiciones mecánicas

Las reglas que puede comprobar una máquina no se recuerdan en prosa:

- **«God components»** (`max-lines`) y **imports internos de `node_modules`**
  (`no-restricted-imports`): se verifican en `eslint.config.js`.
- **Artefactos de trabajo de agentes**: se verifican en el workflow de CI y en
  `.gitignore`. El check de CI se ejecuta al publicar (push o PR); mientras se
  trabaja solo en local, la guarda activa es `.gitignore`.

El resto de prohibiciones vive en `PROJECT_RULES.md` §26.

---

## 8. Mejora continua

Si un verificador detecta un patrón de error recurrente, se registra en
`PROJECT_RULES.md` §26 o se convierte en un check automático. El objetivo no es
añadir burocracia, sino hacer que el cambio correcto sea fácil y el cambio
incorrecto resulte evidente.

---

## 9. Modo de trabajo actual

Hasta nueva orden, el trabajo se registra **solo en commits locales** de Git. No
se hace push ni se toca el remoto de GitHub: el responsable quiere medir el
avance localmente. Cuando se decida publicar, se revisará este apartado y se
definirá el mecanismo de sincronización.
