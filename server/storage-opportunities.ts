import { db } from './db';
import { eq } from 'drizzle-orm';
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
    // Truncate opportunity ID to 15 characters if longer
    if (opportunity.opportunityId && opportunity.opportunityId.length > 15) {
      console.log(`⚠️ Truncating opportunity ID during creation from ${opportunity.opportunityId.length} to 15 characters: "${opportunity.opportunityId}" -> "${opportunity.opportunityId.substring(0, 15)}"`);
      opportunity.opportunityId = opportunity.opportunityId.substring(0, 15);
    }
    
    const result = await db.insert(opportunities).values(opportunity).returning();
    return result[0];
  }

  async getAllOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities);
  }
}

export const opportunitiesStorage = new PostgreSQLOpportunitiesStorage();