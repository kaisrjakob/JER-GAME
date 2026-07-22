import { UnfairJeremias } from './src/game.js';

const game = new UnfairJeremias(document.querySelector('#game-canvas'));
game.boot().catch((error) => {
  console.error(error);
  document.querySelector('#loading-screen p').textContent = 'SYSTEM KONNTE NICHT GELADEN WERDEN';
});
