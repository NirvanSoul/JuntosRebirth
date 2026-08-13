/**
 * Genera las páginas HTML estáticas de Legal/site/ a partir del contenido
 * versionado en src/features/legal/content/. Ejecutar con:
 *   npx tsx scripts/generate-legal-site.ts
 * Estas páginas no se publican automáticamente: hay que subirlas a
 * aoraestudio.com manualmente tras revisarlas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { privacyPolicy } from '../src/features/legal/content/privacyPolicy';
import { termsOfService } from '../src/features/legal/content/termsOfService';
import type { LegalDocumentContent } from '../src/features/legal/model/types';

const currentDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(currentDir, '../Legal/site');

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} · Juntos</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    padding: 2rem 1.25rem 4rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    background: #ffffff;
    color: #1a1a1a;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #121212; color: #ededed; }
    a { color: #8ab4ff; }
    .meta { color: #b3b3b3; }
    .section h2 { color: #f2f2f2; }
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 2rem; }
  .section { margin-top: 2rem; }
  .section h2 { font-size: 1.05rem; margin-bottom: 0.5rem; }
  .section p { margin: 0 0 0.75rem; }
  footer { margin-top: 3rem; font-size: 0.85rem; color: #777; }
  a { color: #0a5cff; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function renderDocument(content: LegalDocumentContent): string {
  const sections = content.sections
    .map(
      (section) => `<div class="section">
<h2>${escapeHtml(section.heading)}</h2>
${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
</div>`,
    )
    .join('\n');

  const body = `<h1>${escapeHtml(content.title)}</h1>
<p class="meta">Versión ${escapeHtml(content.version)} · Vigente desde ${escapeHtml(content.effectiveDate)} · Última actualización ${escapeHtml(content.lastUpdated)}</p>
${content.intro.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
${sections}
<footer>Juntos · <a href="mailto:aora.estudio.o@gmail.com">aora.estudio.o@gmail.com</a></footer>`;

  return pageShell(content.title, body);
}

function renderAccountDeletePage(): string {
  const body = `<h1>Eliminar cuenta y datos de Juntos</h1>
<p class="meta">Página pública requerida por Google Play para solicitar el borrado de cuenta desde fuera de la aplicación.</p>
<div class="section">
<h2>Dentro de la aplicación (recomendado)</h2>
<p>Abre Juntos → Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos. El proceso se completa en la propia aplicación, con confirmación y sin necesidad de esperar respuesta por correo.</p>
</div>
<div class="section">
<h2>Sin acceso a la aplicación</h2>
<p>Si no puedes abrir la aplicación, escribe a <a href="mailto:aora.estudio.o@gmail.com?subject=Eliminar%20cuenta%20Juntos">aora.estudio.o@gmail.com</a> desde el correo asociado a tu cuenta, indicando que solicitas la eliminación de tu cuenta y tus datos de Juntos. Responderemos confirmando el borrado.</p>
</div>
<div class="section">
<h2>Qué se elimina</h2>
<p>Tu cuenta de acceso, tu perfil y tus movimientos personales. Los movimientos de un espacio compartido se anonimizan en lugar de romper los datos legítimos de la otra persona del espacio. Más detalle en la <a href="./privacy.html">Política de privacidad</a>, sección 13.</p>
</div>
<footer>Juntos · <a href="mailto:aora.estudio.o@gmail.com">aora.estudio.o@gmail.com</a></footer>`;

  return pageShell('Eliminar cuenta y datos', body);
}

function renderIndexPage(): string {
  const body = `<h1>Juntos — Documentos legales</h1>
<div class="section">
<p><a href="./privacy.html">Política de privacidad</a></p>
<p><a href="./terms.html">Términos de servicio</a></p>
<p><a href="./account-delete.html">Eliminar cuenta y datos</a></p>
</div>
<footer>Juntos · <a href="mailto:aora.estudio.o@gmail.com">aora.estudio.o@gmail.com</a></footer>`;

  return pageShell('Documentos legales', body);
}

mkdirSync(siteDir, { recursive: true });
writeFileSync(resolve(siteDir, 'privacy.html'), renderDocument(privacyPolicy));
writeFileSync(resolve(siteDir, 'terms.html'), renderDocument(termsOfService));
writeFileSync(
  resolve(siteDir, 'account-delete.html'),
  renderAccountDeletePage(),
);
writeFileSync(resolve(siteDir, 'index.html'), renderIndexPage());

// eslint-disable-next-line no-console
console.log(`Generado en ${siteDir}`);
