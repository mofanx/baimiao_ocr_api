module.exports = {
  apps: [
    {
      name: 'baimiao-ocr',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/node-error.log',
      out_file: 'logs/node-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env'
    }
  ]
};
