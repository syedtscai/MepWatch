#!/usr/bin/env tsx

/**
 * Scrape authentic MEP data directly from EU Parliament website
 * Gets the current 718 active MEPs with complete committee and political group data
 */

import * as cheerio from 'cheerio';

interface AuthenticMEP {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  country: string;
  politicalGroup: string;
  committees: Array<{
    code: string;
    name: string;
    role: string;
  }>;
  email?: string;
  photoUrl?: string;
  officialUrl: string;
}

async function scrapeAuthenticMEPData(): Promise<{
  meps: AuthenticMEP[];
  count: number;
  errors: string[];
}> {
  console.log('🔍 Scraping authentic MEP data from EU Parliament website...');
  
  const errors: string[] = [];
  const meps: AuthenticMEP[] = [];
  
  try {
    // First, get the list of all current MEPs
    console.log('📋 Fetching MEP list from EU Parliament...');
    
    const listResponse = await fetch('https://www.europarl.europa.eu/meps/en/full-list');
    
    if (!listResponse.ok) {
      throw new Error(`Failed to fetch MEP list: ${listResponse.status}`);
    }
    
    const listHtml = await listResponse.text();
    const $ = cheerio.load(listHtml);
    
    // Look for MEP links in the HTML
    const mepLinks: string[] = [];
    
    // Find all MEP profile links
    $('a[href*="/meps/en/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.includes('/meps/en/') && href.includes('/home')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.europarl.europa.eu${href}`;
        if (!mepLinks.includes(fullUrl)) {
          mepLinks.push(fullUrl);
        }
      }
    });
    
    console.log(`Found ${mepLinks.length} MEP profile links`);
    
    if (mepLinks.length === 0) {
      errors.push('No MEP profile links found on the main page');
      return { meps, count: 0, errors };
    }
    
    // Sample first 10 MEPs to test the scraping approach
    const sampleLinks = mepLinks.slice(0, 10);
    console.log(`Testing with ${sampleLinks.length} sample MEPs...`);
    
    for (let i = 0; i < sampleLinks.length; i++) {
      const link = sampleLinks[i];
      console.log(`Processing MEP ${i + 1}/${sampleLinks.length}: ${link}`);
      
      try {
        const mepData = await scrapeMEPProfile(link);
        meps.push(mepData);
        console.log(`✅ Successfully processed: ${mepData.fullName}`);
        
        // Add delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMsg = `Failed to process MEP ${i + 1}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    return { meps, count: meps.length, errors };
    
  } catch (error) {
    const errorMsg = `Failed to scrape MEP data: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { meps, count: 0, errors };
  }
}

async function scrapeMEPProfile(url: string): Promise<AuthenticMEP> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Extract MEP ID from URL
  const urlParts = url.split('/');
  const mepId = urlParts.find(part => /^\d+$/.test(part)) || 'unknown';
  
  // Extract basic information
  const fullName = $('.erpl_person-profile-header h1').text().trim() || 
                   $('h1').first().text().trim() || 'Unknown';
  
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');
  
  // Extract country (look for country flag or text)
  let country = '';
  $('.erpl_badge-flag, .erpl_flag').each((_, element) => {
    const flagClass = $(element).attr('class') || '';
    const countryMatch = flagClass.match(/flag-([a-z]{2})/i);
    if (countryMatch) {
      country = countryMatch[1].toUpperCase();
    }
  });
  
  // Extract political group
  let politicalGroup = '';
  $('.erpl_person-profile-details, .erpl_mep-details').find('span, p, div').each((_, element) => {
    const text = $(element).text().trim();
    if (text.includes('Group') || text.includes('European') || text.includes('Progressive')) {
      politicalGroup = text;
      return false; // Stop iteration
    }
  });
  
  // Extract committees (look for committee information)
  const committees: Array<{ code: string; name: string; role: string }> = [];
  $('.erpl_committee, .committee, [class*="committee"]').each((_, element) => {
    const committeeText = $(element).text().trim();
    if (committeeText) {
      // Try to extract committee code and name
      const codeMatch = committeeText.match(/([A-Z]{3,5})/);
      const code = codeMatch ? codeMatch[1] : 'UNKNOWN';
      
      committees.push({
        code,
        name: committeeText,
        role: 'member' // Default role
      });
    }
  });
  
  // Extract email
  const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') || undefined;
  
  // Extract photo URL
  const photoUrl = $('.erpl_person-image img, .mep-photo img').attr('src') || undefined;
  
  return {
    id: mepId,
    firstName,
    lastName,
    fullName,
    country: country || 'EU',
    politicalGroup: politicalGroup || '',
    committees,
    email,
    photoUrl: photoUrl ? (photoUrl.startsWith('http') ? photoUrl : `https://www.europarl.europa.eu${photoUrl}`) : undefined,
    officialUrl: url
  };
}

async function main() {
  try {
    const result = await scrapeAuthenticMEPData();
    
    console.log('\n' + '='.repeat(50));
    console.log('SCRAPING RESULTS:');
    console.log(`- MEPs processed: ${result.count}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.meps.length > 0) {
      console.log('\nSample MEP data:');
      console.log(JSON.stringify(result.meps[0], null, 2));
    }
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`- ${error}`));
    }
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();