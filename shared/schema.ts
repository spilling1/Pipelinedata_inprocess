import { pgTable, text, serial, integer, real, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).default("Ops").notNull(), // Default role for new users
  isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = inactive
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roles and permissions system
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(), // JSON array of permission strings
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permission categories for organization
export const permissionCategories = pgTable("permission_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().unique(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  owner: text("owner"),
  createdDate: timestamp("created_date"),
});

export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  
  // Core opportunity fields
  stage: text("stage"),
  confidence: text("confidence"),
  opportunityName: text("opportunity_name"),
  opportunityType: text("opportunity_type"),
  accountName: text("account_name"),
  amount: real("amount"),
  
  // Date fields
  expectedCloseDate: timestamp("expected_close_date"),
  closeDate: timestamp("close_date"),
  billingStartDate: timestamp("billing_start_date"),
  
  // Solutions and products
  solutionsOffered: text("solutions_offered"),
  icp: text("icp"), // Ideal Customer Profile
  
  // Contact information
  numberOfContacts: integer("number_of_contacts"),
  blendedwAverageTitle: text("blended_average_title"),
  
  // Revenue breakdown
  tcv: real("tcv"), // Total Contract Value
  year1Value: real("year1_value"),
  year2Value: real("year2_value"),
  year3Value: real("year3_value"),
  barrValue: real("barr_value"),
  
  // System fields
  erpSystemInUse: text("erp_system_in_use"),
  age: integer("age"),
  stageDuration: integer("stage_duration"),
  
  // Stage movement tracking
  stageBefore: text("stage_before"),
  lossReason: text("loss_reason"),
  
  // Audit fields
  createdDate: timestamp("created_date"),
  lastModified: timestamp("last_modified"),
  enteredPipeline: timestamp("entered_pipeline"),
  homesBuilt: integer("homes_built"),
  
  // Target account flag (binary: 1 = Yes, 0 = No)
  targetAccount: integer("target_account"),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  snapshotDate: timestamp("snapshot_date"),
  recordCount: integer("record_count").default(0),
  status: varchar("status", { length: 50 }).default("processed"),
});

// Marketing Analytics Tables
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // e.g., "Event", "Webinar", "Email"
  startDate: timestamp("start_date").notNull(),
  influence: text("influence"), // Description of influence method
  cost: real("cost"), // Optional; used for CAC calculation
  notes: text("notes"), // Optional additional information
  salesforceUrl: text("salesforce_url"), // Link to Salesforce campaign page
  status: text("status").default("active").notNull(), // active, paused, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaignCustomers = pgTable("campaign_customers", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  // Snapshot data captured at time of association
  stage: text("stage"),
  year1Arr: real("year1_arr"),
  tcv: real("tcv"),
  closeDate: timestamp("close_date"),
  attendees: integer("attendees"), // Optional field for number of attendees
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings tables for dropdowns
export const campaignTypes = pgTable("campaign_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const influenceMethods = pgTable("influence_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadDate: true,
});

export const insertUserSchema = createInsertSchema(users);

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignCustomerSchema = createInsertSchema(campaignCustomers).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignTypeSchema = createInsertSchema(campaignTypes).omit({
  id: true,
  createdAt: true,
});

export const insertInfluenceMethodSchema = createInsertSchema(influenceMethods).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionCategorySchema = createInsertSchema(permissionCategories).omit({
  id: true,
});

// Update user schema to include role validation
export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["Admin", "Leadership", "Marketing", "Ops", "Finance", "Sales", "Post-Sales", "Engineering"]),
});

export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertCampaignCustomer = z.infer<typeof insertCampaignCustomerSchema>;
export type InsertCampaignType = z.infer<typeof insertCampaignTypeSchema>;
export type InsertInfluenceMethod = z.infer<typeof insertInfluenceMethodSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermissionCategory = z.infer<typeof insertPermissionCategorySchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type CampaignType = typeof campaignTypes.$inferSelect;
export type InfluenceMethod = typeof influenceMethods.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type PermissionCategory = typeof permissionCategories.$inferSelect;

export type Opportunity = typeof opportunities.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignCustomer = typeof campaignCustomers.$inferSelect;
export type User = typeof users.$inferSelect;
