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

  extractId(uri: string): string {
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

  async fetchCommitteeDetails(committeeId: string): Promise<EUCorporateBodyData> {
    const response = await this.rateLimitedFetch(`${this.baseUrl}/corporate-bodies/${committeeId}`);
    const data: EUAPIResponse<EUCorporateBodyData> = await response.json();
    return data['@graph'][0];
  }

  async fetchCommitteesWithMembers(): Promise<EUAPIResponse<EUCorporateBodyData>> {
    // Fetch committees using the correct parameter format - request JSON format explicitly
    const response = await this.rateLimitedFetch(`${this.baseUrl}/corporate-bodies?body-classification=COMMITTEE&format=application/ld+json&limit=50`);
    return await response.json();
  }

  async fetchDetailedCommitteeInfo(committeeId: string): Promise<EUAPIResponse<EUCorporateBodyData>> {
    // Fetch detailed committee information including leadership
    const response = await this.rateLimitedFetch(`${this.baseUrl}/corporate-bodies/${committeeId}?format=application/ld+json`);
    return await response.json();
  }

  async fetchEvents(startDate?: string, endDate?: string): Promise<EUAPIResponse<EUEventData>> {
    let url = `${this.baseUrl}/events`;
    
    // Use a smaller date range to avoid timeout
    const params: string[] = ['limit=100'];
    if (startDate) {
      params.push(`date-start=${startDate}`);
    }
    if (endDate) {
      // Limit to 3 months to avoid timeout
      const maxDate = new Date(startDate || new Date());
      maxDate.setMonth(maxDate.getMonth() + 3);
      const limitedEndDate = endDate && new Date(endDate) < maxDate ? endDate : maxDate.toISOString().split('T')[0];
      params.push(`date-end=${limitedEndDate}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await this.rateLimitedFetch(url);
    return await response.json();
  }

  // Transform EU API data to our internal format
  transformMEPData(euMep: any) {
    // Transform based on official EU Parliament API v2 structure
    const id = this.extractId(euMep.id || '');
    
    return {
      id,
      firstName: euMep.givenName || '',
      lastName: euMep.familyName || '',
      fullName: euMep.label || `${euMep.givenName || ''} ${euMep.familyName || ''}`.trim(),
      country: euMep['country-of-representation'] || '',
      politicalGroup: euMep['political-group'] || '',
      politicalGroupAbbr: euMep['political-group'] || '',
      nationalPoliticalGroup: euMep['national-political-group'] || '',
      photoUrl: null, // Available through detailed MEP endpoint
      email: null, // Available through detailed MEP endpoint
      twitter: null, // Not provided in basic API
      facebook: null, // Not provided in basic API  
      website: null, // Not provided in basic API
      birthDate: null, // Available through detailed MEP endpoint
      birthPlace: null, // Available through detailed MEP endpoint
      officialUrl: `https://www.europarl.europa.eu/meps/en/${id}`, // Official EU Parliament MEP profile
      isActive: true, // Active if returned by show-current
    };
  }

  transformCommitteeData(euBody: any) {
    const id = this.extractId(euBody.id || '');
    const name = euBody.label || '';
    const code = euBody.identifier || id;
    
    if (!name) return null;
    
    // Extract chairperson information if available
    let chairpersonName = null;
    let chairpersonId = null;
    
    // Look for membership information with chair role
    if (euBody.hasMembership && Array.isArray(euBody.hasMembership)) {
      const chairMembership = euBody.hasMembership.find((membership: any) => 
        membership.role && (
          membership.role.includes('chair') || 
          membership.role.includes('Chair') ||
          membership.role.includes('CHAIR')
        )
      );
      
      if (chairMembership && chairMembership.member) {
        chairpersonName = chairMembership.member.label || '';
        chairpersonId = this.extractId(chairMembership.member.id || '');
      }
    }
    
    // Filter to only include actual parliamentary committees
    // Known EU Parliament committees have specific naming patterns
    const isCommittee = this.isActualCommittee(name, code);
    
    if (!isCommittee) return null;

    return {
      id,
      code: code,
      name: name,
      nameNational: null,
      chairpersonName,
      chairpersonId,
      coordinatorName: null, // Would need additional API call
      coordinatorGroup: null, // Would need additional API call
      officialUrl: `https://www.europarl.europa.eu/committees/en/${code.toLowerCase()}/home`, // Official EU Parliament committee page
      isActive: true,
    };
  }

  private isActualCommittee(name: string, code: string): boolean {
    // Known EU Parliament committee codes
    const knownCommittees = [
      'AGRI', 'BUDG', 'CCBE', 'CONT', 'CULT', 'DEVE', 'DROI', 'ECON', 
      'EMPL', 'ENVI', 'FEMM', 'ITRE', 'IMCO', 'JURI', 'LIBE', 'PECH',
      'PETI', 'REGI', 'SEDE', 'TRAN', 'AFCO', 'AFET', 'INTA'
    ];
    
    // Check if code matches known committee codes
    if (knownCommittees.includes(code)) {
      return true;
    }
    
    // Check if name contains committee-related terms
    const namePattern = /committee|commission|subcommittee/i;
    return namePattern.test(name);
  }

  async fetchCommitteeMemberships(): Promise<any> {
    // This would require additional API endpoints that may not be available
    // For now, we'll create sample memberships based on political groups
    return null;
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
      officialUrl: `https://www.europarl.europa.eu/doceo/document/TA-9-${new Date().getFullYear()}-${id}_EN.html`, // Official EU Parliament event/document URL
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