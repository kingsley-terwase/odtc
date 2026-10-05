import { connectDatabase, disconnectDatabase } from '../dist/lib/database.js';
try {
  await connectDatabase();
  console.info('Compiled Prisma client connection verified.');
} catch {
  console.error('Compiled database client connection failed.');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
