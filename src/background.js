// Corporate Genome Background Script v0.5.0 - ES Module Compatible
console.log('Corporate Genome: Enhanced Background Script loading...');

// ES Module imports (instead of importScripts)
// Note: The security modules will be available via content scripts

// Global rate limiter for background script
class BackgroundRateLimiter {
    constructor() {
        this.requestCounts = new Map();
        this.windowSize = 60000; // 1 minute
        this.maxRequests = 30;   // 30 requests per minute
    }

    canMakeRequest(senderId) {
        const now = Date.now();
        const requests = this.requestCounts.get(senderId) || [];
        
        // Filter recent requests
        const recentRequests = requests.filter(time => now - time < this.windowSize);
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
        // Add current request
        recentRequests.push(now);
        this.requestCounts.set(senderId, recentRequests);
        
        return true;
    }
}

const rateLimiter = new BackgroundRateLimiter();

// Your existing API functions (simplified for now)
async function getYahooFinanceData(companyName) {
    console.log(`📊 Background: Fetching Yahoo data for ${companyName}`);
    try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${companyName}?modules=institutionOwnership,fundOwnership,majorHoldersBreakdown`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Yahoo Finance error: ${response.status}`);
        
        const data = await response.json();
        
        // Process ownership data
        const processedData = {
            owners: [],
            source: 'Yahoo Finance'
        };
        
        // Extract institutional ownership
        const institutionOwnership = data.quoteSummary?.result?.[0]?.institutionOwnership?.ownershipList || [];
        
        institutionOwnership.slice(0, 10).forEach(owner => {
            if (owner.organization && owner.pctHeld) {
                processedData.owners.push({
                    name: owner.organization,
                    percent: (owner.pctHeld.raw * 100).toFixed(2) + '%',
                    shares: owner.position?.raw || 0
                });
            }
        });
        
        return processedData;
        
    } catch (error) {
        console.error('Yahoo Finance error:', error);
        return { owners: [], source: 'Yahoo Finance', error: error.message };
    }
}

async function getSECOwnershipData(companyName) {
    console.log(`🏛️ Background: Fetching SEC data for ${companyName}`);
    try {
        // Simplified SEC data fetch
        const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${companyName}&type=SC&dateb=&owner=include&count=10&output=atom`;
        
        // Note: SEC API has CORS restrictions, so this is a placeholder
        // In production, you'd need a proxy or different approach
        
        return {
            filings: [],
            source: 'SEC Edgar',
            note: 'SEC data requires proxy due to CORS restrictions'
        };
        
    } catch (error) {
        console.error('SEC error:', error);
        return { filings: [], source: 'SEC Edgar', error: error.message };
    }
}

async function getOpenCorporatesData(companyName) {
    console.log(`🌍 Background: Fetching OpenCorporates data for ${companyName}`);
    try {
        // OpenCorporates free tier (limited)
        const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}&format=json&limit=5`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OpenCorporates error: ${response.status}`);
        
        const data = await response.json();
        
        const processedData = {
            entities: data.results?.companies?.slice(0, 5).map(item => ({
                name: item.company.name,
                jurisdiction: item.company.jurisdiction_code,
                companyNumber: item.company.company_number,
                status: item.company.current_status
            })) || [],
            source: 'OpenCorporates'
        };
        
        return processedData;
        
    } catch (error) {
        console.error('OpenCorporates error:', error);
        return { entities: [], source: 'OpenCorporates', error: error.message };
    }
}

async function getUSASpendingData(companyName) {
    console.log(`💰 Background: Fetching USAspending data for ${companyName}`);
    try {
        const url = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
        const requestBody = {
            filters: {
                recipient_search_text: [companyName],
                award_type_codes: ['A', 'B', 'C', 'D'],
                time_period: [{
                    start_date: '2021-01-01',
                    end_date: new Date().toISOString().split('T')[0]
                }]
            },
            fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency'],
            page: 1,
            limit: 10
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) throw new Error(`USAspending error: ${response.status}`);
        
        const data = await response.json();
        
        const processedData = {
            contracts: data.results?.slice(0, 10).map(result => ({
                awardId: result['Award ID'],
                recipientName: result['Recipient Name'],
                amount: parseFloat(result['Award Amount']) || 0,
                agency: result['Awarding Agency']
            })) || [],
            source: 'USAspending'
        };
        
        return processedData;
        
    } catch (error) {
        console.error('USAspending error:', error);
        return { contracts: [], source: 'USAspending', error: error.message };
    }
}

// Enhanced message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received message:', request.action);
    
    // Rate limiting check
    const senderId = sender.tab?.id || 'unknown';
    
    if (!rateLimiter.canMakeRequest(senderId)) {
        console.warn('Rate limit exceeded for sender:', senderId);
        sendResponse({ 
            success: false, 
            error: 'Rate limit exceeded. Please wait before making more requests.' 
        });
        return true;
    }
    
    // Handle different request types
    if (request.action === 'fetchComprehensiveData') {
        handleComprehensiveDataRequest(request.companyName, sendResponse);
        return true;
    }
    
    if (request.action === 'fetchEnhancedData') {
        handleEnhancedDataRequest(request, sendResponse);
        return true;
    }
    
    sendResponse({ success: false, error: 'Unknown action' });
    return true;
});

// Enhanced data request handler
async function handleEnhancedDataRequest(request, sendResponse) {
    try {
        console.log(`🎯 Fetching enhanced data for: ${request.companyName}`);
        
        const promises = [
            getYahooFinanceData(request.companyName)
        ];
        
        // Add optional sources based on request
        if (request.includeInternational) {
            promises.push(getOpenCorporatesData(request.companyName));
        }
        
        if (request.includeGovernment) {
            promises.push(getUSASpendingData(request.companyName));
        }
        
        const results = await Promise.allSettled(promises);
        
        const enhancedData = {
            yahoo: results[0]?.status === 'fulfilled' ? results[0].value : null,
            international: request.includeInternational && results[1]?.status === 'fulfilled' ? results[1].value : null,
            government: request.includeGovernment && results[2]?.status === 'fulfilled' ? results[2].value : null,
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ Enhanced data fetched successfully');
        sendResponse({ success: true, data: enhancedData });
        
    } catch (error) {
        console.error('❌ Enhanced data fetch failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Legacy comprehensive data handler
async function handleComprehensiveDataRequest(companyName, sendResponse) {
    try {
        const [yahooData] = await Promise.allSettled([
            getYahooFinanceData(companyName)
        ]);
        
        const result = {
            yahoo: yahooData.status === 'fulfilled' ? yahooData.value : null,
            timestamp: new Date().toISOString()
        };
        
        sendResponse({ success: true, data: result });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

console.log('🚀 Enhanced Corporate Genome background script ready!');