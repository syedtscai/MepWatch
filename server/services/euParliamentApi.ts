interface EUMEPListResponse {
  meps: Array<{
    id: number;
    fullName: string;
    country: string;
    politicalGroup: string;
    politicalGroupShort: string;
    nationalPoliticalGroup: string;
  }>;
}

interface EUMEPDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  country: string;
  politicalGroup: string;
  politicalGroupShort: string;
  nationalPoliticalGroup: string;
  photo: string;
  email: string;
  twitter: string;
  facebook: string;
  website: string;
  birthDate: string;
  birthPlace: string;
  committees: Array<{
    committee: string;
    committeeShort: string;
    role: string;
  }>;
}

export class EUParliamentAPI {
  private baseUrl = 'https://data.europarl.europa.eu/api/v2';
  
  async fetchMEPList(): Promise<EUMEPListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/full-list/json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch MEP list: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching MEP list:', error);
      throw error;
    }
  }
  
  async fetchMEPDetail(mepId: number): Promise<EUMEPDetailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${mepId}/json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch MEP detail for ID ${mepId}: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching MEP detail for ID ${mepId}:`, error);
      throw error;
    }
  }
  
  async fetchAllMEPDetails(mepIds: number[]): Promise<EUMEPDetailResponse[]> {
    const results: EUMEPDetailResponse[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the API
    
    for (let i = 0; i < mepIds.length; i += batchSize) {
      const batch = mepIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.fetchMEPDetail(id));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('Failed to fetch MEP detail:', result.reason);
          }
        }
        
        // Add delay between batches to be respectful to the API
        if (i + batchSize < mepIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error processing MEP batch:', error);
      }
    }
    
    return results;
  }
}

export const euParliamentAPI = new EUParliamentAPI();
