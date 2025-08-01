import { euParliamentAPI } from './euParliamentApi';
import { storage } from '../storage';
import type { InsertMEP, InsertCommittee, InsertMEPCommittee, InsertChangeLog } from '@shared/schema';

export class DataSyncService {
  async syncAllData() {
    const updateRecord = await storage.createDataUpdate({
      updateType: 'full_sync',
      status: 'running'
    });
    
    try {
      console.log('Starting full data synchronization...');
      
      // Fetch MEP list first
      const mepListResponse = await euParliamentAPI.fetchMEPList();
      const mepIds = mepListResponse.meps.map(mep => mep.id);
      
      console.log(`Found ${mepIds.length} MEPs to process`);
      
      // Fetch detailed information for all MEPs
      const mepDetails = await euParliamentAPI.fetchAllMEPDetails(mepIds);
      
      console.log(`Successfully fetched details for ${mepDetails.length} MEPs`);
      
      let recordsCreated = 0;
      let recordsUpdated = 0;
      const errors: string[] = [];
      const processedCommittees = new Set<string>();
      
      // Process each MEP and their committees
      for (const mepData of mepDetails) {
        try {
          // Check if MEP already exists
          const existingMEP = await storage.getMEP(mepData.id.toString());
          
          const mepRecord: InsertMEP = {
            id: mepData.id.toString(),
            firstName: mepData.firstName || '',
            lastName: mepData.lastName || '',
            fullName: mepData.fullName,
            country: mepData.country,
            politicalGroup: mepData.politicalGroup,
            politicalGroupAbbr: mepData.politicalGroupShort,
            nationalPoliticalGroup: mepData.nationalPoliticalGroup,
            photoUrl: mepData.photo,
            email: mepData.email,
            twitter: mepData.twitter,
            facebook: mepData.facebook,
            website: mepData.website,
            birthDate: mepData.birthDate,
            birthPlace: mepData.birthPlace,
            isActive: true
          };
          
          if (existingMEP) {
            // Update existing MEP
            await storage.updateMEP(mepData.id.toString(), mepRecord);
            recordsUpdated++;
            
            // Log changes if any
            if (this.hasSignificantChanges(existingMEP, mepRecord)) {
              await storage.createChangeLog({
                entityType: 'mep',
                entityId: mepData.id.toString(),
                changeType: 'updated',
                oldValues: existingMEP,
                newValues: mepRecord
              });
            }
          } else {
            // Create new MEP
            await storage.createMEP(mepRecord);
            recordsCreated++;
            
            await storage.createChangeLog({
              entityType: 'mep',
              entityId: mepData.id.toString(),
              changeType: 'created',
              oldValues: null,
              newValues: mepRecord
            });
          }
          
          // Process committees for this MEP
          for (const committeeData of mepData.committees || []) {
            const committeeCode = committeeData.committeeShort;
            
            if (!processedCommittees.has(committeeCode)) {
              // Check if committee exists
              let committee = await storage.getCommitteeByCode(committeeCode);
              
              if (!committee) {
                // Create new committee
                const newCommittee: InsertCommittee = {
                  id: `committee_${committeeCode}`,
                  code: committeeCode,
                  name: committeeData.committee,
                  isActive: true
                };
                
                committee = await storage.createCommittee(newCommittee);
                
                await storage.createChangeLog({
                  entityType: 'committee',
                  entityId: committee.id,
                  changeType: 'created',
                  oldValues: null,
                  newValues: newCommittee
                });
              }
              
              processedCommittees.add(committeeCode);
            }
            
            // Add MEP to committee
            try {
              const committee = await storage.getCommitteeByCode(committeeCode);
              if (committee) {
                await storage.addMEPToCommittee({
                  mepId: mepData.id.toString(),
                  committeeId: committee.id,
                  role: committeeData.role
                });
              }
            } catch (error) {
              // Might already exist, which is fine
              console.log(`MEP ${mepData.id} already in committee ${committeeCode}`);
            }
          }
          
        } catch (error) {
          console.error(`Error processing MEP ${mepData.id}:`, error);
          errors.push(`MEP ${mepData.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Update the sync record
      await storage.updateDataUpdate(updateRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: mepDetails.length,
        recordsCreated,
        recordsUpdated,
        errors: errors.length > 0 ? errors : null
      });
      
      console.log(`Data sync completed. Created: ${recordsCreated}, Updated: ${recordsUpdated}, Errors: ${errors.length}`);
      
    } catch (error) {
      console.error('Data sync failed:', error);
      
      await storage.updateDataUpdate(updateRecord.id, {
        status: 'failed',
        completedAt: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      throw error;
    }
  }
  
  private hasSignificantChanges(existing: any, updated: InsertMEP): boolean {
    const significantFields = ['fullName', 'politicalGroup', 'politicalGroupAbbr', 'email'];
    
    return significantFields.some(field => {
      return (existing as any)[field] !== (updated as any)[field];
    });
  }
  
  async scheduleDataSync() {
    // This would be called by a cron job or scheduler
    console.log('Scheduled data sync starting...');
    
    try {
      await this.syncAllData();
      console.log('Scheduled data sync completed successfully');
    } catch (error) {
      console.error('Scheduled data sync failed:', error);
    }
  }
}

export const dataSyncService = new DataSyncService();
