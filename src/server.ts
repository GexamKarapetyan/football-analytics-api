import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { redisClient } from './infrastructure/redis.client.js';

async function bootstrap() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    app.listen(env.PORT, () => {
      logger.info(`Server is running at http://localhost:${env.PORT}`);
    });

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await redisClient.disconnect();
  process.exit(0);
});

bootstrap();
