import { euParliamentAPI } from './euParliamentApi';
import { storage } from '../storage';
import type { InsertMEP, InsertCommittee, InsertMEPCommittee, InsertChangeLog, InsertCommitteeEvent } from '@shared/schema';

export class DataSyncService {
  async syncAllData() {
    const updateRecord = await storage.createDataUpdate({
      updateType: 'full_sync',
      status: 'running'
    });
    
    try {
      console.log('Starting full data synchronization with EU Parliament API v2...');
      
      // Sync MEPs
      const mepResults = await this.syncMEPs();
      
      // Sync Committees (Corporate Bodies)  
      const committeeResults = await this.syncCommittees();
      
      // Sync Events
      const eventResults = await this.syncEvents();
      
      // Sync authentic committee memberships from EU Parliament API
      const membershipResults = await this.syncCommitteeMemberships();
      
      const totalRecordsCreated = mepResults.created + committeeResults.created + eventResults.created + membershipResults.created;
      const totalRecordsUpdated = mepResults.updated + committeeResults.updated + eventResults.updated + membershipResults.updated;
      const allErrors = [...mepResults.errors, ...committeeResults.errors, ...eventResults.errors, ...membershipResults.errors];
      
      await storage.updateDataUpdate(updateRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: totalRecordsCreated + totalRecordsUpdated,
        recordsCreated: totalRecordsCreated,
        recordsUpdated: totalRecordsUpdated,
        errors: allErrors.length > 0 ? allErrors : null
      });
      
      console.log(`Data synchronization completed successfully!`);
      console.log(`Created: ${totalRecordsCreated}, Updated: ${totalRecordsUpdated}, Errors: ${allErrors.length}`);
      
    } catch (error) {
      console.error('Error during data synchronization:', error);
      await storage.updateDataUpdate(updateRecord.id, {
        status: 'failed',
        completedAt: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      throw error;
    }
  }

  async syncMEPs(): Promise<{ created: number; updated: number; errors: string[] }> {
    console.log('Syncing MEPs from EU Parliament API...');
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Fetch current MEPs from EU API
      const mepsResponse = await euParliamentAPI.fetchCurrentMEPs();
      const mepsData = mepsResponse['@graph'] || [];
      
      console.log(`Found ${mepsData.length} current MEPs`);
      
      for (const mepData of mepsData) {
        try {
          const transformedMEP = euParliamentAPI.transformMEPData(mepData);
          const existingMEP = await storage.getMEP(transformedMEP.id);
          
          if (existingMEP) {
            // Update existing MEP if there are changes
            if (this.hasSignificantMEPChanges(existingMEP, transformedMEP)) {
              await storage.updateMEP(transformedMEP.id, transformedMEP);
              updated++;
              
              await storage.createChangeLog({
                entityType: 'mep',
                entityId: transformedMEP.id,
                changeType: 'updated',
                oldValues: existingMEP,
                newValues: transformedMEP
              });
              
              console.log(`Updated MEP: ${transformedMEP.fullName}`);
            }
          } else {
            // Create new MEP
            await storage.createMEP(transformedMEP);
            created++;
            
            await storage.createChangeLog({
              entityType: 'mep',
              entityId: transformedMEP.id,
              changeType: 'created',
              oldValues: null,
              newValues: transformedMEP
            });
            
            console.log(`Created MEP: ${transformedMEP.fullName}`);
          }
          
          // Add small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          const errorMsg = `Error processing MEP ${mepData['@id']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
    } catch (error) {
      const errorMsg = `Error fetching MEPs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
    
    return { created, updated, errors };
  }

  async syncCommittees(): Promise<{ created: number; updated: number; errors: string[] }> {
    console.log('Syncing Committees from EU Parliament API...');
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Fetch corporate bodies from EU API (includes committees)
      const bodiesResponse = await euParliamentAPI.fetchCorporateBodies();
      const bodiesData = bodiesResponse['@graph'] || [];
      
      console.log(`Found ${bodiesData.length} corporate bodies`);
      
      for (const bodyData of bodiesData) {
        try {
          const transformedCommittee = euParliamentAPI.transformCommitteeData(bodyData);
          
          // Skip if not a committee
          if (!transformedCommittee) continue;
          
          const existingCommittee = await storage.getCommitteeByCode(transformedCommittee.code);
          
          if (existingCommittee) {
            // Update existing committee if there are changes
            if (this.hasSignificantCommitteeChanges(existingCommittee, transformedCommittee)) {
              await storage.updateCommittee(existingCommittee.id, transformedCommittee);
              updated++;
              
              await storage.createChangeLog({
                entityType: 'committee',
                entityId: existingCommittee.id,
                changeType: 'updated',
                oldValues: existingCommittee,
                newValues: transformedCommittee
              });
              
              console.log(`Updated Committee: ${transformedCommittee.name}`);
            }
          } else {
            // Create new committee
            const newCommittee = await storage.createCommittee(transformedCommittee);
            created++;
            
            await storage.createChangeLog({
              entityType: 'committee',
              entityId: newCommittee.id,
              changeType: 'created',
              oldValues: null,
              newValues: newCommittee
            });
            
            console.log(`Created Committee: ${transformedCommittee.name}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          const errorMsg = `Error processing committee ${bodyData['@id']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
    } catch (error) {
      const errorMsg = `Error fetching committees: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
    
    return { created, updated, errors };
  }

  async syncEvents(): Promise<{ created: number; updated: number; errors: string[] }> {
    console.log('Syncing Events from EU Parliament API...');
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Fetch events for the next 6 months
      const now = new Date();
      const futureDate = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months
      
      const eventsResponse = await euParliamentAPI.fetchEvents(
        now.toISOString().split('T')[0],
        futureDate.toISOString().split('T')[0]
      );
      const eventsData = eventsResponse['@graph'] || [];
      
      console.log(`Found ${eventsData.length} upcoming events`);
      
      for (const eventData of eventsData) {
        try {
          const transformedEvent = euParliamentAPI.transformEventData(eventData);
          
          // Only process events with valid committee IDs
          if (!transformedEvent.committeeId) continue;
          
          const eventRecord: InsertCommitteeEvent = {
            committeeId: transformedEvent.committeeId,
            title: transformedEvent.title,
            eventType: transformedEvent.eventType,
            description: transformedEvent.description,
            startDate: transformedEvent.startDate,
            endDate: transformedEvent.endDate,
            location: transformedEvent.location,
            meetingType: transformedEvent.meetingType,
            agenda: transformedEvent.agenda,
            documentsUrl: transformedEvent.documentsUrl,
            liveStreamUrl: transformedEvent.liveStreamUrl,
            isPublic: transformedEvent.isPublic
          };
          
          // For events, we'll just create new ones (avoiding duplicates is complex with API data)
          await storage.createCommitteeEvent(eventRecord);
          created++;
          
          console.log(`Created Event: ${transformedEvent.title}`);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          const errorMsg = `Error processing event ${eventData['@id']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
    } catch (error) {
      const errorMsg = `Error fetching events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
    
    return { created, updated, errors };
  }

  private hasSignificantMEPChanges(existing: any, updated: any): boolean {
    // Check for significant changes that warrant an update
    const fieldsToCheck = [
      'firstName', 'lastName', 'fullName', 'country', 
      'politicalGroup', 'politicalGroupAbbr', 'email', 
      'photoUrl', 'isActive'
    ];
    
    return fieldsToCheck.some(field => existing[field] !== updated[field]);
  }

  private hasSignificantCommitteeChanges(existing: any, updated: any): boolean {
    const fieldsToCheck = [
      'name', 'code', 'coordinatorName', 'coordinatorGroup', 'isActive'
    ];
    
    return fieldsToCheck.some(field => existing[field] !== updated[field]);
  }

  async syncCommitteeMemberships(): Promise<{ created: number; updated: number; errors: string[] }> {
    console.log('Syncing committee memberships from EU Parliament API...');
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Get committees with members from EU Parliament API
      const committeeResponse = await euParliamentAPI.fetchCommitteesWithMembers();
      const committeesBodies = committeeResponse['@graph'] || [];
      
      console.log(`Found ${committeesBodies.length} corporate bodies`);
      
      for (const body of committeesBodies) {
        try {
          // Check if this is actually a committee
          const bodyType = body['ep:bodyType']?.[0]?.['skos:prefLabel']?.['en'] || '';
          if (!bodyType.toLowerCase().includes('committee')) {
            continue;
          }
          
          const committeeCode = body['skos:notation'] || '';
          const committeeName = body['skos:prefLabel']?.['en'] || '';
          
          // Find matching committee in our database
          const committee = await storage.getCommitteeByCode(committeeCode);
          if (!committee) {
            console.log(`Committee not found in database: ${committeeCode}`);
            continue;
          }
          
          console.log(`Processing committee: ${committeeCode} - ${committeeName}`);
          
          // Process chairperson
          if (body['ep:chairperson']?.length > 0) {
            for (const chair of body['ep:chairperson']) {
              const chairId = euParliamentAPI.extractId(chair['@id'] || '');
              const chairName = chair['foaf:name'] || '';
              
              if (!chairId && !chairName) continue;
              
              // Find MEP by ID or name
              const mep = await this.findMEPByIdOrName(chairId, chairName);
              if (mep) {
                try {
                  await storage.createMEPCommittee({
                    mepId: mep.id,
                    committeeId: committee.id,
                    role: 'chair'
                  });
                  created++;
                  console.log(`Added chair: ${chairName} to ${committeeCode}`);
                } catch (error) {
                  // Relationship might already exist
                }
              }
            }
          }
          
          // Process members
          if (body['ep:hasMember']?.length > 0) {
            for (const member of body['ep:hasMember']) {
              const memberId = euParliamentAPI.extractId(member['@id'] || '');
              const memberName = member['foaf:name'] || '';
              const roleLabel = member['ep:role']?.[0]?.['skos:prefLabel']?.['en'] || 'member';
              
              if (!memberId && !memberName) continue;
              
              // Find MEP by ID or name
              const mep = await this.findMEPByIdOrName(memberId, memberName);
              if (mep) {
                const role = this.normalizeRole(roleLabel);
                try {
                  await storage.createMEPCommittee({
                    mepId: mep.id,
                    committeeId: committee.id,
                    role: role
                  });
                  created++;
                } catch (error) {
                  // Relationship might already exist
                }
              }
            }
          }
          
        } catch (error) {
          const errorMsg = `Error processing committee ${body['skos:notation']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      console.log(`Committee membership sync completed: ${created} created, ${updated} updated`);
      
    } catch (error) {
      const errorMsg = `Error syncing committee memberships: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
    
    return { created, updated, errors };
  }

  private async findMEPByIdOrName(id: string, name: string): Promise<any> {
    // First try to find by ID
    if (id) {
      const mep = await storage.getMEP(id);
      if (mep) return mep;
    }
    
    // If not found by ID, try to find by name
    if (name) {
      const { meps } = await storage.getMEPs({ search: name, limit: 10 });
      for (const mep of meps) {
        if (mep.fullName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(mep.fullName.toLowerCase())) {
          return mep;
        }
      }
    }
    
    return null;
  }

  private normalizeRole(roleLabel: string): string {
    const role = roleLabel.toLowerCase();
    if (role.includes('chair') || role.includes('president')) return 'chair';
    if (role.includes('vice') || role.includes('deputy')) return 'vice-chair';
    if (role.includes('substitute')) return 'substitute';
    return 'member';
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing EU Parliament API connection...');
      const response = await euParliamentAPI.fetchCurrentMEPs();
      
      const data = response['@graph'];
      if (response && data && Array.isArray(data)) {
        console.log(`API test successful. Found ${data.length} MEPs`);
        return true;
      } else {
        console.log('API response structure unexpected:', JSON.stringify(response).substring(0, 200) + '...');
        return false;
      }
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

export const dataSyncService = new DataSyncService();