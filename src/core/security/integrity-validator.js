// Data Integrity Validator - Advanced Anti-Poisoning Protection
console.log('Corporate Genome: Data Integrity Validator initializing...');

class DataIntegrityValidator {
    constructor() {
        this.trustedFingerprints = new Map();
        this.anomalyDetector = new AnomalyDetector();
        this.quarantineStorage = new Map();
        this.validationRules = new Map();
        this.suspiciousDataCount = 0;
        
        this.setupValidationRules();
        this.loadTrustedFingerprints();
    }

    setupValidationRules() {
        // Yahoo Finance validation rules
        this.validationRules.set('yahoo', {
            requiredFields: ['owners', 'source'],
            ownerValidation: {
                requiredFields: ['name', 'percent'],
                namePattern: /^[A-Za-z0-9\s\.\,\&\-\(\)]{2,100}$/,
                percentPattern: /^\d{1,3}(\.\d{1,2})?%?$/,
                maxOwners: 50
            },
            marketDataValidation: {
                numericFields: ['currentPrice', 'marketCap', 'volume'],
                priceRange: { min: 0.01, max: 100000000 }
            }
        });

        // OpenCorporates validation rules
        this.validationRules.set('opencorporates', {
            requiredFields: ['entities'],
            entityValidation: {
                requiredFields: ['name', 'jurisdiction_code'],
                jurisdictionPattern: /^[a-z]{2,3}$/,
                companyNumberPattern: /^[A-Z0-9\-]{3,20}$/i,
                validJurisdictions: new Set([
                    'us', 'gb', 'ch', 'ky', 'bm', 'ie', 'lu', 'nl', 'sg', 'hk',
                    'ca', 'au', 'de', 'fr', 'it', 'es', 'jp', 'kr'
                ])
            }
        });

        // USAspending validation rules
        this.validationRules.set('usaspending', {
            requiredFields: ['contracts'],
            contractValidation: {
                requiredFields: ['awardId', 'recipientName', 'amount'],
                awardIdPattern: /^[A-Z0-9\-_]{8,25}$/i,
                amountRange: { min: 0, max: 1000000000000 }, // $1T max
                agencyWhitelist: new Set([
                    'DEPARTMENT OF DEFENSE',
                    'DEPARTMENT OF HEALTH AND HUMAN SERVICES',
                    'DEPARTMENT OF VETERANS AFFAIRS',
                    'DEPARTMENT OF ENERGY',
                    'NATIONAL AERONAUTICS AND SPACE ADMINISTRATION',
                    'DEPARTMENT OF HOMELAND SECURITY'
                ])
            }
        });
    }

    async loadTrustedFingerprints() {
        // Load known-good data fingerprints from storage
        try {
            const stored = await chrome.storage.local.get(['trusted_fingerprints']);
            if (stored.trusted_fingerprints) {
                this.trustedFingerprints = new Map(stored.trusted_fingerprints);
                console.log(`📋 Loaded ${this.trustedFingerprints.size} trusted data fingerprints`);
            }
        } catch (error) {
            console.warn('Could not load trusted fingerprints:', error);
        }
    }

    async validateDataIntegrity(source, data, context = {}) {
        console.log(`🔍 Validating data integrity for source: ${source}`);
        
        try {
            // Step 1: Basic structure validation
            const structureValid = await this.validateStructuralIntegrity(source, data);
            if (!structureValid) {
                throw new IntegrityError(`Structural integrity check failed for ${source}`);
            }

            // Step 2: Content validation
            const contentValid = await this.validateContentIntegrity(source, data);
            if (!contentValid) {
                throw new IntegrityError(`Content integrity check failed for ${source}`);
            }

            // Step 3: Anomaly detection
            const anomalyScore = await this.anomalyDetector.analyze(source, data, context);
            if (anomalyScore > 0.8) {
                console.warn(`⚠️ High anomaly score (${anomalyScore.toFixed(2)}) for ${source}`);
                
                if (anomalyScore > 0.95) {
                    return await this.quarantineData(source, data, `Critical anomaly detected (${anomalyScore.toFixed(2)})`);
                }
                
                // Add warning but allow data through
                data._warnings = data._warnings || [];
                data._warnings.push(`Moderate anomaly detected (score: ${anomalyScore.toFixed(2)})`);
            }

            // Step 4: Generate and verify fingerprint
            await this.verifyDataFingerprint(source, data);

            // Step 5: Cross-source consistency check
            if (context.crossValidate) {
                await this.performCrossSourceValidation(source, data, context);
            }

            console.log(`✅ Data integrity validated for ${source}`);
            return data;

        } catch (error) {
            console.error(`❌ Data integrity validation failed for ${source}:`, error);
            
            if (error instanceof IntegrityError) {
                this.suspiciousDataCount++;
                
                // Quarantine obviously malicious data
                if (this.suspiciousDataCount > 5) {
                    return await this.quarantineData(source, data, 'Multiple integrity failures detected');
                }
                
                throw error;
            }
            
            // For other errors, return data with warning
            data._warnings = data._warnings || [];
            data._warnings.push(`Validation error: ${error.message}`);
            return data;
        }
    }

    async validateStructuralIntegrity(source, data) {
        const rules = this.validationRules.get(source);
        if (!rules) {
            console.warn(`No validation rules defined for source: ${source}`);
            return true; // Pass through if no rules
        }

        // Check required top-level fields
        for (const field of rules.requiredFields) {
            if (!(field in data)) {
                console.error(`Missing required field '${field}' in ${source} data`);
                return false;
            }
        }

        // Source-specific validation
        switch (source) {
            case 'yahoo':
                return this.validateYahooStructure(data, rules);
            case 'opencorporates':
                return this.validateOpenCorporatesStructure(data, rules);
            case 'usaspending':
                return this.validateUSASpendingStructure(data, rules);
            default:
                return true;
        }
    }

    validateYahooStructure(data, rules) {
        if (!Array.isArray(data.owners)) {
            console.error('Yahoo data: owners must be an array');
            return false;
        }

        if (data.owners.length > rules.ownerValidation.maxOwners) {
            console.error(`Yahoo data: too many owners (${data.owners.length} > ${rules.ownerValidation.maxOwners})`);
            return false;
        }

        // Validate each owner
        for (const owner of data.owners) {
            if (!this.validateOwnerObject(owner, rules.ownerValidation)) {
                return false;
            }
        }

        return true;
    }

    validateOwnerObject(owner, rules) {
        // Check required fields
        for (const field of rules.requiredFields) {
            if (!owner[field]) {
                console.error(`Owner missing required field: ${field}`);
                return false;
            }
        }

        // Validate name format
        if (!rules.namePattern.test(owner.name)) {
            console.error(`Invalid owner name format: ${owner.name}`);
            return false;
        }

        // Validate percentage format
        if (owner.percent && !rules.percentPattern.test(owner.percent)) {
            console.error(`Invalid percentage format: ${owner.percent}`);
            return false;
        }

        return true;
    }

    validateOpenCorporatesStructure(data, rules) {
        if (!Array.isArray(data.entities)) {
            console.error('OpenCorporates data: entities must be an array');
            return false;
        }

        for (const entity of data.entities) {
            if (!this.validateEntityObject(entity, rules.entityValidation)) {
                return false;
            }
        }

        return true;
    }

    validateEntityObject(entity, rules) {
        // Check required fields
        for (const field of rules.requiredFields) {
            if (!entity[field]) {
                console.error(`Entity missing required field: ${field}`);
                return false;
            }
        }

        // Validate jurisdiction code
        if (!rules.jurisdictionPattern.test(entity.jurisdiction_code)) {
            console.error(`Invalid jurisdiction code: ${entity.jurisdiction_code}`);
            return false;
        }

        // Check against whitelist
        if (!rules.validJurisdictions.has(entity.jurisdiction_code.toLowerCase())) {
            console.warn(`Suspicious jurisdiction: ${entity.jurisdiction_code}`);
            // Don't fail, but flag for review
        }

        return true;
    }

    validateUSASpendingStructure(data, rules) {
        if (!Array.isArray(data.contracts)) {
            console.error('USAspending data: contracts must be an array');
            return false;
        }

        for (const contract of data.contracts) {
            if (!this.validateContractObject(contract, rules.contractValidation)) {
                return false;
            }
        }

        return true;
    }

    validateContractObject(contract, rules) {
        // Check required fields
        for (const field of rules.requiredFields) {
            if (contract[field] === undefined || contract[field] === null) {
                console.error(`Contract missing required field: ${field}`);
                return false;
            }
        }

        // Validate award ID format
        if (contract.awardId && !rules.awardIdPattern.test(contract.awardId)) {
            console.error(`Invalid award ID format: ${contract.awardId}`);
            return false;
        }

        // Validate amount range
        const amount = parseFloat(contract.amount) || 0;
        if (amount < rules.amountRange.min || amount > rules.amountRange.max) {
            console.error(`Contract amount out of valid range: ${amount}`);
            return false;
        }

        return true;
    }

    async validateContentIntegrity(source, data) {
        // Perform deeper content analysis
        try {
            // Check for common injection patterns
            if (this.containsInjectionPatterns(data)) {
                console.error(`Injection patterns detected in ${source} data`);
                return false;
            }

            // Check for obvious fake data patterns
            if (this.containsFakeDataPatterns(source, data)) {
                console.error(`Fake data patterns detected in ${source} data`);
                return false;
            }

            // Validate data relationships
            if (!this.validateDataRelationships(source, data)) {
                console.error(`Data relationship validation failed for ${source}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Content integrity validation error:`, error);
            return false;
        }
    }

    containsInjectionPatterns(data) {
        const dataString = JSON.stringify(data).toLowerCase();
        
        const injectionPatterns = [
            /<script/i,
            /javascript:/i,
            /onclick=/i,
            /onerror=/i,
            /onload=/i,
            /<iframe/i,
            /eval\(/i,
            /document\./i,
            /window\./i,
            /\.\.\//g, // Directory traversal
            /union\s+select/i, // SQL injection
            /drop\s+table/i
        ];

        return injectionPatterns.some(pattern => pattern.test(dataString));
    }

    containsFakeDataPatterns(source, data) {
        // Check for obviously fake or test data
        if (source === 'yahoo' && data.owners) {
            for (const owner of data.owners) {
                if (owner.name && (
                    owner.name.toLowerCase().includes('test') ||
                    owner.name.toLowerCase().includes('fake') ||
                    owner.name.toLowerCase().includes('sample') ||
                    owner.name === 'John Doe' ||
                    owner.name === 'Jane Doe'
                )) {
                    return true;
                }
            }
        }

        return false;
    }

    validateDataRelationships(source, data) {
        if (source === 'yahoo' && data.owners) {
            // Check that percentages don't exceed 100% total
            const totalPercent = data.owners.reduce((sum, owner) => {
                const percent = parseFloat(owner.percent) || 0;
                return sum + percent;
            }, 0);

            if (totalPercent > 105) { // Allow small margin for rounding
                console.warn(`Total ownership exceeds 100%: ${totalPercent}%`);
                return false;
            }
        }

        return true;
    }

    async verifyDataFingerprint(source, data) {
        const fingerprint = await this.generateDataFingerprint(data);
        const key = `${source}_fingerprint`;
        
        // Check against known trusted fingerprints
        if (this.trustedFingerprints.has(key)) {
            const trustedPrints = this.trustedFingerprints.get(key);
            if (!trustedPrints.includes(fingerprint)) {
                console.warn(`New data fingerprint for ${source}: ${fingerprint}`);
                // Add to trusted if it passes other checks
                trustedPrints.push(fingerprint);
                this.saveTrustedFingerprints();
            }
        } else {
            // First time seeing this source, add fingerprint
            this.trustedFingerprints.set(key, [fingerprint]);
            this.saveTrustedFingerprints();
        }
    }

    async generateDataFingerprint(data) {
        // Create a consistent fingerprint of the data structure
        const normalized = this.normalizeForFingerprint(data);
        const dataString = JSON.stringify(normalized);
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 16); // Use first 16 characters
    }

    normalizeForFingerprint(data) {
        // Create a normalized version for fingerprinting
        const normalized = {};
        
        if (data.owners) {
            normalized.ownerCount = data.owners.length;
            normalized.hasOwnershipData = true;
        }
        
        if (data.entities) {
            normalized.entityCount = data.entities.length;
            normalized.hasEntityData = true;
        }
        
        if (data.contracts) {
            normalized.contractCount = data.contracts.length;
            normalized.hasContractData = true;
        }
        
        normalized.source = data.source;
        
        return normalized;
    }

    async saveTrustedFingerprints() {
        try {
            await chrome.storage.local.set({
                trusted_fingerprints: Array.from(this.trustedFingerprints.entries())
            });
        } catch (error) {
            console.error('Failed to save trusted fingerprints:', error);
        }
    }

    async quarantineData(source, data, reason) {
        console.warn(`🚨 QUARANTINING data from ${source}: ${reason}`);
        
        const quarantineId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.quarantineStorage.set(quarantineId, {
            source,
            data,
            reason,
            timestamp: Date.now()
        });

        // Return sanitized/empty data instead
        return {
            source: source,
            quarantined: true,
            reason: reason,
            owners: [],
            entities: [],
            contracts: [],
            _warnings: [`Data quarantined: ${reason}`]
        };
    }

    async performCrossSourceValidation(source, data, context) {
        // Compare data consistency across sources
        if (context.otherSources) {
            for (const [otherSource, otherData] of Object.entries(context.otherSources)) {
                if (otherSource !== source) {
                    await this.validateCrossSourceConsistency(source, data, otherSource, otherData);
                }
            }
        }
    }

    async validateCrossSourceConsistency(source1, data1, source2, data2) {
        // Basic consistency checks between sources
        if (data1.symbol && data2.symbol && data1.symbol !== data2.symbol) {
            console.warn(`Symbol mismatch between ${source1} (${data1.symbol}) and ${source2} (${data2.symbol})`);
        }

        // More sophisticated checks could be added here
        return true;
    }

    // Admin methods
    getQuarantineStats() {
        return {
            quarantinedItems: this.quarantineStorage.size,
            suspiciousDataCount: this.suspiciousDataCount,
            trustedFingerprints: this.trustedFingerprints.size
        };
    }

    clearQuarantine() {
        this.quarantineStorage.clear();
        console.log('🧹 Quarantine cleared');
    }
}

// Anomaly Detection Engine
class AnomalyDetector {
    constructor() {
        this.historicalPatterns = new Map();
        this.baselineStats = new Map();
    }

    async analyze(source, data, context = {}) {
        try {
            let anomalyScore = 0;

            // Statistical anomaly detection
            anomalyScore += this.detectStatisticalAnomalies(source, data);

            // Pattern-based detection
            anomalyScore += this.detectPatternAnomalies(source, data);

            // Temporal anomaly detection
            if (context.timestamp) {
                anomalyScore += this.detectTemporalAnomalies(source, data, context.timestamp);
            }

            // Update baselines with good data
            if (anomalyScore < 0.3) {
                this.updateBaselines(source, data);
            }

            return Math.min(1.0, anomalyScore);
        } catch (error) {
            console.error('Anomaly detection error:', error);
            return 0.5; // Moderate suspicion on error
        }
    }

    detectStatisticalAnomalies(source, data) {
        let score = 0;

        if (source === 'yahoo' && data.owners) {
            // Check for unusual ownership patterns
            const percentages = data.owners
                .map(o => parseFloat(o.percent) || 0)
                .filter(p => p > 0);

            if (percentages.length > 0) {
                const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
                const variance = percentages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / percentages.length;

                // Unusually high variance might indicate fake data
                if (variance > 100) {
                    score += 0.3;
                }

                // All percentages the same (suspicious)
                if (variance < 0.01 && percentages.length > 3) {
                    score += 0.5;
                }
            }
        }

        return score;
    }

    detectPatternAnomalies(source, data) {
        let score = 0;

        // Check for repeated/duplicate entries
        if (data.owners) {
            const names = data.owners.map(o => o.name.toLowerCase());
            const uniqueNames = new Set(names);
            
            if (names.length !== uniqueNames.size) {
                score += 0.4; // Duplicate owners are suspicious
            }
        }

        return score;
    }

    detectTemporalAnomalies(source, data, timestamp) {
        // Check if data is arriving at unusual times or frequencies
        const hour = new Date(timestamp).getHours();
        
        // Data arriving during off-hours is slightly suspicious
        if (hour < 6 || hour > 22) {
            return 0.1;
        }

        return 0;
    }

    updateBaselines(source, data) {
        // Update statistical baselines with good data
        const key = `${source}_baseline`;
        
        if (!this.baselineStats.has(key)) {
            this.baselineStats.set(key, {
                sampleCount: 0,
                averageOwnerCount: 0,
                averageDataSize: 0
            });
        }

        const baseline = this.baselineStats.get(key);
        baseline.sampleCount++;

        if (data.owners) {
            baseline.averageOwnerCount = (baseline.averageOwnerCount * (baseline.sampleCount - 1) + data.owners.length) / baseline.sampleCount;
        }

        const dataSize = JSON.stringify(data).length;
        baseline.averageDataSize = (baseline.averageDataSize * (baseline.sampleCount - 1) + dataSize) / baseline.sampleCount;
    }
}

// Custom error class
class IntegrityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'IntegrityError';
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DataIntegrityValidator = DataIntegrityValidator;
    window.AnomalyDetector = AnomalyDetector;
    window.IntegrityError = IntegrityError;
}

console.log('🔍 Data Integrity Validator ready - Anti-poisoning protection enabled');