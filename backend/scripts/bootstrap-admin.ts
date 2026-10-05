import { z } from 'zod';
import { bootstrapFirstAdmin } from '../src/modules/admin/bootstrap.service.js';
import { disconnectDatabase } from '../src/lib/database.js';
import { ApiError } from '../src/lib/api-error.js';

const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(process.argv[2]);
try {
  if (!email.success || process.argv.length !== 3) throw new ApiError(400, 'INVALID_ARGUMENT', 'Usage: npm run admin:bootstrap -- account@example.com');
  const result = await bootstrapFirstAdmin(email.data);
  console.info(result.promoted ? 'First admin account promoted successfully.' : 'This account is already the first admin.');
} catch (error) {
  console.error(error instanceof ApiError ? error.message : 'Admin bootstrap failed; check database availability.');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
