import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const committees = pgTable("committees", {
  id: varchar("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  nameNational: text("name_national"),
  coordinatorName: text("coordinator_name"),
  coordinatorGroup: text("coordinator_group"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

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

// Relations
export const mepsRelations = relations(meps, ({ many }) => ({
  committees: many(mepCommittees),
}));

export const committeesRelations = relations(committees, ({ many }) => ({
  members: many(mepCommittees),
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

// Extended types for API responses
export type MEPWithCommittees = MEP & {
  committees: (MEPCommittee & { committee: Committee })[];
};

export type CommitteeWithMembers = Committee & {
  members: (MEPCommittee & { mep: MEP })[];
};
