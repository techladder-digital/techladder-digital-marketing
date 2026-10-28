import { closePool, pingDatabase } from './config/database';
import { env } from './config/env';
import { createApp } from './app';
import { notificationService } from './services/notification.service';
import { socialSyncService } from './services/social-sync.service';
import { logger } from './utils/logger';

async function main() {
  const dbOk = await pingDatabase();
  if (!dbOk) {
    logger.error('Cannot connect to MySQL. Check DB_* settings and that migrations have been run.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info('TechLadder API listening', {
      port: env.PORT,
      env: env.NODE_ENV,
      email: env.emailEnabled ? 'configured' : 'not configured',
      whatsapp: env.whatsappEnabled ? 'configured' : 'not configured',
    });
  });

  const timers: NodeJS.Timeout[] = [];
  let busy = false;
  if (env.NOTIFICATION_RETRY_INTERVAL_SECONDS > 0) {
    timers.push(
      setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          const n = await notificationService.processDue();
          if (n > 0) logger.info('Notification retries processed', { count: n });
        } catch (err) {
          logger.error('Notification retry worker error', { error: err instanceof Error ? err.message : String(err) });
        } finally {
          busy = false;
        }
      }, env.NOTIFICATION_RETRY_INTERVAL_SECONDS * 1000),
    );
  }
  if (env.SOCIAL_SYNC_INTERVAL_MINUTES > 0) {
    timers.push(
      setInterval(() => {
        socialSyncService.syncAll().catch((err) => logger.error('Social sync error', { error: String(err) }));
      }, env.SOCIAL_SYNC_INTERVAL_MINUTES * 60_000),
    );
  }

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down', { signal });
    timers.forEach(clearInterval);
    server.close(async () => {
      await closePool().catch(() => undefined);
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
