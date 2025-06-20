// OpenCorporates Integration - International Entity Resolution
console.log('Corporate Genome: OpenCorporates module loaded');

const OPENCORPORATES_CONFIG = {
    baseUrl: 'https://api.opencorporates.com/v0.4',
    rateLimit: 500, // requests per day (free tier)
    coverage: '140+ jurisdictions',
    timeout: 12000,
    uniqueValue: 'International entity resolution & ownership chains'
};

// Known offshore jurisdictions for enhanced flagging
const OFFSHORE_JURISDICTIONS = new Set([
    'ky', // Cayman Islands
    'bm', // Bermuda
    'vg', // British Virgin Islands
    'je', // Jersey
    'gg', // Guernsey
    'im', // Isle of Man
    'ch', // Switzerland (certain cantons)
    'lu', // Luxembourg
    'ie', // Ireland
    'nl', // Netherlands
    'sg', // Singapore
    'hk', // Hong Kong
    'pa', // Panama
    'bs', // Bahamas
    'bb', // Barbados
]);

async function getOpenCorporatesData(companyName) {
    try {
        console.log(`🌍 Fetching OpenCorporates data for: ${companyName}`);
        
        // Search for company across all jurisdictions
        const searchUrl = `${OPENCORPORATES_CONFIG.baseUrl}/companies/search`;
        const params = new URLSearchParams({
            q: companyName,
            format: 'json',
            per_page: 10,
            sparse: 'true' // Reduce response size
        });

        const response = await fetch(`${searchUrl}?${params}`, {
            headers: {
                'User-Agent': 'Corporate Genome Extension v0.5.0'
            }
        });

        if (!response.ok) {
            throw new Error(`OpenCorporates API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.companies) {
            const entities = data.results.companies.map(company => {
                const entity = company.company;
                
                return {
                    name: entity.name,
                    jurisdiction: entity.jurisdiction_code,
                    jurisdictionName: entity.jurisdiction_name,
                    companyNumber: entity.company_number,
                    incorporationDate: entity.incorporation_date,
                    companyType: entity.company_type,
                    status: entity.current_status,
                    address: entity.registered_address_in_full,
                    isOffshore: OFFSHORE_JURISDICTIONS.has(entity.jurisdiction_code?.toLowerCase()),
                    openCorporatesUrl: entity.opencorporates_url,
                    confidence: calculateMatchConfidence(companyName, entity.name)
                };
            });

            // Sort by confidence and offshore priority
            entities.sort((a, b) => {
                // Prioritize offshore entities (they're often more interesting)
                if (a.isOffshore && !b.isOffshore) return -1;
                if (!a.isOffshore && b.isOffshore) return 1;
                
                // Then by confidence
                return b.confidence - a.confidence;
            });

            // Analyze for offshore structures
            const offshoreAnalysis = analyzeOffshoreStructure(entities);

            return {
                entities: entities.slice(0, 5), // Top 5 matches
                offshoreAnalysis,
                totalMatches: data.results.total_count,
                source: 'OpenCorporates',
                coverage: OPENCORPORATES_CONFIG.coverage,
                lastUpdated: new Date().toISOString()
            };
        }

        throw new Error('No companies found in OpenCorporates response');
        
    } catch (error) {
        console.error('OpenCorporates error:', error);
        return null;
    }
}

function calculateMatchConfidence(searchTerm, companyName) {
    const search = searchTerm.toLowerCase().trim();
    const company = companyName.toLowerCase().trim();
    
    // Exact match
    if (search === company) return 100;
    
    // Contains search term
    if (company.includes(search)) return 85;
    
    // Search term contains company name
    if (search.includes(company)) return 75;
    
    // Word-based similarity
    const searchWords = search.split(/\s+/);
    const companyWords = company.split(/\s+/);
    
    let matchingWords = 0;
    searchWords.forEach(word => {
        if (companyWords.some(cWord => cWord.includes(word) || word.includes(cWord))) {
            matchingWords++;
        }
    });
    
    const wordSimilarity = (matchingWords / Math.max(searchWords.length, companyWords.length)) * 60;
    
    return Math.round(wordSimilarity);
}

function analyzeOffshoreStructure(entities) {
    const offshoreEntities = entities.filter(e => e.isOffshore);
    const jurisdictionCounts = {};
    
    entities.forEach(entity => {
        jurisdictionCounts[entity.jurisdiction] = (jurisdictionCounts[entity.jurisdiction] || 0) + 1;
    });
    
    // Flag suspicious patterns
    const suspiciousPatterns = [];
    
    if (offshoreEntities.length > 2) {
        suspiciousPatterns.push('Multiple offshore jurisdictions detected');
    }
    
    if (offshoreEntities.some(e => ['ky', 'bm', 'vg'].includes(e.jurisdiction))) {
        suspiciousPatterns.push('High-secrecy jurisdiction detected');
    }
    
    if (Object.keys(jurisdictionCounts).length > 5) {
        suspiciousPatterns.push('Complex multi-jurisdictional structure');
    }

    return {
        offshoreCount: offshoreEntities.length,
        totalJurisdictions: Object.keys(jurisdictionCounts).length,
        jurisdictionBreakdown: jurisdictionCounts,
        suspiciousPatterns,
        riskLevel: calculateRiskLevel(suspiciousPatterns.length, offshoreEntities.length)
    };
}

function calculateRiskLevel(patternCount, offshoreCount) {
    if (patternCount >= 2 || offshoreCount >= 3) return 'HIGH';
    if (patternCount >= 1 || offshoreCount >= 1) return 'MEDIUM';
    return 'LOW';
}

// Export for global access
if (typeof window !== 'undefined') {
    window.getOpenCorporatesData = getOpenCorporatesData;
}

console.log('🌍 OpenCorporates integration ready - International entity resolution enabled');