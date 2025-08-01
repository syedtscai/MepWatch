import { storage } from '../storage';
import type { MEPWithCommittees, CommitteeWithMembers } from '@shared/schema';

export class ExportService {
  async exportMEPsToCSV(filters?: any): Promise<string> {
    const { meps } = await storage.getMEPs({ ...filters, limit: 10000 });
    
    const headers = [
      'ID',
      'Full Name',
      'First Name',
      'Last Name',
      'Country',
      'Political Group',
      'Political Group Abbr',
      'National Political Group',
      'Email',
      'Twitter',
      'Facebook',
      'Website',
      'Birth Date',
      'Birth Place',
      'Committees'
    ];
    
    const rows = meps.map(mep => [
      mep.id,
      `"${mep.fullName}"`,
      `"${mep.firstName}"`,
      `"${mep.lastName}"`,
      mep.country,
      `"${mep.politicalGroup || ''}"`,
      mep.politicalGroupAbbr || '',
      `"${mep.nationalPoliticalGroup || ''}"`,
      mep.email || '',
      mep.twitter || '',
      mep.facebook || '',
      mep.website || '',
      mep.birthDate || '',
      `"${mep.birthPlace || ''}"`,
      `"${mep.committees.map(c => c.committee.code).join(', ')}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  async exportCommitteesToCSV(): Promise<string> {
    const { committees } = await storage.getCommittees(1000);
    
    const headers = [
      'ID',
      'Code',
      'Name',
      'Coordinator Name',
      'Coordinator Group',
      'Member Count',
      'Members'
    ];
    
    const rows = committees.map(committee => [
      committee.id,
      committee.code,
      `"${committee.name}"`,
      `"${committee.coordinatorName || ''}"`,
      `"${committee.coordinatorGroup || ''}"`,
      committee.members.length.toString(),
      `"${committee.members.map(m => m.mep.fullName).join('; ')}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  async exportMEPsToJSON(filters?: any): Promise<object> {
    const { meps } = await storage.getMEPs({ ...filters, limit: 10000 });
    
    return {
      exportDate: new Date().toISOString(),
      totalRecords: meps.length,
      filters: filters || {},
      data: meps.map(mep => ({
        id: mep.id,
        fullName: mep.fullName,
        firstName: mep.firstName,
        lastName: mep.lastName,
        country: mep.country,
        politicalGroup: mep.politicalGroup,
        politicalGroupAbbr: mep.politicalGroupAbbr,
        nationalPoliticalGroup: mep.nationalPoliticalGroup,
        contactInfo: {
          email: mep.email,
          twitter: mep.twitter,
          facebook: mep.facebook,
          website: mep.website
        },
        personalInfo: {
          birthDate: mep.birthDate,
          birthPlace: mep.birthPlace,
          photoUrl: mep.photoUrl
        },
        committees: mep.committees.map(c => ({
          code: c.committee.code,
          name: c.committee.name,
          role: c.role
        }))
      }))
    };
  }
  
  generateFilename(type: 'csv' | 'json', entity: 'meps' | 'committees'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `eu-${entity}-${timestamp}.${type}`;
  }
}

export const exportService = new ExportService();
