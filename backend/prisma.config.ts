import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { withDatabaseSslParams } from './src/lib/pg-ssl';

export default defineConfig({
  schema: 'src/prisma',
  datasource: {
    url: withDatabaseSslParams(env('DATABASE_URL')),
  },
});