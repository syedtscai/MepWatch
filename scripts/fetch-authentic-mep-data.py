#!/usr/bin/env python3

"""
Fetch authentic MEP data using mep-api library
This scrapes the official EU Parliament website for complete MEP information
including committee memberships and political groups.
"""

import json
import mep_api
import sys
from typing import Dict, Any, List

def fetch_authentic_mep_data() -> Dict[str, Any]:
    """Fetch complete MEP data from EU Parliament website"""
    print("🔍 Fetching authentic MEP data from EU Parliament website...")
    
    try:
        # Get all current MEP URLs
        print("Getting all MEP URLs...")
        mep_urls = mep_api.get_mep_urls()
        print(f"Found {len(mep_urls)} MEP URLs")
        
        if len(mep_urls) == 0:
            print("❌ No MEP URLs found - EU Parliament website may be unavailable")
            return {"error": "No MEP URLs found"}
        
        # Sample a few MEPs first to test
        sample_size = min(10, len(mep_urls))
        sample_urls = mep_urls[:sample_size]
        
        print(f"Testing with {sample_size} sample MEPs...")
        
        meps_data = []
        
        for i, url in enumerate(sample_urls):
            try:
                print(f"Processing MEP {i+1}/{sample_size}: {url}")
                
                # Create MEP object
                mep = mep_api.mep(url)
                
                # Get personal data
                personal_data = mep.get_personal_data()
                
                # Get committees
                committees = mep.get_committees()
                
                # Convert to JSON
                mep_json = mep.to_json()
                
                mep_data = {
                    "url": url,
                    "personal_data": personal_data,
                    "committees": committees,
                    "full_json": mep_json
                }
                
                meps_data.append(mep_data)
                print(f"✅ Successfully processed MEP {i+1}")
                
            except Exception as e:
                print(f"❌ Failed to process MEP {i+1}: {e}")
                continue
        
        result = {
            "total_urls_found": len(mep_urls),
            "sample_processed": len(meps_data),
            "sample_data": meps_data,
            "success": True
        }
        
        return result
        
    except Exception as e:
        print(f"❌ Failed to fetch MEP data: {e}")
        return {"error": str(e), "success": False}

def main():
    """Main function"""
    result = fetch_authentic_mep_data()
    
    # Output result as JSON
    print("\n" + "="*50)
    print("RESULT:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()