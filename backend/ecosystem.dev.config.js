module.exports = {
  apps: [
    {
      name: 'backend-dev',
      script: './dist/main.js',
      instances: 2, // Limited instances for development
      exec_mode: 'cluster',
      watch: true, // Watch for file changes in development
      ignore_watch: ['node_modules', 'logs', '.git'],
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      max_memory_restart: '512M',
    },
  ],
};
