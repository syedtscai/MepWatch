// EU Parliament Open Data API v2 Integration
// API Documentation: https://data.europarl.europa.eu/en/developer-corner/opendata-api

interface EUAPIResponse<T> {
  '@context': any;
  '@graph': T[];
  'hydra:view'?: {
    '@id': string;
    'hydra:first'?: string;
    'hydra:last'?: string;
    'hydra:next'?: string;
    'hydra:previous'?: string;
  };
}

interface EUMEPData {
  '@id': string;
  '@type': string;
  'foaf:firstName'?: string;
  'foaf:familyName'?: string;
  'foaf:name'?: string;
  'foaf:img'?: string;
  'schema:email'?: string;
  'schema:birthDate'?: string;
  'schema:birthPlace'?: { [lang: string]: string };
  'ep:country'?: Array<{
    '@id': string;
    'skos:notation'?: string;
    'skos:prefLabel'?: { [lang: string]: string };
  }>;
  'ep:politicalGroup'?: Array<{
    '@id': string;
    'skos:notation'?: string;
    'skos:prefLabel'?: { [lang: string]: string };
  }>;
  'ep:hasMandate'?: Array<{
    '@id': string;
    'ep:parliamentaryTerm'?: string;
    'ep:inParlGroup'?: Array<{
      '@id': string;
      'skos:notation'?: string;
      'skos:prefLabel'?: { [lang: string]: string };
    }>;
  }>;
}

interface EUCorporateBodyData {
  '@id': string;
  '@type': string;
  'skos:notation'?: string;
  'skos:prefLabel'?: { [lang: string]: string };
  'ep:bodyType'?: Array<{
    '@id': string;
    'skos:prefLabel'?: { [lang: string]: string };
  }>;
  'ep:chairperson'?: Array<{
    '@id': string;
    'foaf:name'?: string;
  }>;
  'ep:hasMember'?: Array<{
    '@id': string;
    'foaf:name'?: string;
    'ep:role'?: Array<{
      '@id': string;
      'skos:prefLabel'?: { [lang: string]: string };
    }>;
  }>;
}

interface EUEventData {
  '@id': string;
  '@type': string;
  'dcterms:title'?: { [lang: string]: string };
  'dcterms:description'?: { [lang: string]: string };
  'schema:startDate'?: string;
  'schema:endDate'?: string;
  'schema:location'?: { [lang: string]: string };
  'ep:eventType'?: Array<{
    '@id': string;
    'skos:prefLabel'?: { [lang: string]: string };
  }>;
  'ep:organizer'?: Array<{
    '@id': string;
    'skos:notation'?: string;
    'skos:prefLabel'?: { [lang: string]: string };
  }>;
  'ep:isPublic'?: boolean;
}

export class EUParliamentAPI {
  private baseUrl = 'https://data.europarl.europa.eu/api/v2';
  private requestCount = 0;
  private resetTime = Date.now() + 5 * 60 * 1000; // 5 minutes
  private maxRequests = 450; // Conservative limit (API allows 500 per 5 min)

  private async rateLimitedFetch(url: string): Promise<Response> {
    // Reset counter if 5 minutes have passed
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 5 * 60 * 1000;
    }

    // Check rate limit
    if (this.requestCount >= this.maxRequests) {
      const waitTime = this.resetTime - Date.now();
      console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
      this.requestCount = 0;
      this.resetTime = Date.now() + 5 * 60 * 1000;
    }

    this.requestCount++;
    console.log(`API Request ${this.requestCount}/${this.maxRequests}: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/ld+json',
        'User-Agent': 'EU-MEP-Watch/1.0 (Contact: admin@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private extractText(obj: { [lang: string]: string } | string | undefined, defaultLang = 'en'): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[defaultLang] || obj['en'] || Object.values(obj)[0] || '';
  }

  private extractId(uri: string): string {
    if (!uri) return '';
    if (typeof uri !== 'string') return String(uri);
    return uri.split('/').pop() || uri;
  }

  async fetchCurrentMEPs(): Promise<EUAPIResponse<EUMEPData>> {
    const response = await this.rateLimitedFetch(`${this.baseUrl}/meps/show-current`);
    return await response.json();
  }

  async fetchMEPDetails(mepId: string): Promise<EUMEPData> {
    const response = await this.rateLimitedFetch(`${this.baseUrl}/meps/${mepId}`);
    const data: EUAPIResponse<EUMEPData> = await response.json();
    return data['@graph'][0];
  }

  async fetchCorporateBodies(): Promise<EUAPIResponse<EUCorporateBodyData>> {
    const response = await this.rateLimitedFetch(`${this.baseUrl}/corporate-bodies/show-current`);
    return await response.json();
  }

  async fetchEvents(startDate?: string, endDate?: string): Promise<EUAPIResponse<EUEventData>> {
    let url = `${this.baseUrl}/events`;
    
    const params: string[] = [];
    if (startDate) {
      params.push(`start-date=${startDate}`);
    }
    if (endDate) {
      params.push(`end-date=${endDate}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await this.rateLimitedFetch(url);
    return await response.json();
  }

  // Transform EU API data to our internal format
  transformMEPData(euMep: any) {
    // The real API uses different field names
    const id = this.extractId(euMep['id'] || euMep['@id'] || '');
    
    return {
      id,
      firstName: euMep['givenName'] || euMep['foaf:firstName'] || '',
      lastName: euMep['familyName'] || euMep['foaf:familyName'] || '',
      fullName: euMep['label'] || euMep['foaf:name'] || `${euMep['givenName'] || ''} ${euMep['familyName'] || ''}`.trim(),
      country: euMep['api:country-of-representation'] || '',
      politicalGroup: euMep['api:political-group'] || '',
      politicalGroupAbbr: euMep['api:political-group'] || '',
      nationalPoliticalGroup: '', // Not directly available in EU API
      photoUrl: null, // Would need additional API call to get photo
      email: null, // Would need additional API call to get contact details
      twitter: null, // Not available in EU API
      facebook: null, // Not available in EU API  
      website: null, // Not available in EU API
      birthDate: null, // Would need additional API call
      birthPlace: null, // Would need additional API call
      isActive: true, // Assuming active if returned by show-current
    };
  }

  transformCommitteeData(euBody: any) {
    const id = this.extractId(euBody['id'] || euBody['@id'] || '');
    
    // For real API, we'll accept all corporate bodies and filter them later
    const name = euBody['label'] || this.extractText(euBody['skos:prefLabel']) || '';
    
    if (!name) return null;

    return {
      id,
      code: euBody['identifier'] || euBody['skos:notation'] || id,
      name: name,
      nameNational: null,
      coordinatorName: null, // Would need additional API call
      coordinatorGroup: null, // Would need additional API call
      isActive: true,
    };
  }

  transformEventData(euEvent: any, committeeId?: string) {
    const id = this.extractId(euEvent['id'] || euEvent['@id'] || '');
    const eventType = euEvent['type'] || this.extractText(euEvent['ep:eventType']?.[0]?.['skos:prefLabel']) || 'meeting';

    return {
      id,
      committeeId: committeeId || this.extractId(euEvent['ep:organizer']?.[0]?.['@id'] || euEvent['organizer'] || ''),
      title: this.extractText(euEvent['dcterms:title']),
      eventType: eventType.toLowerCase(),
      description: this.extractText(euEvent['dcterms:description']),
      startDate: euEvent['schema:startDate'] ? new Date(euEvent['schema:startDate']) : new Date(),
      endDate: euEvent['schema:endDate'] ? new Date(euEvent['schema:endDate']) : null,
      location: this.extractText(euEvent['schema:location']),
      meetingType: 'ordinary', // Default, not specifically available in EU API
      agenda: null, // Not directly available
      documentsUrl: null, // Not directly available
      liveStreamUrl: null, // Not directly available
      isPublic: euEvent['ep:isPublic'] !== false, // Default to public
    };
  }

  async getAllPaginatedData<T>(
    fetchFunction: (url: string) => Promise<EUAPIResponse<T>>,
    baseUrl: string
  ): Promise<T[]> {
    const allData: T[] = [];
    let currentUrl = baseUrl;

    while (currentUrl) {
      try {
        const response = await this.rateLimitedFetch(currentUrl);
        const data: EUAPIResponse<T> = await response.json();
        
        allData.push(...data['@graph']);
        
        // Check for next page
        currentUrl = data['hydra:view']?.['hydra:next'] || '';
        
        // Add delay between pages
        if (currentUrl) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error fetching paginated data from ${currentUrl}:`, error);
        break;
      }
    }

    return allData;
  }
}

export const euParliamentAPI = new EUParliamentAPI();