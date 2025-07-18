import { app } from './app.js';
import { appConfig } from './config.js';

(async () => {
  try {
    await app.start();
    console.log(`⚡️ Sladify bot is running in ${appConfig.env} mode`);
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();