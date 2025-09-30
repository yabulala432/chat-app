module.exports = {
  apps: [
    {
      name: "backend",
      script: "./dist/main.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster", // Enable cluster mode
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // PM2 logging configuration
      log_file: "/app/logs/combined.log",
      out_file: "/app/logs/out.log",
      error_file: "/app/logs/error.log",
      time: true,
      // Application monitoring and restart policies
      max_memory_restart: "1G",
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      // Graceful shutdown configuration
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
