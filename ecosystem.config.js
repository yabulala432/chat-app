module.exports = {
  apps: [
    {
      name: "chat-backend",
      script: "./dist/main.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
      },
    },
  ],
};
