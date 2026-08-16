// Bloquea nuevas supresiones de `exhaustive-deps` más allá de la línea base.
//
// Línea base: UNA supresión, únicamente en
// `src/features/import/screens/ImportScreen.tsx`, y anclada al efecto que
// cierra con `}, [visible, activeSpaceId]);`. Esa supresión es intencional
// (semántica de snapshot, documentada en el propio archivo) y está cubierta por
// las pruebas de ciclo de vida de `ImportScreen.test.tsx`. Cualquier otra
// supresión, una segunda aparición, o una supresión trasladada a otro efecto,
// hace fallar este check: reaudita la excepción.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const baseline = {
  allowedFile: 'src/features/import/screens/ImportScreen.tsx',
  maxOccurrences: 1,
  anchor: /\[visible, activeSpaceId\]/,
};

const suppressionPattern =
  /eslint-disable(?:-next-line|-line)?[^\n]*react-hooks\/exhaustive-deps/;

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
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
      matches.push({
        rel,
        lineNumber: index + 1,
        nextLine: (lines[index + 1] ?? '').trim(),
      });
    }
  });
}

const outsideAllowed = matches.filter(
  (match) => match.rel !== baseline.allowedFile,
);
const unanchored = matches.filter(
  (match) =>
    match.rel === baseline.allowedFile && !baseline.anchor.test(match.nextLine),
);

if (
  outsideAllowed.length > 0 ||
  matches.length > baseline.maxOccurrences ||
  unanchored.length > 0
) {
  console.error('✖ check-exhaustive-deps-suppressions:');
  for (const match of outsideAllowed) {
    console.error(
      `  - supresión fuera de ${baseline.allowedFile}: ${match.rel}:${match.lineNumber}`,
    );
  }
  if (matches.length > baseline.maxOccurrences) {
    console.error(
      `  - demasiadas supresiones (${matches.length}); máximo ${baseline.maxOccurrences}`,
    );
  }
  for (const match of unanchored) {
    console.error(
      `  - supresión no anclada al efecto [visible, activeSpaceId]: ${match.rel}:${match.lineNumber}`,
    );
  }
  console.error(
    'La única supresión permitida es la de ImportScreen.tsx, anclada al efecto ' +
      'que cierra con `}, [visible, activeSpaceId]);`. Si esas dependencias ' +
      'cambiaron, reaudita la excepción.',
  );
  process.exit(1);
}

process.stdout.write(
  '✓ check-exhaustive-deps-suppressions: línea base respetada.\n',
);
