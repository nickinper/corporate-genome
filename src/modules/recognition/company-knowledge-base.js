// Corporate Genome: Company Knowledge Base
// Manages a local knowledge base of company entities, aliases, and relationships

console.log('Corporate Genome: Company Knowledge Base initializing...');

class CompanyKnowledgeBase {
    constructor() {
        // Main company database
        this.companies = new Map();
        
        // Indexes for fast lookup
        this.nameIndex = new Map(); // normalized name -> company IDs
        this.tickerIndex = new Map(); // ticker -> company ID
        this.aliasIndex = new Map(); // alias -> company IDs
        
        // Fuzzy matcher for similarity searches
        this.fuzzyMatcher = window.FuzzyMatcher ? new window.FuzzyMatcher() : null;
        this.normalizer = window.CompanyNormalizer ? new window.CompanyNormalizer() : null;
        
        // Initialize with common companies
        this.initializeCommonCompanies();
    }
    
    initializeCommonCompanies() {
        // Fortune 500 and other major companies
        const commonCompanies = [
            {
                id: 'apple',
                name: 'Apple Inc.',
                aliases: ['Apple', 'Apple Computer', 'Apple Computer Inc.', 'AAPL'],
                ticker: 'AAPL',
                exchange: 'NASDAQ',
                industry: 'Technology',
                type: 'corporation'
            },
            {
                id: 'microsoft',
                name: 'Microsoft Corporation',
                aliases: ['Microsoft', 'Microsoft Corp.', 'MSFT'],
                ticker: 'MSFT',
                exchange: 'NASDAQ',
                industry: 'Technology',
                type: 'corporation'
            },
            {
                id: 'alphabet',
                name: 'Alphabet Inc.',
                aliases: ['Alphabet', 'Google', 'Google Inc.', 'GOOGL', 'GOOG'],
                ticker: 'GOOGL',
                exchange: 'NASDAQ',
                industry: 'Technology',
                type: 'corporation',
                subsidiaries: ['Google', 'YouTube', 'Waymo']
            },
            {
                id: 'amazon',
                name: 'Amazon.com Inc.',
                aliases: ['Amazon', 'Amazon.com', 'AMZN'],
                ticker: 'AMZN',
                exchange: 'NASDAQ',
                industry: 'E-commerce/Cloud',
                type: 'corporation'
            },
            {
                id: 'meta',
                name: 'Meta Platforms Inc.',
                aliases: ['Meta', 'Facebook', 'Facebook Inc.', 'FB', 'META'],
                ticker: 'META',
                exchange: 'NASDAQ',
                industry: 'Technology',
                type: 'corporation',
                previousNames: ['Facebook Inc.']
            },
            {
                id: 'berkshire',
                name: 'Berkshire Hathaway Inc.',
                aliases: ['Berkshire Hathaway', 'Berkshire', 'BRK.A', 'BRK.B'],
                ticker: 'BRK.A',
                exchange: 'NYSE',
                industry: 'Conglomerate',
                type: 'corporation'
            },
            {
                id: 'jpmorgan',
                name: 'JPMorgan Chase & Co.',
                aliases: ['JPMorgan', 'JP Morgan', 'JPMorgan Chase', 'Chase', 'JPM'],
                ticker: 'JPM',
                exchange: 'NYSE',
                industry: 'Banking',
                type: 'corporation'
            },
            {
                id: 'walmart',
                name: 'Walmart Inc.',
                aliases: ['Walmart', 'Wal-Mart', 'Wal-Mart Stores', 'WMT'],
                ticker: 'WMT',
                exchange: 'NYSE',
                industry: 'Retail',
                type: 'corporation'
            },
            {
                id: 'tesla',
                name: 'Tesla Inc.',
                aliases: ['Tesla', 'Tesla Motors', 'TSLA'],
                ticker: 'TSLA',
                exchange: 'NASDAQ',
                industry: 'Automotive/Energy',
                type: 'corporation'
            },
            {
                id: 'nvidia',
                name: 'NVIDIA Corporation',
                aliases: ['NVIDIA', 'Nvidia', 'NVDA'],
                ticker: 'NVDA',
                exchange: 'NASDAQ',
                industry: 'Technology',
                type: 'corporation'
            }
        ];
        
        // Add companies to knowledge base
        commonCompanies.forEach(company => this.addCompany(company));
    }
    
    addCompany(companyData) {
        const { id, name, aliases = [], ticker, ...metadata } = companyData;
        
        // Store company data
        this.companies.set(id, {
            id,
            name,
            normalizedName: this.normalizer ? this.normalizer.normalize(name) : name.toLowerCase(),
            aliases: new Set(aliases),
            ticker,
            ...metadata,
            dateAdded: Date.now()
        });
        
        // Update indexes
        const normalizedName = this.normalizer ? this.normalizer.normalize(name) : name.toLowerCase();
        this.addToNameIndex(normalizedName, id);
        
        // Index aliases
        aliases.forEach(alias => {
            const normalizedAlias = this.normalizer ? this.normalizer.normalize(alias) : alias.toLowerCase();
            this.addToAliasIndex(normalizedAlias, id);
        });
        
        // Index ticker if provided
        if (ticker) {
            this.tickerIndex.set(ticker.toUpperCase(), id);
        }
    }
    
    addToNameIndex(name, companyId) {
        const existing = this.nameIndex.get(name) || new Set();
        existing.add(companyId);
        this.nameIndex.set(name, existing);
    }
    
    addToAliasIndex(alias, companyId) {
        const existing = this.aliasIndex.get(alias) || new Set();
        existing.add(companyId);
        this.aliasIndex.set(alias, existing);
    }
    
    // Find company by exact name match
    findByName(name) {
        const normalized = this.normalizer ? this.normalizer.normalize(name) : name.toLowerCase();
        const companyIds = this.nameIndex.get(normalized);
        
        if (!companyIds || companyIds.size === 0) return null;
        
        // Return first match (should typically be only one)
        const companyId = companyIds.values().next().value;
        return this.companies.get(companyId);
    }
    
    // Find company by ticker symbol
    findByTicker(ticker) {
        const companyId = this.tickerIndex.get(ticker.toUpperCase());
        return companyId ? this.companies.get(companyId) : null;
    }
    
    // Find company by alias
    findByAlias(alias) {
        const normalized = this.normalizer ? this.normalizer.normalize(alias) : alias.toLowerCase();
        const companyIds = this.aliasIndex.get(normalized);
        
        if (!companyIds || companyIds.size === 0) return null;
        
        // Return all matches
        return Array.from(companyIds).map(id => this.companies.get(id));
    }
    
    // Search for companies using fuzzy matching
    search(query, options = {}) {
        const {
            limit = 5,
            threshold = 0.7,
            includeAliases = true,
            includeTickers = true
        } = options;
        
        if (!this.fuzzyMatcher) {
            console.warn('Fuzzy matcher not available, falling back to exact search');
            return this.exactSearch(query);
        }
        
        // Normalize query
        const normalizedQuery = this.normalizer ? this.normalizer.normalize(query) : query.toLowerCase();
        
        // Collect all searchable strings
        const searchCandidates = [];
        
        // Add company names
        for (const company of this.companies.values()) {
            searchCandidates.push({
                text: company.name,
                normalized: company.normalizedName,
                companyId: company.id,
                type: 'name',
                boost: 1.0
            });
            
            // Add aliases if requested
            if (includeAliases) {
                for (const alias of company.aliases) {
                    searchCandidates.push({
                        text: alias,
                        normalized: this.normalizer ? this.normalizer.normalize(alias) : alias.toLowerCase(),
                        companyId: company.id,
                        type: 'alias',
                        boost: 0.9
                    });
                }
            }
            
            // Add ticker if requested
            if (includeTickers && company.ticker) {
                searchCandidates.push({
                    text: company.ticker,
                    normalized: company.ticker.toUpperCase(),
                    companyId: company.id,
                    type: 'ticker',
                    boost: 0.8
                });
            }
        }
        
        // Perform fuzzy search
        const matches = searchCandidates
            .map(candidate => ({
                ...candidate,
                score: this.fuzzyMatcher.enhancedCompanyRatio(normalizedQuery, candidate.normalized) * candidate.boost
            }))
            .filter(match => match.score >= threshold)
            .sort((a, b) => b.score - a.score);
        
        // Deduplicate by company ID and return top results
        const seen = new Set();
        const results = [];
        
        for (const match of matches) {
            if (!seen.has(match.companyId)) {
                seen.add(match.companyId);
                const company = this.companies.get(match.companyId);
                results.push({
                    company,
                    score: match.score,
                    matchType: match.type,
                    matchedText: match.text
                });
                
                if (results.length >= limit) break;
            }
        }
        
        return results;
    }
    
    // Exact search fallback
    exactSearch(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        // Check exact name match
        const byName = this.findByName(query);
        if (byName) {
            results.push({
                company: byName,
                score: 1.0,
                matchType: 'name',
                matchedText: byName.name
            });
        }
        
        // Check ticker match
        const byTicker = this.findByTicker(query);
        if (byTicker && !results.some(r => r.company.id === byTicker.id)) {
            results.push({
                company: byTicker,
                score: 0.9,
                matchType: 'ticker',
                matchedText: byTicker.ticker
            });
        }
        
        // Check alias matches
        const byAlias = this.findByAlias(query);
        if (byAlias) {
            byAlias.forEach(company => {
                if (!results.some(r => r.company.id === company.id)) {
                    results.push({
                        company,
                        score: 0.8,
                        matchType: 'alias',
                        matchedText: query
                    });
                }
            });
        }
        
        return results;
    }
    
    // Get all variations of a company name
    getVariations(companyId) {
        const company = this.companies.get(companyId);
        if (!company) return [];
        
        const variations = new Set([company.name]);
        
        // Add all aliases
        company.aliases.forEach(alias => variations.add(alias));
        
        // Add normalized version
        variations.add(company.normalizedName);
        
        // Add ticker if exists
        if (company.ticker) {
            variations.add(company.ticker);
        }
        
        // Add previous names if exists
        if (company.previousNames) {
            company.previousNames.forEach(name => variations.add(name));
        }
        
        return Array.from(variations);
    }
    
    // Check if two company references might be the same
    isSameCompany(ref1, ref2, threshold = 0.8) {
        // Try to find both companies
        const results1 = this.search(ref1, { limit: 1, threshold: 0.6 });
        const results2 = this.search(ref2, { limit: 1, threshold: 0.6 });
        
        // If both found and have same ID, they're the same
        if (results1.length > 0 && results2.length > 0) {
            return results1[0].company.id === results2[0].company.id;
        }
        
        // Otherwise, use fuzzy matching
        if (this.fuzzyMatcher) {
            return this.fuzzyMatcher.isMatch(ref1, ref2, threshold);
        }
        
        // Fallback to simple comparison
        return ref1.toLowerCase() === ref2.toLowerCase();
    }
    
    // Get company metadata
    getCompanyInfo(companyId) {
        return this.companies.get(companyId);
    }
    
    // Update company information
    updateCompany(companyId, updates) {
        const company = this.companies.get(companyId);
        if (!company) return false;
        
        // Update company data
        Object.assign(company, updates, {
            lastUpdated: Date.now()
        });
        
        // Re-index if name changed
        if (updates.name && updates.name !== company.name) {
            // Remove old name from index
            const oldNormalized = company.normalizedName;
            const nameIds = this.nameIndex.get(oldNormalized);
            if (nameIds) {
                nameIds.delete(companyId);
                if (nameIds.size === 0) {
                    this.nameIndex.delete(oldNormalized);
                }
            }
            
            // Add new name to index
            const newNormalized = this.normalizer ? this.normalizer.normalize(updates.name) : updates.name.toLowerCase();
            company.normalizedName = newNormalized;
            this.addToNameIndex(newNormalized, companyId);
        }
        
        return true;
    }
    
    // Export knowledge base to JSON
    toJSON() {
        const data = {
            companies: Array.from(this.companies.values()).map(company => ({
                ...company,
                aliases: Array.from(company.aliases)
            })),
            metadata: {
                version: '1.0',
                exportDate: Date.now(),
                count: this.companies.size
            }
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    // Import knowledge base from JSON
    fromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Clear existing data
            this.companies.clear();
            this.nameIndex.clear();
            this.tickerIndex.clear();
            this.aliasIndex.clear();
            
            // Import companies
            if (data.companies && Array.isArray(data.companies)) {
                data.companies.forEach(company => {
                    this.addCompany(company);
                });
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import knowledge base:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CompanyKnowledgeBase = CompanyKnowledgeBase;
}

console.log('✅ Company Knowledge Base ready');