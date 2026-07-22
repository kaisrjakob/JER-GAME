import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const css = await readFile(resolve(root, 'style.css'), 'utf8');
const config = await readFile(resolve(root, 'src/config.js'), 'utf8');
const game = await readFile(resolve(root, 'src/game.js'), 'utf8');
const references = new Set();
for (const source of [html, css, config]) {
  for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)|url\(["']?([^"')]+)["']?\)/g)) {
    const reference = match[1] || match[2];
    if (!reference || /^(?:https?:|data:)/.test(reference)) continue;
    references.add(reference);
  }
}
for (const match of config.matchAll(/asset:\s*['"]([^'"]+)['"]/g)) references.add(match[1]);
for (const match of config.matchAll(/['"](assets\/[^'"]+)['"]/g)) references.add(match[1]);
for (const reference of references) await access(resolve(root, reference));
const idsBlock = game.match(/const ids = \[([\s\S]*?)\];/);
if (!idsBlock) throw new Error('Could not locate the UI id registry.');
const registeredIds = [...idsBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
for (const id of registeredIds) {
  if (!html.includes('id="' + id + '"')) throw new Error('Missing UI element #' + id);
}
console.log('Asset check passed: ' + references.size + ' local references and ' + registeredIds.length + ' UI elements resolved.');
