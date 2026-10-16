module.exports = {
  apps: [
    {
      name: 'nina-weaves',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '500M',
      time: true
    }
  ]
};
