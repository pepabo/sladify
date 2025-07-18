import { app } from './app.js';
import { closePrisma } from './services/command-handler.js';

const start = async () => {
  await app.start();
  console.log('⚡️ Sladify bot is running');
};

start().catch(console.error);

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  await closePrisma();
  process.exit(0);
});