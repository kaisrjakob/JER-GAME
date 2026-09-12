import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(resolve(root, file), 'utf8');
const manifest = JSON.parse(await read('manifest.webmanifest'));
const html = await read('index.html');
const sw = await read('sw.js');

test('the manifest uses relative paths so it works under the Pages subdirectory', () => {
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  for (const icon of manifest.icons) assert.ok(!icon.src.startsWith('/'), icon.src);
});

test('the manifest carries what Android needs to offer an install', async () => {
  // Ohne ein Icon >=192px mit purpose "any" bietet Chrome die Installation nicht an -
  // alle Icons nur als "maskable" zu deklarieren macht die Seite uninstallierbar.
  const any = manifest.icons.filter((icon) => (icon.purpose || 'any').split(' ').includes('any'));
  assert.ok(any.some((icon) => parseInt(icon.sizes, 10) >= 192), 'kein "any"-Icon ab 192px');
  assert.ok(manifest.icons.some((icon) => (icon.purpose || '').includes('maskable')), 'kein maskable-Icon');
  assert.ok(['fullscreen', 'standalone', 'minimal-ui'].includes(manifest.display));
  for (const field of ['id', 'name', 'short_name', 'background_color', 'theme_color']) {
    assert.ok(manifest[field], 'Manifest ohne ' + field);
  }
  for (const icon of manifest.icons) await access(resolve(root, icon.src));
});

test('the theme colour is the same everywhere', () => {
  const meta = html.match(/<meta name="theme-color" content="([^"]+)"/)[1];
  assert.equal(meta, manifest.theme_color);
  assert.equal(manifest.background_color, manifest.theme_color);
});

test('iOS needs its own tags because Safari only reads part of the manifest', () => {
  for (const tag of ['apple-mobile-web-app-capable', 'apple-mobile-web-app-title', 'apple-mobile-web-app-status-bar-style']) {
    assert.match(html, new RegExp('name="' + tag + '"'), 'fehlt: ' + tag);
  }
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /rel="manifest"/);
});

test('the precache covers every file the app loads, not merely existing ones', async () => {
  // Die gefaehrliche Richtung ist eine FEHLENDE Datei: der statische Import-Graph
  // bricht dann offline beim ersten fehlenden Modul ab, und cache.addAll laesst
  // bei einem einzigen 404 das ganze install-Event still scheitern.
  const listed = new Set([...sw.matchAll(/^\s*'([^']+)',?$/gm)].map((m) => m[1]));
  const css = await read('style.css');
  const required = new Set(['index.html', 'style.css', 'game.js', 'manifest.webmanifest']);
  for (const source of [html, css]) {
    for (const match of source.matchAll(/(?:src|href)=["']([^"'#?:]+)["']|url\(['"]?([^'")]+)['"]?\)/g)) {
      const reference = match[1] || match[2];
      if (reference && !/^(?:https?:|data:|#)/.test(reference)) required.add(reference);
    }
  }
  for (const module of ['audio', 'config', 'game', 'quality', 'renderer', 'storage', 'touch', 'track', 'viewport']) {
    required.add('src/' + module + '.js');
  }
  const config = await read('src/config.js');
  const renderer = await read('src/renderer.js');
  for (const source of [config, renderer]) {
    for (const match of source.matchAll(/['"](assets\/[^'"]+)['"]/g)) required.add(match[1]);
  }
  const missing = [...required].filter((file) => !listed.has(file));
  assert.deepEqual(missing, [], 'nicht im Precache: ' + missing.join(', '));
  for (const file of listed) {
    if (file === './') continue;
    await access(resolve(root, file));
  }
});

test('the worker keeps one cache generation intact instead of mixing releases', () => {
  // Ohne Hashes in den Dateinamen wuerde network-first je Request einzeln
  // entscheiden und Dateien aus zwei Veroeffentlichungen mischen.
  assert.match(sw, /const CACHE = '[^']+'/);
  assert.match(sw, /cache: 'reload'/, 'Precache ohne reload kann alte HTTP-Kopien einfrieren');
  assert.doesNotMatch(sw, /^\s*self\.skipWaiting\(\);/m, 'skipWaiting darf nur auf Nachricht laufen');
  assert.match(sw, /type === 'SKIP_WAITING'/);
});
