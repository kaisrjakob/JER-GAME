import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_END, VIEW_HEIGHT, VIEW_WIDTH_MAX, VIEW_WIDTH_MIN } from '../src/config.js';
import { cameraTarget, updateViewport } from '../src/viewport.js';

test('the view never gets narrower than the authored 1600 units', () => {
  assert.equal(updateViewport(1024, 768).width, VIEW_WIDTH_MIN);
  assert.equal(updateViewport(1600, 900).width, VIEW_WIDTH_MIN);
  assert.equal(updateViewport(600, 900).width, VIEW_WIDTH_MIN);
});

test('landscape phones fill the screen and ultrawide hits the cap', () => {
  assert.equal(updateViewport(852, 393).width, 1950);
  assert.equal(updateViewport(844, 390).width, 1950);
  assert.equal(updateViewport(3440, 1440).width, VIEW_WIDTH_MAX);
});

test('the fitted world always stays inside the canvas', () => {
  for (const [width, height] of [[1024, 768], [852, 393], [1920, 1080], [3440, 1440], [390, 844]]) {
    const view = updateViewport(width, height);
    assert.ok(view.width * view.scale <= width + 1e-9);
    assert.ok(VIEW_HEIGHT * view.scale <= height + 1e-9);
    assert.ok(view.offsetX >= 0 && view.offsetY >= 0);
  }
});

test('at the design width the camera matches the original hand-tuned formula', () => {
  for (let x = -200; x <= 13000; x += 0.5) {
    assert.equal(cameraTarget(x, VIEW_WIDTH_MIN), Math.max(0, Math.min(LEVEL_END - 1100, x - 420)));
  }
});

test('a wider view keeps the player at the same screen position', () => {
  for (const width of [1600, 1950, VIEW_WIDTH_MAX]) {
    assert.equal(cameraTarget(6000, width), 6000 - width * 0.2625);
  }
  assert.equal(cameraTarget(LEVEL_END, 1950), LEVEL_END - 1950 + 500);
});
