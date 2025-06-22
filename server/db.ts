import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use the specified database connection
const databaseUrl = "postgresql://neondb_owner:npg_xPhnQ4lbSjc1@ep-blue-king-a5xwepro.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
