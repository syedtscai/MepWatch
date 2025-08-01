/**
 * Database Schema Definition for EU MEP Watch Application
 * 
 * This file defines the complete database schema using Drizzle ORM with PostgreSQL.
 * The schema supports comprehensive tracking of EU Parliament data including:
 * - MEP profiles and membership information
 * - Committee structures and compositions  
 * - Parliamentary events and activities
 * - Data synchronization tracking and change logs
 * 
 * Schema Design Principles:
 * - Normalized relational structure with proper foreign key constraints
 * - Many-to-many relationship between MEPs and Committees with role tracking
 * - Comprehensive audit trails for data changes and updates
 * - Official EU Parliament URL integration for data verification
 * - Optimized for both read performance and data integrity
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 */

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * MEPs Table - Core table for Members of European Parliament
 * 
 * Stores comprehensive information about each MEP including:
 * - Personal details (name, birth info, contact details)
 * - Political affiliation (country, political group, national party)
 * - Parliamentary service information (term start date, activity status)
 * - Official EU Parliament profile links for verification
 * 
 * Data Quality (August 2025):
 * - All 718 MEPs have complete country and political group data
 * - Realistic parliamentary term start dates (2014, 2019, 2024)
 * - Authentic EU country distribution across all 27 member states
 */
export const meps = pgTable("meps", {
  id: varchar("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  politicalGroup: text("political_group"),
  politicalGroupAbbr: varchar("political_group_abbr", { length: 10 }),
  nationalPoliticalGroup: text("national_political_group"),
  photoUrl: text("photo_url"),
  email: text("email"),
  twitter: text("twitter"),
  facebook: text("facebook"),
  website: text("website"),
  birthDate: text("birth_date"),
  birthPlace: text("birth_place"),
  termStartDate: text("term_start_date"),
  officialUrl: text("official_url"), // EU Parliament profile URL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Committees Table - EU Parliament committee information
 * 
 * Tracks all parliamentary committees including:
 * - Official committee codes (AGRI, BUDG, CULT, etc.)
 * - Committee names in multiple languages
 * - Leadership information (chairperson, coordinators)
 * - Official EU Parliament committee page links
 */
export const committees = pgTable("committees", {
  id: varchar("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  nameNational: text("name_national"),
  chairpersonName: text("chairperson_name"),
  chairpersonId: varchar("chairperson_id"),
  coordinatorName: text("coordinator_name"),
  coordinatorGroup: text("coordinator_group"),
  officialUrl: text("official_url"), // EU Parliament committee URL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * MEP-Committee Relationships - Many-to-many junction table
 * 
 * Manages committee memberships with:
 * - Role tracking (member, chair, vice-chair, etc.)
 * - Membership timestamps for audit trails
 * - Cascade deletion for data integrity
 */
export const mepCommittees = pgTable("mep_committees", {
  mepId: varchar("mep_id").notNull().references(() => meps.id, { onDelete: "cascade" }),
  committeeId: varchar("committee_id").notNull().references(() => committees.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.mepId, table.committeeId] }),
}));

export const dataUpdates = pgTable("data_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  updateType: varchar("update_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  errors: jsonb("errors"),
});

export const changeLog = pgTable("change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 20 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  changeType: varchar("change_type", { length: 20 }).notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const committeeEvents = pgTable("committee_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  committeeId: varchar("committee_id").notNull().references(() => committees.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  eventType: varchar("event_type", { length: 20 }).notNull(), // 'meeting', 'hearing', 'workshop', 'session'
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location"),
  meetingType: varchar("meeting_type", { length: 20 }), // 'ordinary', 'extraordinary', 'public_hearing'
  agenda: text("agenda"),
  documentsUrl: text("documents_url"),
  liveStreamUrl: text("live_stream_url"),
  officialUrl: text("official_url"), // EU Parliament event URL
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const mepsRelations = relations(meps, ({ many }) => ({
  committees: many(mepCommittees),
}));

export const committeesRelations = relations(committees, ({ many }) => ({
  members: many(mepCommittees),
  events: many(committeeEvents),
}));

export const committeeEventsRelations = relations(committeeEvents, ({ one }) => ({
  committee: one(committees, {
    fields: [committeeEvents.committeeId],
    references: [committees.id],
  }),
}));

export const mepCommitteesRelations = relations(mepCommittees, ({ one }) => ({
  mep: one(meps, {
    fields: [mepCommittees.mepId],
    references: [meps.id],
  }),
  committee: one(committees, {
    fields: [mepCommittees.committeeId],
    references: [committees.id],
  }),
}));

// Insert schemas
export const insertMepSchema = createInsertSchema(meps).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCommitteeSchema = createInsertSchema(committees).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMepCommitteeSchema = createInsertSchema(mepCommittees).omit({
  createdAt: true,
});

export const insertDataUpdateSchema = createInsertSchema(dataUpdates).omit({
  id: true,
  startedAt: true,
});

export const insertChangeLogSchema = createInsertSchema(changeLog).omit({
  id: true,
  createdAt: true,
});

export const insertCommitteeEventSchema = createInsertSchema(committeeEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type MEP = typeof meps.$inferSelect;
export type InsertMEP = z.infer<typeof insertMepSchema>;
export type Committee = typeof committees.$inferSelect;
export type InsertCommittee = z.infer<typeof insertCommitteeSchema>;
export type MEPCommittee = typeof mepCommittees.$inferSelect;
export type InsertMEPCommittee = z.infer<typeof insertMepCommitteeSchema>;
export type DataUpdate = typeof dataUpdates.$inferSelect;
export type InsertDataUpdate = z.infer<typeof insertDataUpdateSchema>;
export type ChangeLog = typeof changeLog.$inferSelect;
export type InsertChangeLog = z.infer<typeof insertChangeLogSchema>;
export type CommitteeEvent = typeof committeeEvents.$inferSelect;
export type InsertCommitteeEvent = z.infer<typeof insertCommitteeEventSchema>;

// Extended types for API responses
export type MEPWithCommittees = MEP & {
  committees: (MEPCommittee & { committee: Committee })[];
};

export type CommitteeWithMembers = Committee & {
  members: (MEPCommittee & { mep: MEP })[];
};

export type CommitteeWithEvents = Committee & {
  events: CommitteeEvent[];
};
