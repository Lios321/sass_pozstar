import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const getDb = () => {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    if (!env || !env.DB) {
      throw new Error('DB binding not found in request context');
    }
    return drizzle(env.DB, { schema });
  } catch (e) {
    console.error("Failed to get DB from request context:", e);
    throw new Error('Database connection failed. Ensure you are running in a Cloudflare Workers environment or using wrangler dev.');
  }
};
