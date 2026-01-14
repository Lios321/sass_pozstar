import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/lib/db/schema';

export const getDbFromEnv = (env: any) => {
  return drizzle(env.DB, { schema });
};
