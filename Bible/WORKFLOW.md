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
- Cline lee la documentación aplicable de `Bible/`.
- Cline escribe una **ficha de tarea** (plantilla en §6).
- El responsable aprueba el alcance y el fuera de alcance.

### Gate 1 — Checks automáticos (Cline, en verde)

```sh
npm run validate   # typecheck + lint + format:check + tests
```

No se puede pasar al siguiente gate con estos checks en rojo. Nunca se
desactivan TypeScript, lint o tests para «hacer que pase».

### Gate 2 — Auditoría de Claude (verificador)

- Cline entrega el **paquete de revisión** (§5).
- Claude busca: bugs, casos límite, violaciones de arquitectura, duplicación,
  problemas de seguridad y deriva de documentación.
- Claude responde con una lista de hallazgos (con severidad) o un visto bueno.

### Gate 3 — Revisión cruzada de ChatGPT (segundo verificador)

- Revisa el mismo paquete de forma independiente.
- Prioriza: regresiones, paridad iOS/Android, datos y privacidad, y coherencia
  con el producto.

### Gate 4 — Corrección e iteración

- Cline corrige los hallazgos aprobados por el responsable.
- Cline reejecuta el Gate 1.
- Si los cambios son sustanciales, el paquete vuelve a los gates 2 y 3.

### Gate 5 — Cierre

- `npm run validate` final en verde.
- Commit atómico con mensaje claro.
- Documentación (`Bible/`) actualizada si el cambio lo exige.
- Resumen de cierre (`PROJECT_RULES.md` §25).

---

## 4. Definición de «terminado»

Un cambio está terminado **solo** cuando:

1. Pasa el Gate 1 en verde.
2. Tiene al menos un visto bueno de verificador (para tareas medianas o
   grandes, idealmente dos).
3. Está commiteado y documentado.

«Compila» o «los tests pasan» **no** es suficiente sin revisión.

---

## 5. Paquete de revisión

Cline entrega, en un único bloque markdown que se pueda copiar entre
herramientas:

- Ficha de tarea (objetivo, alcance, fuera de alcance).
- Lista de archivos tocados.
- Resumen del diff.
- Resultado del Gate 1.
- Qué se reutilizó y qué dependencias se añadieron (si alguna).
- Riesgos y pendientes conocidos.

Los verificadores responden con hallazgos clasificados por severidad
(`bloqueante`, `importante`, `menor`) o con un visto bueno.

---

## 6. Plantilla de ficha de tarea

```md
### Clasificación
pequeña | mediana | grande

### Objetivo

### Alcance (archivos o dominios)

### Fuera de alcance

### Reutilización (componentes, hooks, servicios existentes)

### Riesgos (plataforma, datos, migración, regresión)

### Validación (checks a ejecutar)
```

Para tareas pequeñas, la ficha puede reducirse a una nota breve
(`PROJECT_RULES.md` §27).

---

## 7. Higiene de Git

- Un cambio lógico = un commit.
- Mensajes descriptivos.
- **Prohibido** commitear artefactos de trabajo de agentes: handoffs, estados de
  implementación («IMPLEMENTATION_STATE»), «CONTEXT_ENGINE», checkpoints o
  planes locales. Van en un espacio privado, nunca en el repositorio.
- **Prohibidos** los commits gigantes («montón de cambios»): dividir en entregas
  pequeñas y revisables.
- Rama por feature cuando el cambio sea grande; merge pequeño.

---

## 8. Prohibiciones específicas (derivadas de la auditoría)

- No commitear artefactos de trabajo de IA en el repo.
- No crear «god components»: un archivo que supere ~300–400 líneas debe
  descomponerse o justificarse por escrito.
- No importar desde rutas internas de `node_modules`
  (`phosphor-react-native/src/...`, `react-native-calendars/src/...`).
- No duplicar helpers (fechas, moneda, texto): reutilizar `src/lib/`.
- No dejar huecos ni churn (versiones que suben y bajan) en migraciones o en la
  versión de la base de datos local.
- Mantener `Bible/` sincronizado con el código.

---

## 9. Mejora continua

Si un verificador detecta un patrón de error recurrente, se registra en §8 para
que no vuelva a ocurrir. El objetivo no es añadir burocracia, sino hacer que el
cambio correcto sea fácil y el cambio incorrecto resulte evidente.

---

## 10. Modo de trabajo actual

Hasta nueva orden, el trabajo se registra **solo en commits locales** de Git. No
se hace push ni se toca el remoto de GitHub: el responsable quiere medir el
avance localmente. Cuando se decida publicar, se revisará este apartado y se
definirá el mecanismo de sincronización.
