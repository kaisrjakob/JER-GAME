import { UnfairJeremias } from './src/game.js';

const message = (text) => {
  const target = document.querySelector('#loading-screen p');
  if (target) target.textContent = text;
};

const report = (error) => {
  console.error(error);
  message('START FEHLGESCHLAGEN — ' + (error?.message || error));
};

addEventListener('error', (event) => report(event.error || event.message));
addEventListener('unhandledrejection', (event) => report(event.reason));

try {
  const game = new UnfairJeremias(document.querySelector('#game-canvas'));
  game.boot().catch(report);
} catch (error) {
  report(error);
}
