// Bloquea nuevas supresiones de `exhaustive-deps` más allá de la línea base.
//
// Línea base: UNA supresión, únicamente en
// `src/features/import/screens/ImportScreen.tsx`. Esa supresión es intencional
// (semántica de snapshot del efecto de reinicio, documentada en el propio
// archivo) y está cubierta por las pruebas de ciclo de vida de
// `ImportScreen.test.tsx`. Cualquier otra supresión, o una segunda aparición,
// hace fallar este check.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const baseline = {
  allowedFile: 'src/features/import/screens/ImportScreen.tsx',
  maxOccurrences: 1,
};

const suppressionPattern =
  /eslint-disable(?:-next-line|-line)?[^\n]*react-hooks\/exhaustive-deps/;

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const root = resolve(process.cwd());
const matches = [];

for (const file of collectSourceFiles(join(root, 'src'))) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (suppressionPattern.test(line)) {
      matches.push(`${rel}:${index + 1}`);
    }
  });
}

const outsideAllowed = matches.filter(
  (match) => !match.startsWith(`${baseline.allowedFile}:`),
);

if (outsideAllowed.length > 0 || matches.length > baseline.maxOccurrences) {
  console.error('✖ check-exhaustive-deps-suppressions:');
  for (const match of outsideAllowed) {
    console.error(`  - supresión fuera de ${baseline.allowedFile}: ${match}`);
  }
  if (matches.length > baseline.maxOccurrences) {
    console.error(
      `  - demasiadas supresiones (${matches.length}); máximo ${baseline.maxOccurrences}`,
    );
  }
  console.error(
    'La única supresión permitida es la de ImportScreen.tsx (snapshot intencional, cubierta por tests).',
  );
  process.exit(1);
}

process.stdout.write(
  '✓ check-exhaustive-deps-suppressions: línea base respetada.\n',
);
