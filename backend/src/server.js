require('dotenv').config();

const app = require('./app');
const { prewarmEmbedding } = require('./services/embedding');

const rawPort = Number(process.env.PORT || 3001);
const port = Number.isInteger(rawPort) && rawPort >= 0 && rawPort <= 65535
  ? rawPort
  : 3001;

const server = app.listen(port, () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : port;
  console.log(`[Gyan Sutra API] Running on port ${activePort} (${process.env.NODE_ENV || 'development'})`);

  // Load the local model after the HTTP server is ready, so health checks stay
  // responsive while the first real question avoids a cold embedding load.
  if (!/^(0|false|no|off)$/i.test(process.env.EMBEDDING_PREWARM || 'true')) {
    setImmediate(() => {
      prewarmEmbedding().catch((error) => {
        console.warn(`[Embedding] Background prewarm failed: ${error.message}`);
      });
    });
  }
});

server.on('error', (error) => {
  console.error('[Gyan Sutra API] Failed to start:', error.message);
  process.exitCode = 1;
});

function shutdown(signal) {
  console.log(`[Gyan Sutra API] ${signal} received. Closing connections...`);
  server.close((error) => {
    if (error) {
      console.error('[Gyan Sutra API] Shutdown failed:', error.message);
      process.exitCode = 1;
    }
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
