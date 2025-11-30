/**
 * PM2 Ecosystem Configuration
 * Manages both API and Worker processes
 *
 * .env is loaded automatically by NestJS ConfigModule from the cwd directory.
 *
 * Commands:
 *   npm run pm2:dev                      # Build + start (development)
 *   npm run pm2:prod                     # Build + start (production)
 *   npm run pm2:logs                     # View all logs
 *   npm run pm2:status                   # View process status
 *   npm run pm2:restart                  # Restart all
 *   npm run pm2:stop                     # Stop all
 *   npm run pm2:delete                   # Remove from PM2
 *
 * Direct PM2:
 *   pm2 start ecosystem.config.js
 *   pm2 logs minifi-api
 *   pm2 logs minifi-worker
 *   pm2 monit                            # Real-time monitoring
 */
module.exports = {
  apps: [
    {
      name: 'minifi-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Logging
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'minifi-worker',
      script: 'dist/main.worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Logging
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
