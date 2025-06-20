// Corporate Genome Data Orchestrator v0.5.0 - Multi-Source Intelligence Engine
console.log('Corporate Genome: Advanced Data Orchestrator loaded');

// Enhanced configuration with new sources
const DATA_SOURCES_CONFIG = {
    // Tier 1: Core ownership data (always fetch)
    tier1: {
        yahoo: { priority: 1, timeout: 10000, required: true },
        sec: { priority: 2, timeout: 15000, required: false }
    },
    
    // Tier 2: International & government data (conditional)
    tier2: {
        opencorporates: { priority: 3, timeout: 12000, rateLimit: 500 },
        usaspending: { priority: 4, timeout: 8000, unlimited: true },
        fred: { priority: 5, timeout: 10000, rateLimit: 120000 }
    },
    
    // Tier 3: Context enhancement (optional)
    tier3: {
        news: { priority: 6, timeout: 8000, rateLimit: 100 },
        worldbank: { priority: 7, timeout: 12000, unlimited: true }
    }
};

// Circuit breaker for resilient data fetching
class CircuitBreaker {
    constructor(name, threshold = 5, timeout = 60000) {
        this.name = name;
        this.threshold = threshold;
        this.timeout = timeout;
        this.failures = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker ${this.name}: Attempting recovery`);
            } else {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.warn(`🚨 Circuit breaker ${this.name} is now OPEN`);
        }
    }
}

// Enhanced data orchestrator
class DataOrchestrator {
    constructor() {
        this.sources = new Map();
        this.circuitBreakers = new Map();
        this.rateLimiters = new Map();
        this.securityMonitor = new SecurityMonitor();
        this.dataValidator = new DataValidator();
        
        this.initializeDataSources();
    }

    initializeDataSources() {
        // Initialize circuit breakers for each source
        Object.keys(DATA_SOURCES_CONFIG.tier1).forEach(source => {
            this.circuitBreakers.set(source, new CircuitBreaker(source));
        });
        
        Object.keys(DATA_SOURCES_CONFIG.tier2).forEach(source => {
            this.circuitBreakers.set(source, new CircuitBreaker(source, 3, 30000));
        });
        
        Object.keys(DATA_SOURCES_CONFIG.tier3).forEach(source => {
            this.circuitBreakers.set(source, new CircuitBreaker(source, 2, 15000));
        });
    }

    async orchestrateDataFetch(companyName, options = {}) {
        console.log(`🎯 Orchestrating comprehensive data fetch for: ${companyName}`);
        
        const dataPromises = [];
        const fetchOptions = {
            includeInternational: options.includeInternational || false,
            includeGovernment: options.includeGovernment || false,
            includeContext: options.includeContext || false,
            userTier: options.userTier || 'free'
        };

        // Tier 1: Always fetch core data
        dataPromises.push(
            this.fetchWithCircuitBreaker('yahoo', companyName, 'getYahooFinanceData'),
            this.fetchWithCircuitBreaker('sec', companyName, 'getSECOwnershipData')
        );

        // Tier 2: Conditional advanced data
        if (fetchOptions.includeInternational) {
            dataPromises.push(
                this.fetchWithCircuitBreaker('opencorporates', companyName, 'getOpenCorporatesData')
            );
        }

        if (fetchOptions.includeGovernment) {
            dataPromises.push(
                this.fetchWithCircuitBreaker('usaspending', companyName, 'getUSASpendingData'),
                this.fetchWithCircuitBreaker('fred', companyName, 'getFredEconomicContext')
            );
        }

        // Tier 3: Context enhancement
        if (fetchOptions.includeContext) {
            dataPromises.push(
                this.fetchWithCircuitBreaker('news', companyName, 'getNewsContext')
            );
        }

        // Execute all data fetches with graceful degradation
        const results = await Promise.allSettled(dataPromises);
        
        return this.mergeAndValidateResults(companyName, results, fetchOptions);
    }

    async fetchWithCircuitBreaker(sourceName, query, methodName) {
        const circuitBreaker = this.circuitBreakers.get(sourceName);
        
        return circuitBreaker.execute(async () => {
            console.log(`📡 Fetching from ${sourceName}...`);
            
            // Call the appropriate data fetching method
            const method = this.getDataMethod(methodName);
            if (!method) {
                throw new Error(`Unknown data method: ${methodName}`);
            }

            const result = await method(query);
            
            // Validate data before returning
            if (result) {
                this.dataValidator.validateDataSource(sourceName, result);
            }
            
            return { source: sourceName, data: result, status: 'success' };
        });
    }

    getDataMethod(methodName) {
        // Map method names to actual functions (defined in background.js)
        const methods = {
            'getYahooFinanceData': window.getYahooFinanceData,
            'getSECOwnershipData': window.getSECOwnershipData,
            'getOpenCorporatesData': window.getOpenCorporatesData,
            'getUSASpendingData': window.getUSASpendingData,
            'getFredEconomicContext': window.getFredEconomicContext,
            'getNewsContext': window.getNewsContext
        };
        
        return methods[methodName];
    }

    mergeAndValidateResults(companyName, results, options) {
        const mergedData = {
            companyName,
            symbol: null,
            owners: [],
            marketData: {},
            internationalEntities: [],
            governmentContracts: [],
            economicContext: {},
            newsContext: [],
            sources: [],
            warnings: [],
            lastUpdated: new Date().toISOString()
        };

        let successCount = 0;
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value?.data) {
                const { source, data } = result.value;
                mergedData.sources.push(source);
                successCount++;

                // Merge data based on source type
                this.mergeSourceData(mergedData, source, data);
            } else if (result.status === 'rejected') {
                console.warn(`❌ Data source failed:`, result.reason?.message);
                mergedData.warnings.push(`${result.reason?.message || 'Unknown error'}`);
            }
        });

        // Quality scoring
        mergedData.qualityScore = this.calculateQualityScore(mergedData, successCount);
        
        console.log(`📊 Data orchestration complete: ${successCount}/${results.length} sources successful`);
        
        return mergedData;
    }

    mergeSourceData(mergedData, source, data) {
        switch (source) {
            case 'yahoo':
                if (data.owners) mergedData.owners.push(...data.owners);
                if (data.marketData) Object.assign(mergedData.marketData, data.marketData);
                if (data.symbol) mergedData.symbol = data.symbol;
                break;
                
            case 'opencorporates':
                if (data.entities) mergedData.internationalEntities.push(...data.entities);
                break;
                
            case 'usaspending':
                if (data.contracts) mergedData.governmentContracts.push(...data.contracts);
                break;
                
            case 'fred':
                if (data.indicators) Object.assign(mergedData.economicContext, data.indicators);
                break;
                
            case 'news':
                if (data.articles) mergedData.newsContext.push(...data.articles);
                break;
                
            default:
                // Handle other sources
                if (data.owners) mergedData.owners.push(...data.owners);
                break;
        }
    }

    calculateQualityScore(data, successCount) {
        let score = 0;
        
        // Base score from successful sources
        score += successCount * 15;
        
        // Bonus for ownership data
        if (data.owners.length > 0) score += 25;
        if (data.owners.length > 5) score += 15;
        
        // Bonus for international coverage
        if (data.internationalEntities.length > 0) score += 20;
        
        // Bonus for government exposure data
        if (data.governmentContracts.length > 0) score += 20;
        
        // Bonus for market data
        if (Object.keys(data.marketData).length > 3) score += 15;
        
        return Math.min(100, score);
    }
}

// Enhanced security monitor
class SecurityMonitor {
    constructor() {
        this.suspiciousActivity = new Set();
        this.rateLimits = new Map();
        this.dataAnomalies = new Map();
    }

    validateApiResponse(source, data, expectedSchema) {
        // Implement schema validation
        if (!data || typeof data !== 'object') {
            this.flagAnomaly(source, 'invalid_response_type');
            return false;
        }
        
        return true;
    }

    flagAnomaly(source, type) {
        const key = `${source}_${type}`;
        const count = this.dataAnomalies.get(key) || 0;
        this.dataAnomalies.set(key, count + 1);
        
        if (count > 5) {
            this.suspiciousActivity.add(source);
            console.warn(`🚨 Suspicious activity detected in ${source}: ${type}`);
        }
    }
}

// Data validator for enhanced security
class DataValidator {
    constructor() {
        this.validationRules = new Map();
        this.setupValidationRules();
    }

    setupValidationRules() {
        this.validationRules.set('opencorporates', {
            requiredFields: ['name', 'jurisdiction_code'],
            validJurisdictions: new Set(['us', 'gb', 'ch', 'ky', 'bm', 'ie', 'lu', 'nl'])
        });

        this.validationRules.set('usaspending', {
            requiredFields: ['recipient_name', 'award_id'],
            contractPattern: /^[A-Z0-9]{10,20}$/
        });
    }

    validateDataSource(source, data) {
        const rules = this.validationRules.get(source);
        if (!rules) return true; // No specific rules, pass through

        try {
            return this.applyValidationRules(source, data, rules);
        } catch (error) {
            console.error(`❌ Validation failed for ${source}:`, error);
            return false;
        }
    }

    applyValidationRules(source, data, rules) {
        // Apply source-specific validation logic
        switch (source) {
            case 'opencorporates':
                return this.validateInternationalEntity(data, rules);
            case 'usaspending':
                return this.validateGovernmentContract(data, rules);
            default:
                return true;
        }
    }

    validateInternationalEntity(data, rules) {
        if (!data.entities) return true;
        
        return data.entities.every(entity => {
            // Validate required fields
            if (!rules.requiredFields.every(field => entity[field])) {
                throw new Error('Missing required fields');
            }
            
            // Validate jurisdiction
            if (!rules.validJurisdictions.has(entity.jurisdiction_code?.toLowerCase())) {
                console.warn(`⚠️ Suspicious jurisdiction: ${entity.jurisdiction_code}`);
            }
            
            return true;
        });
    }

    validateGovernmentContract(data, rules) {
        if (!data.contracts) return true;
        
        return data.contracts.every(contract => {
            // Validate award ID format
            if (contract.award_id && !rules.contractPattern.test(contract.award_id)) {
                throw new Error(`Invalid contract ID format: ${contract.award_id}`);
            }
            
            return true;
        });
    }
}

// Export for use in background script
if (typeof window !== 'undefined') {
    window.DataOrchestrator = DataOrchestrator;
    window.SecurityMonitor = SecurityMonitor;
    window.DataValidator = DataValidator;
}

console.log('🚀 Enhanced Data Orchestrator ready with multi-source intelligence');