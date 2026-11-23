const http = require('http');
const app = require('./app');
const env = require('./config/env');

const server = http.createServer(app);

server.listen(env.port, () => {
  console.log(`API Veterinaria El Ganadero escuchando en puerto ${env.port}`);
});

module.exports = server;
