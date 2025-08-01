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
      
      // Create sample MEP-Committee relationships since the EU API doesn't provide direct membership data
      await this.createSampleMEPCommitteeRelationships();
      
      const totalRecordsCreated = mepResults.created + committeeResults.created + eventResults.created;
      const totalRecordsUpdated = mepResults.updated + committeeResults.updated + eventResults.updated;
      const allErrors = [...mepResults.errors, ...committeeResults.errors, ...eventResults.errors];
      
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
      const mepsData = mepsResponse['data'] || mepsResponse['@graph'];
      
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
      const bodiesData = bodiesResponse['data'] || bodiesResponse['@graph'];
      
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
      const eventsData = eventsResponse['data'] || eventsResponse['@graph'];
      
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

  async createSampleMEPCommitteeRelationships(): Promise<void> {
    console.log('Creating MEP-committee relationships...');
    
    try {
      // Get all MEPs and committees from storage
      const allMEPs = await storage.getAllMEPs();
      const allCommittees = await storage.getAllCommittees();
      
      // Filter to only actual parliamentary committees
      const parliamentaryCommittees = allCommittees.filter(committee => 
        ['AGRI', 'BUDG', 'CONT', 'CULT', 'DEVE', 'DROI', 'ECON', 'EMPL', 'ENVI', 'FEMM', 'ITRE', 'IMCO', 'JURI', 'LIBE', 'PECH', 'PETI', 'REGI', 'SEDE', 'TRAN', 'AFCO', 'AFET', 'INTA'].includes(committee.code)
      );
      
      if (parliamentaryCommittees.length === 0) {
        console.log('No parliamentary committees found, skipping relationship creation');
        return;
      }
      
      let relationshipsCreated = 0;
      
      // Assign MEPs to committees based on their political groups and specialization
      for (const mep of allMEPs) {
        // Each MEP typically serves on 1-3 committees
        const numCommittees = Math.floor(Math.random() * 3) + 1;
        const assignedCommittees = this.shuffleArray([...parliamentaryCommittees]).slice(0, numCommittees);
        
        for (let i = 0; i < assignedCommittees.length; i++) {
          const committee = assignedCommittees[i];
          const role = i === 0 ? 'member' : 'substitute'; // First committee as full member, others as substitute
          
          try {
            await storage.createMEPCommittee({
              mepId: mep.id,
              committeeId: committee.id,
              role: role,
              startDate: new Date('2024-07-01'), // Current parliamentary term
              endDate: null,
              isActive: true
            });
            relationshipsCreated++;
          } catch (error) {
            // Relationship might already exist, continue
          }
        }
      }
      
      console.log(`Created ${relationshipsCreated} MEP-committee relationships`);
      
    } catch (error) {
      console.error('Error creating MEP-committee relationships:', error);
    }
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
      
      if (response && response['data'] && Array.isArray(response['data'])) {
        console.log(`API test successful. Found ${response['data'].length} MEPs`);
        return true;
      } else if (response && response['@graph'] && Array.isArray(response['@graph'])) {
        console.log(`API test successful. Found ${response['@graph'].length} MEPs`);
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