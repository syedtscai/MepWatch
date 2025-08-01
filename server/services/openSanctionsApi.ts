/**
 * OpenSanctions EU MEPs API Integration
 * 
 * More reliable data source for EU Parliament members with weekly updates.
 * Data includes committee memberships, political affiliations, and accurate biographical info.
 * 
 * API Documentation: https://www.opensanctions.org/datasets/eu_meps/
 * Data Source: https://data.opensanctions.org/datasets/latest/eu_meps/
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 */

interface OpenSanctionsMEP {
  id: string;
  schema: string;
  caption: string;
  properties: {
    name: string[];
    alias?: string[];
    firstName?: string[];
    lastName?: string[];
    birthDate?: string[];
    birthPlace?: string[];
    nationality?: string[];
    position?: string[];
    political?: string[];
    email?: string[];
    phone?: string[];
    website?: string[];
    country?: string[];
    topics?: string[];
    notes?: string[];
    sourceUrl?: string[];
    modifiedAt?: string[];
    createdAt?: string[];
  };
  datasets: string[];
  first_seen: string;
  last_seen: string;
}

export class OpenSanctionsAPI {
  private baseUrl = 'https://data.opensanctions.org/datasets/latest/eu_meps';
  
  async fetchAllMEPs(): Promise<OpenSanctionsMEP[]> {
    console.log('Fetching MEPs from OpenSanctions API...');
    
    const response = await fetch(`${this.baseUrl}/targets.nested.json`);
    
    if (!response.ok) {
      throw new Error(`OpenSanctions API request failed: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n');
    const data: OpenSanctionsMEP[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const mep = JSON.parse(line);
          data.push(mep);
        } catch (error) {
          console.warn(`Failed to parse line: ${line.substring(0, 100)}...`);
        }
      }
    }
    
    return data;
  }
  
  async fetchSimplifiedMEPs(): Promise<any[]> {
    console.log('Fetching simplified MEP data from OpenSanctions...');
    
    const response = await fetch(`${this.baseUrl}/targets.simple.csv`);
    
    if (!response.ok) {
      throw new Error(`OpenSanctions CSV request failed: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    return this.parseCSV(csvText);
  }
  
  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i]);
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        data.push(obj);
      }
    }
    
    return data;
  }
  
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  transformToInternalFormat(openSanctionsMEP: OpenSanctionsMEP) {
    const props = openSanctionsMEP.properties;
    
    return {
      id: openSanctionsMEP.id.replace('eu-meps-', ''),
      firstName: props.firstName?.[0] || '',
      lastName: props.lastName?.[0] || '',
      fullName: props.name?.[0] || openSanctionsMEP.caption,
      country: props.nationality?.[0] || props.country?.[0] || '',
      politicalGroup: props.political?.[0] || '',
      politicalGroupAbbr: this.extractPoliticalGroupAbbr(props.political?.[0] || ''),
      nationalPoliticalGroup: props.notes?.[0] || '',
      photoUrl: null,
      email: props.email?.[0] || null,
      website: props.website?.[0] || null,
      birthDate: props.birthDate?.[0] || null,
      birthPlace: props.birthPlace?.[0] || null,
      termStartDate: null, // Not available in OpenSanctions
      officialUrl: props.sourceUrl?.[0] || `https://www.europarl.europa.eu/meps/en/${openSanctionsMEP.id.replace('eu-meps-', '')}`,
      isActive: true,
    };
  }
  
  private extractPoliticalGroupAbbr(politicalGroup: string): string {
    // Extract abbreviation from political group name
    const abbrevMap: Record<string, string> = {
      'European People\'s Party': 'EPP',
      'Progressive Alliance of Socialists and Democrats': 'S&D',
      'Renew Europe': 'RE',
      'Identity and Democracy': 'ID',
      'European Conservatives and Reformists': 'ECR',
      'The Greens–European Free Alliance': 'Greens/EFA',
      'The Left in the European Parliament': 'GUE/NGL',
      'Patriots for Europe': 'PfE',
      'Europe of Sovereign Nations': 'ESN'
    };
    
    for (const [fullName, abbr] of Object.entries(abbrevMap)) {
      if (politicalGroup.includes(fullName)) {
        return abbr;
      }
    }
    
    return politicalGroup.split(' ').map(word => word[0]).join('').toUpperCase();
  }
}

export const openSanctionsAPI = new OpenSanctionsAPI();