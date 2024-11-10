module.exports = {
  apps : [{
    name   : "fxthreads",
    script : "./src/server.js",
    env_production: {
      NODE_ENV: "production",
      PORT:3000,
      BASE_URL: '<your-base-url>'
    },
    env_development: {
      NODE_ENV: "development",
      PORT:3000,
      BASE_URL: '<your-base-url>'
    }
  }]
}
