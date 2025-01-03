#!/usr/bin/env node

/**
 * Module dependencies.
 */
require('dotenv').config();
import app from '../app';
const debug = require('debug')('capital:server');
import http from 'http';

/**
 * Get port from environment and store in Express.
 */


const port = normalizePort(process.env.PORT || '8000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Handle graceful shutdown
let shuttingDown = false;

const gracefulShutdown = () => {
  if (shuttingDown) {
    console.log('Already shutting down. Ignoring signal.');
    return;
  }

  shuttingDown = true;
  console.log();
  console.log('Received kill signal, shutting down gracefully.');
  console.log();

  // Close server and perform cleanup
  server.close(() => {
    console.log('Closed out remaining connections.');
    process.exit(0);
  });

  // Force server-closure
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 15000);
};

// Handle SIGTERM and SIGINT signals for graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // Named pipe
    return val;
  }

  if (port >= 0) {
    // Port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = addr !== null && typeof addr === 'string'
    ? 'pipe ' + addr
    : addr !== null
    ? 'port ' + addr.port
    : 'unknown';

  debug('Listening on ' + bind);
}