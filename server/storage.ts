import { 
  meps, 
  committees, 
  mepCommittees, 
  dataUpdates, 
  changeLog,
  committeeEvents,
  type MEP, 
  type InsertMEP,
  type Committee, 
  type InsertCommittee,
  type MEPCommittee,
  type InsertMEPCommittee,
  type DataUpdate,
  type InsertDataUpdate,
  type ChangeLog,
  type InsertChangeLog,
  type CommitteeEvent,
  type InsertCommitteeEvent,
  type MEPWithCommittees,
  type CommitteeWithMembers
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, or, sql, count, ilike, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // MEPs
  getMEPs(filters?: {
    search?: string;
    country?: string;
    politicalGroup?: string;
    committee?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ meps: MEPWithCommittees[]; total: number }>;
  getMEP(id: string): Promise<MEPWithCommittees | undefined>;
  createMEP(mep: InsertMEP): Promise<MEP>;
  updateMEP(id: string, mep: Partial<InsertMEP>): Promise<MEP>;
  deleteMEP(id: string): Promise<void>;
  
  // Committees
  getCommittees(limit?: number, offset?: number): Promise<{ committees: CommitteeWithMembers[]; total: number }>;
  getCommittee(id: string): Promise<CommitteeWithMembers | undefined>;
  getCommitteeByCode(code: string): Promise<Committee | undefined>;
  createCommittee(committee: InsertCommittee): Promise<Committee>;
  updateCommittee(id: string, committee: Partial<InsertCommittee>): Promise<Committee>;
  deleteCommittee(id: string): Promise<void>;
  
  // Committee Events
  getCommitteeEvents(committeeId: string, months?: number): Promise<CommitteeEvent[]>;
  createCommitteeEvent(event: InsertCommitteeEvent): Promise<CommitteeEvent>;
  
  // MEP-Committee relationships
  addMEPToCommittee(mepCommittee: InsertMEPCommittee): Promise<MEPCommittee>;
  createMEPCommittee(mepCommittee: InsertMEPCommittee): Promise<MEPCommittee>;
  removeMEPFromCommittee(mepId: string, committeeId: string): Promise<void>;
  
  // Bulk fetch methods
  getAllMEPs(): Promise<MEP[]>;
  getAllCommittees(): Promise<Committee[]>;
  
  // Data updates
  createDataUpdate(update: InsertDataUpdate): Promise<DataUpdate>;
  updateDataUpdate(id: string, update: Partial<InsertDataUpdate>): Promise<DataUpdate>;
  getLatestDataUpdate(): Promise<DataUpdate | undefined>;
  
  // Change log
  createChangeLog(changeLog: InsertChangeLog): Promise<ChangeLog>;
  getRecentChanges(limit?: number): Promise<ChangeLog[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalMEPs: number;
    totalCommittees: number;
    totalCountries: number;
    lastUpdate: Date | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getMEPs(filters?: {
    search?: string;
    country?: string;
    politicalGroup?: string;
    committee?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    let whereConditions = [eq(meps.isActive, true)];
    
    if (filters?.search) {
      whereConditions.push(
        or(
          ilike(meps.fullName, `%${filters.search}%`),
          ilike(meps.firstName, `%${filters.search}%`),
          ilike(meps.lastName, `%${filters.search}%`)
        )!
      );
    }
    
    if (filters?.country) {
      whereConditions.push(eq(meps.country, filters.country));
    }
    
    if (filters?.politicalGroup) {
      whereConditions.push(eq(meps.politicalGroupAbbr, filters.politicalGroup));
    }
    
    let query = db
      .select()
      .from(meps)
      .leftJoin(mepCommittees, eq(meps.id, mepCommittees.mepId))
      .leftJoin(committees, eq(mepCommittees.committeeId, committees.id))
      .where(and(...whereConditions))
      .orderBy(meps.lastName, meps.firstName)
      .limit(limit)
      .offset(offset);
    
    const results = await query;
    
    // Group by MEP to include all committees
    const mepMap = new Map<string, MEPWithCommittees>();
    
    for (const row of results) {
      if (!mepMap.has(row.meps.id)) {
        mepMap.set(row.meps.id, {
          ...row.meps,
          committees: []
        });
      }
      
      if (row.mep_committees && row.committees) {
        mepMap.get(row.meps.id)!.committees.push({
          ...row.mep_committees,
          committee: row.committees
        });
      }
    }
    
    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(meps)
      .where(and(...whereConditions));
    
    return {
      meps: Array.from(mepMap.values()),
      total
    };
  }
  
  async getMEP(id: string) {
    const results = await db
      .select()
      .from(meps)
      .leftJoin(mepCommittees, eq(meps.id, mepCommittees.mepId))
      .leftJoin(committees, eq(mepCommittees.committeeId, committees.id))
      .where(eq(meps.id, id));
    
    if (results.length === 0) return undefined;
    
    const mep: MEPWithCommittees = {
      ...results[0].meps,
      committees: []
    };
    
    for (const row of results) {
      if (row.mep_committees && row.committees) {
        mep.committees.push({
          ...row.mep_committees,
          committee: row.committees
        });
      }
    }
    
    return mep;
  }
  
  async createMEP(mep: InsertMEP) {
    const [created] = await db.insert(meps).values(mep).returning();
    return created;
  }
  
  async updateMEP(id: string, mep: Partial<InsertMEP>) {
    const [updated] = await db
      .update(meps)
      .set({ ...mep, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(meps.id, id))
      .returning();
    return updated;
  }
  
  async deleteMEP(id: string) {
    await db.delete(meps).where(eq(meps.id, id));
  }
  
  async getCommittees(limit = 50, offset = 0) {
    // First get the committees with pagination
    const committeesQuery = await db
      .select()
      .from(committees)
      .where(eq(committees.isActive, true))
      .orderBy(committees.name)
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(committees)
      .where(eq(committees.isActive, true));
    
    // If no committees found, return empty result
    if (committeesQuery.length === 0) {
      return {
        committees: [],
        total
      };
    }
    
    // Get the committee IDs for the current page
    const committeeIds = committeesQuery.map(c => c.id);
    
    // Now get all MEP-committee relationships for these committees
    const memberResults = await db
      .select()
      .from(committees)
      .leftJoin(mepCommittees, eq(committees.id, mepCommittees.committeeId))
      .leftJoin(meps, eq(mepCommittees.mepId, meps.id))
      .where(and(
        eq(committees.isActive, true),
        inArray(committees.id, committeeIds)
      ));
    
    const committeeMap = new Map<string, CommitteeWithMembers>();
    
    // Initialize committees
    for (const committee of committeesQuery) {
      committeeMap.set(committee.id, {
        ...committee,
        members: []
      });
    }
    
    // Add members to committees
    for (const row of memberResults) {
      if (row.mep_committees && row.meps && committeeMap.has(row.committees.id)) {
        committeeMap.get(row.committees.id)!.members.push({
          ...row.mep_committees,
          mep: row.meps
        });
      }
    }
    
    return {
      committees: Array.from(committeeMap.values()),
      total
    };
  }
  
  async getCommittee(id: string) {
    const results = await db
      .select()
      .from(committees)
      .leftJoin(mepCommittees, eq(committees.id, mepCommittees.committeeId))
      .leftJoin(meps, eq(mepCommittees.mepId, meps.id))
      .where(eq(committees.id, id));
    
    if (results.length === 0) return undefined;
    
    const committee: CommitteeWithMembers = {
      ...results[0].committees,
      members: []
    };
    
    for (const row of results) {
      if (row.mep_committees && row.meps) {
        committee.members.push({
          ...row.mep_committees,
          mep: row.meps
        });
      }
    }
    
    return committee;
  }
  
  async getCommitteeByCode(code: string) {
    const [committee] = await db
      .select()
      .from(committees)
      .where(eq(committees.code, code));
    return committee || undefined;
  }
  
  async createCommittee(committee: InsertCommittee) {
    const [created] = await db.insert(committees).values(committee).returning();
    return created;
  }
  
  async updateCommittee(id: string, committee: Partial<InsertCommittee>) {
    const [updated] = await db
      .update(committees)
      .set({ ...committee, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(committees.id, id))
      .returning();
    return updated;
  }
  
  async deleteCommittee(id: string) {
    await db.delete(committees).where(eq(committees.id, id));
  }

  async getCommitteeEvents(committeeId: string, months = 3) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);
    
    return await db
      .select()
      .from(committeeEvents)
      .where(
        and(
          eq(committeeEvents.committeeId, committeeId),
          gte(committeeEvents.startDate, new Date()),
          lte(committeeEvents.startDate, futureDate)
        )
      )
      .orderBy(committeeEvents.startDate);
  }

  async createCommitteeEvent(event: InsertCommitteeEvent) {
    const [created] = await db.insert(committeeEvents).values(event).returning();
    return created;
  }
  
  async addMEPToCommittee(mepCommittee: InsertMEPCommittee) {
    const [created] = await db.insert(mepCommittees).values(mepCommittee).returning();
    return created;
  }
  
  async removeMEPFromCommittee(mepId: string, committeeId: string) {
    await db.delete(mepCommittees).where(
      and(
        eq(mepCommittees.mepId, mepId),
        eq(mepCommittees.committeeId, committeeId)
      )
    );
  }
  
  async createDataUpdate(update: InsertDataUpdate) {
    const [created] = await db.insert(dataUpdates).values(update).returning();
    return created;
  }
  
  async updateDataUpdate(id: string, update: Partial<InsertDataUpdate>) {
    const [updated] = await db
      .update(dataUpdates)
      .set(update)
      .where(eq(dataUpdates.id, id))
      .returning();
    return updated;
  }
  
  async getLatestDataUpdate() {
    const [latest] = await db
      .select()
      .from(dataUpdates)
      .orderBy(desc(dataUpdates.startedAt))
      .limit(1);
    return latest || undefined;
  }
  
  async createChangeLog(changeLogEntry: InsertChangeLog) {
    const [created] = await db.insert(changeLog).values(changeLogEntry).returning();
    return created;
  }
  
  async getRecentChanges(limit = 10) {
    return await db
      .select()
      .from(changeLog)
      .orderBy(desc(changeLog.createdAt))
      .limit(limit);
  }
  
  async getDashboardStats() {
    const [mepCount] = await db
      .select({ count: count() })
      .from(meps)
      .where(eq(meps.isActive, true));
    
    const [committeeCount] = await db
      .select({ count: count() })
      .from(committees)
      .where(eq(committees.isActive, true));
    
    const [countryCount] = await db
      .select({ count: count(sql`DISTINCT ${meps.country}`) })
      .from(meps)
      .where(eq(meps.isActive, true));
    
    const latestUpdate = await this.getLatestDataUpdate();
    
    return {
      totalMEPs: mepCount.count,
      totalCommittees: committeeCount.count,
      totalCountries: countryCount.count,
      lastUpdate: latestUpdate?.completedAt || null
    };
  }

  async getAllMEPs(): Promise<MEP[]> {
    return await db
      .select()
      .from(meps)
      .where(eq(meps.isActive, true));
  }

  async getAllCommittees(): Promise<Committee[]> {
    return await db
      .select()
      .from(committees)
      .where(eq(committees.isActive, true));
  }

  async createMEPCommittee(mepCommittee: InsertMEPCommittee): Promise<MEPCommittee> {
    const [newMEPCommittee] = await db
      .insert(mepCommittees)
      .values(mepCommittee)
      .returning();
    return newMEPCommittee;
  }
}

export const storage = new DatabaseStorage();
