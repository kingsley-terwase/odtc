import type { Server } from 'node:http';
import { retryBookingReceipts } from './modules/guest/receipt.service.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './lib/database.js';

let server: Server | undefined;
let shuttingDown = false;
let receiptTimer: ReturnType<typeof setInterval> | undefined;
let receiptRun: Promise<void> | undefined;
function runReceipts() {
  if (receiptRun || shuttingDown) return;
  receiptRun = retryBookingReceipts().catch(() => { console.error('Receipt retry worker failed'); }).finally(() => { receiptRun = undefined; });
}

async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (receiptTimer) clearInterval(receiptTimer);
  console.info(`Received ${signal}; closing server and database connections`);
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  try {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => error ? reject(error) : resolve());
      });
    }
    if (receiptRun) await receiptRun;
    await disconnectDatabase();
    process.exitCode = exitCode;
  } catch {
    console.error('Server shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

try {
  await connectDatabase();
  if (shuttingDown) {
    if (receiptRun) await receiptRun;
    await disconnectDatabase();
  } else {
    console.info('PostgreSQL connection established');
    receiptTimer = setInterval(runReceipts, 30000);
    receiptTimer.unref();
    runReceipts();
    server = createApp().listen(env.PORT, env.HOST, () => {
      console.info(`ODTC API listening on http://${env.HOST}:${env.PORT}`);
    });
    server.on('error', () => {
      console.error('Server failed to listen. Check HOST and PORT.');
      void shutdown('startup failure', 1);
    });
  }
} catch {
  console.error('Database connection failed. Check DATABASE_URL and that PostgreSQL is running.');
  await shutdown('startup failure', 1);
}
