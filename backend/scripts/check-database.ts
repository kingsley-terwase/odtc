import { connectDatabase, disconnectDatabase } from '../src/lib/database.js';

try {
  await connectDatabase();
  console.info('PostgreSQL connection verified through Prisma.');
} catch {
  console.error('Database connection failed. Check DATABASE_URL and that PostgreSQL is running.');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
