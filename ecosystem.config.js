module.exports = {
  apps: [
    {
      name: "skyview-api",
      cwd: "/var/www/skyview/api",
      script: "dist/src/main.js",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "skyview-web",
      cwd: "/var/www/skyview/web",
      script: "/var/www/skyview/web/node_modules/next/dist/bin/next",
      args: "start -p 3002",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
