import type * as SQLite from 'expo-sqlite';

const touchRow = `
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       sync_status = CASE
         WHEN sync_status = 'local_only' THEN 'local_only'
         ELSE 'pending'
       END`;

/** Tono superviviente más cercano a cada color retirado de la paleta. */
const nearestSurvivingColor = `
   CASE color_token
     WHEN 'rose' THEN 'plum'
     WHEN 'emerald' THEN 'forest'
     WHEN 'cyan' THEN 'teal'
     WHEN 'amber' THEN 'brown'
     ELSE color_token
   END`;

const retiredColors = `color_token IN ('rose', 'emerald', 'cyan', 'amber')`;

/**
 * Migración local 27. La paleta retira `rose`, `emerald`, `cyan` y `amber`, y
 * las filas que los conservan dejarían de resolverse contra `categoryColors`.
 * Las categorías por defecto pasan al color que ahora les asigna su plantilla,
 * para que un dispositivo antiguo y una instalación nueva coincidan; el resto
 * pasa al tono superviviente más cercano.
 */
export async function applyRetiredCategoryColorMigration(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion >= 27) return;

  await transaction.execAsync(`
    UPDATE categories
       SET color_token = CASE template_key
             WHEN 'leisure' THEN 'forest'
             WHEN 'subscriptions' THEN 'pink'
             WHEN 'travel' THEN 'blue'
             WHEN 'pets' THEN 'orange'
             ELSE color_token
           END,
           ${touchRow}
     WHERE is_default = 1
       AND ${retiredColors}
       AND (
         (template_key = 'leisure' AND color_token = 'emerald') OR
         (template_key = 'subscriptions' AND color_token = 'rose') OR
         (template_key = 'travel' AND color_token = 'cyan') OR
         (template_key = 'pets' AND color_token = 'amber')
       );

    UPDATE categories
       SET color_token = ${nearestSurvivingColor},
           ${touchRow}
     WHERE ${retiredColors};

    UPDATE money_accounts
       SET color_token = ${nearestSurvivingColor},
           ${touchRow}
     WHERE ${retiredColors};
  `);
}
