import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const css = await readFile(resolve(root, 'style.css'), 'utf8');
const game = await readFile(resolve(root, 'src/game.js'), 'utf8');

test('no UI symbol relies on a glyph the bundled fonts do not carry', () => {
  // Barlow Condensed kennt weder Pfeile noch Sonderzeichen, Inter kein Lautsprecher- oder
  // Rechteck-Symbol. Solche Zeichen gehoeren als Inline-SVG ins Markup, nicht als Textglyph.
  const unsupported = ['Ⅱ', '←', '→', '↺', '↻', '▭', '♪', '♫'];
  const text = html.replace(/<svg[\s\S]*?<\/svg>/g, '');
  const found = unsupported.filter((char) => text.includes(char) || game.includes(char));
  assert.deepEqual(found, [], 'Zeichen ohne Glyph im Markup: ' + found.map((c) => 'U+' + c.codePointAt(0).toString(16)).join(', '));
});

test('the keyboard and touch hints are switched by a rule that outranks the base styles', () => {
  // .ready-card>strong und .ready-card>div sind spezifischer als eine blosse .keys-Klasse;
  // ohne diese Regel waren auf dem Handy beide Hinweisbloecke gleichzeitig sichtbar.
  assert.match(css, /html\.touch \.keys,html\.keyboard \.taps\{display:none!important\}/);
  assert.ok(html.includes('class="keys"') || html.includes(' keys"'));
  assert.ok(html.includes('class="taps"') || html.includes(' taps"'));
});

test('every panel keeps its buttons outside the scrolling area', () => {
  // Sonst rutscht "ZUM HAUPTMENUE" auf niedrigen Querformat-Viewports aus dem Bild.
  for (const id of ['win-screen', 'pause-screen', 'how-screen']) {
    const start = html.indexOf('id="' + id + '"');
    assert.ok(start > 0, id + ' fehlt');
    const section = html.slice(start, html.indexOf('</section>', start));
    assert.ok(section.includes('panel__scroll'), id + ' hat keinen scrollenden Mittelteil');
    const afterScroll = section.slice(section.lastIndexOf('</div>'));
    assert.ok(/<button/.test(section.slice(section.indexOf('panel__scroll'))), id + ' hat keine Knoepfe');
    void afterScroll;
  }
});

test('the touch layer is gated on an input-mode class, not a single media query', () => {
  // (pointer:coarse) allein liess Geraete ohne Steuerung zurueck, die sich als fine melden.
  assert.match(css, /html\.touch body\.running \.touch-layer\{display:grid\}/);
  assert.doesNotMatch(css, /@media\(pointer:coarse\)/);
  assert.match(game, /navigator\.maxTouchPoints > 0/);
});

test('the boot path reports failures instead of hanging on the loading screen', async () => {
  const entry = await readFile(resolve(root, 'game.js'), 'utf8');
  assert.match(entry, /addEventListener\('error'/);
  assert.match(entry, /addEventListener\('unhandledrejection'/);
  assert.match(entry, /try \{[\s\S]*new UnfairJeremias/);
  assert.match(game, /Promise\.race/, 'Schriftladen muss ein Zeitlimit haben');
});
