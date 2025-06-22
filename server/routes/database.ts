import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export function registerDatabaseRoutes(app: Express) {
  // Database information endpoint
  app.get("/api/database/tables", async (req, res) => {
    try {
      const tablesResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = tablesResult.rows || [];
      const tableInfo = {};
      
      for (const table of tables) {
        const tableName = (table as any).table_name;
        const columnsResult = await db.execute(sql.raw(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `));
        
        (tableInfo as any)[tableName] = {
          columns: columnsResult.rows || []
        };
      }
      
      res.json({
        tables: tableInfo,
        totalTables: tables.length
      });
    } catch (error) {
      console.error('Error fetching database info:', error);
      res.status(500).json({ 
        error: 'Failed to fetch database information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Database query execution endpoint
  app.post("/api/database/execute", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }
      
      // Basic safety check - prevent destructive operations in production
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
      const upperQuery = query.trim().toUpperCase();
      
      if (dangerousKeywords.some(keyword => upperQuery.startsWith(keyword))) {
        return res.status(403).json({ 
          error: "Destructive operations are not allowed through this endpoint" 
        });
      }
      
      const result = await db.execute(sql.raw(query));
      
      res.json({
        success: true,
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      });
    } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ 
        error: 'Failed to execute query',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}