import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { 
  opportunities,
  type Opportunity, 
  type InsertOpportunity
} from '../shared/schema';

export interface IOpportunitiesStorage {
  // Opportunities
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  getOpportunityByName(name: string): Promise<Opportunity | undefined>;
  getOpportunityById(opportunityId: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  getAllOpportunities(): Promise<Opportunity[]>;
  
  // Enhanced methods for base ID matching and smart upgrading
  getOpportunityByBaseId(opportunityId: string): Promise<Opportunity | undefined>;
  findOrCreateOpportunityWithSmartUpgrade(opportunity: InsertOpportunity): Promise<Opportunity>;
}

export class PostgreSQLOpportunitiesStorage implements IOpportunitiesStorage {
  // Opportunity methods
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    return result[0];
  }

  async getOpportunityByName(name: string): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.name, name)).limit(1);
    return result[0];
  }

  async getOpportunityById(opportunityId: string): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.opportunityId, opportunityId)).limit(1);
    return result[0];
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const result = await db.insert(opportunities).values(opportunity).returning();
    return result[0];
  }

  async getAllOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities);
  }

  // Enhanced method for base ID matching (first 15 characters)
  async getOpportunityByBaseId(opportunityId: string): Promise<Opportunity | undefined> {
    const baseId = opportunityId.substring(0, 15);
    const result = await db.select()
      .from(opportunities)
      .where(sql`LEFT(${opportunities.opportunityId}, 15) = ${baseId}`)
      .limit(1);
    return result[0];
  }

  // Smart opportunity creation with ID upgrading logic
  async findOrCreateOpportunityWithSmartUpgrade(opportunity: InsertOpportunity): Promise<Opportunity> {
    const incomingId = opportunity.opportunityId;
    const baseId = incomingId.substring(0, 15);
    
    console.log(`🔍 Looking for opportunity with base ID: ${baseId} (from ${incomingId})`);
    
    // Try to find existing opportunity by base ID (first 15 characters)
    const existing = await this.getOpportunityByBaseId(baseId);
    
    if (existing) {
      console.log(`📋 Found existing opportunity: ${existing.opportunityId} -> ${existing.name}`);
      
      // Check if we should upgrade the ID (incoming is 18-digit, existing is 15-digit)
      if (incomingId.length === 18 && existing.opportunityId.length === 15) {
        console.log(`⬆️ Upgrading opportunity ID: ${existing.opportunityId} -> ${incomingId}`);
        
        // Update the opportunity ID to the 18-digit version
        const updated = await db.update(opportunities)
          .set({ opportunityId: incomingId })
          .where(eq(opportunities.id, existing.id))
          .returning();
          
        return updated[0];
      }
      
      return existing;
    }
    
    // No existing opportunity found, create new one
    console.log(`📝 Creating new opportunity: ${incomingId} - ${opportunity.name}`);
    return await this.createOpportunity(opportunity);
  }
}

export const opportunitiesStorage = new PostgreSQLOpportunitiesStorage();