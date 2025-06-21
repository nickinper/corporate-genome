// Corporate Genome: Secure NLP Processor - Advanced Entity Recognition
console.log('Corporate Genome: NLP Processor initializing...');

class SecureNLPProcessor {
    constructor() {
        // Security constraints
        this.maxProcessingTime = 50; // ms
        this.maxInputLength = 1000; // characters
        this.maxEntities = 20; // per text
        
        // Entity patterns with confidence weights
        this.entityPatterns = new Map();
        this.initializePatterns();
        
        // Context disambiguation rules
        this.disambiguationRules = new Map();
        this.initializeDisambiguation();
        
        // Performance tracking
        this.performanceStats = {
            totalProcessed: 0,
            averageTime: 0,
            cacheHits: 0
        };
        
        // Secure cache with TTL
        this.entityCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    initializePatterns() {
        // Company name patterns with variations
        this.entityPatterns.set('company_formal', {
            patterns: [
                /\b([A-Z][A-Za-z0-9\s\&\-\.]{1,50}(?:\s+(?:Inc|Corp|Corporation|Company|Co|LLC|Ltd|Limited|LP|LLP|plc|PLC|AG|SA|NV|GmbH|KK)\.?))\b/g,
                /\b([A-Z][A-Za-z0-9\s\&\-\.]{1,50}(?:\s+(?:Group|Holdings|Partners|Capital|Financial|Services|Industries|Enterprises)(?:\s+(?:Inc|Corp|LLC|Ltd|LP))?))\b/g
            ],
            confidence: 0.9,
            type: 'company'
        });
        
        // Ticker symbols
        this.entityPatterns.set('ticker_symbol', {
            patterns: [
                /\$([A-Z]{1,5})\b/g, // $AAPL format
                /\b(?:NYSE|NASDAQ|LSE|TSE|HKG|TYO):\s*([A-Z]{1,5})\b/gi, // Exchange:TICKER
                /\((?:NYSE|NASDAQ|LSE|TSE|HKG|TYO):\s*([A-Z]{1,5})\)/gi, // (Exchange:TICKER)
                /\b([A-Z]{2,5})\s+(?:stock|shares?|equity)\b/g // AAPL stock
            ],
            confidence: 0.95,
            type: 'ticker',
            postProcess: this.validateTicker.bind(this)
        });
        
        // Common company abbreviations and nicknames
        this.entityPatterns.set('company_informal', {
            patterns: [
                /\b(JPM|GS|MS|BAC|WFC|C|USB|PNC|COF|TFC)\b/g, // Bank abbreviations
                /\b(AAPL|MSFT|GOOGL?|AMZN|FB|META|TSLA|NVDA|AMD)\b/g, // Tech companies
                /\b(Big\s+(?:Tech|Four|Five)|FAANG|MAMAA)\b/gi // Industry groups
            ],
            confidence: 0.8,
            type: 'company_abbrev'
        });
        
        // International company patterns
        this.entityPatterns.set('company_international', {
            patterns: [
                /\b([A-Z][A-Za-z0-9\s\-]{1,30}(?:\s+(?:KK|K\.K\.|Co\.,Ltd\.|Corporation)))\b/g, // Japanese
                /\b((?:Kabushiki\s*Kaisha|KK)\s*[A-Za-z0-9\s\-]{1,30})\b/g, // Japanese prefix
                /\b([A-Z][A-Za-z0-9\s\-]{1,30}(?:\s+(?:mbH|SARL|SpA|AB|AS|A\/S|Oy|BV)))\b/g // European
            ],
            confidence: 0.85,
            type: 'company_intl'
        });
        
        // Context indicators for company mentions
        this.entityPatterns.set('context_indicators', {
            patterns: [
                /(?:CEO|CFO|President|Chairman|founder)\s+(?:of|at)\s+([A-Z][A-Za-z0-9\s\&\-\.]{1,50})/gi,
                /([A-Z][A-Za-z0-9\s\&\-\.]{1,50})(?:'s|'s)\s+(?:CEO|CFO|president|earnings|revenue|stock)/gi,
                /(?:acquired|bought|merged with|purchased)\s+([A-Z][A-Za-z0-9\s\&\-\.]{1,50})/gi
            ],
            confidence: 0.75,
            type: 'company_context'
        });
    }

    initializeDisambiguation() {
        // Rules to disambiguate entities from common words
        this.disambiguationRules.set('exclude_common', {
            words: new Set([
                'Apple', 'Amazon', 'Oracle', 'Square', 'Box', 'Snap', 'Match',
                'Target', 'Gap', 'Best', 'First', 'Next', 'New', 'Old', 'Big'
            ]),
            contextRequired: [
                /\b(?:Inc|Corp|stock|shares|CEO|company)\b/i,
                /\$[A-Z]{1,5}\b/,
                /\b(?:NYSE|NASDAQ):/i
            ]
        });
        
        // Industry-specific context clues
        this.disambiguationRules.set('industry_context', {
            finance: /\b(?:bank|financial|capital|investment|holdings|asset|fund)\b/i,
            tech: /\b(?:software|technology|tech|cloud|AI|data|cyber|digital)\b/i,
            retail: /\b(?:retail|store|shopping|consumer|brand)\b/i,
            healthcare: /\b(?:pharmaceutical|pharma|medical|healthcare|biotech|drug)\b/i
        });
    }

    async extractEntities(text, context = {}) {
        const startTime = performance.now();
        
        try {
            // Security validation
            const sanitized = this.sanitizeInput(text);
            if (!sanitized) return { entities: [], confidence: 0 };
            
            // Check cache
            const cacheKey = this.generateCacheKey(sanitized);
            const cached = this.checkCache(cacheKey);
            if (cached) {
                this.performanceStats.cacheHits++;
                return cached;
            }
            
            // Extract entities with timeout protection
            const entities = await this.performEntityExtraction(sanitized, context);
            
            // Post-process and validate
            const validated = this.validateAndRankEntities(entities, sanitized, context);
            
            // Cache results
            this.cacheResults(cacheKey, validated);
            
            // Update performance stats
            this.updatePerformanceStats(performance.now() - startTime);
            
            return validated;
            
        } catch (error) {
            console.error('NLP processing error:', error);
            return { entities: [], confidence: 0, error: error.message };
        }
    }

    sanitizeInput(text) {
        if (typeof text !== 'string') return null;
        
        // Length check
        if (text.length > this.maxInputLength) {
            text = text.slice(0, this.maxInputLength);
        }
        
        // Remove potentially dangerous content
        return text
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    async performEntityExtraction(text, context) {
        const entities = [];
        const processedStrings = new Set(); // Avoid duplicates
        
        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('NLP processing timeout')), this.maxProcessingTime);
        });
        
        // Extract entities with patterns
        const extractionPromise = new Promise((resolve) => {
            for (const [patternName, config] of this.entityPatterns) {
                for (const pattern of config.patterns) {
                    const regex = new RegExp(pattern);
                    let match;
                    
                    while ((match = regex.exec(text)) !== null && entities.length < this.maxEntities) {
                        const extracted = match[1] || match[0];
                        const normalizedEntity = this.normalizeEntity(extracted);
                        
                        // Skip if already processed
                        if (processedStrings.has(normalizedEntity)) continue;
                        processedStrings.add(normalizedEntity);
                        
                        // Apply post-processing if defined
                        if (config.postProcess && !config.postProcess(extracted)) {
                            continue;
                        }
                        
                        // Check disambiguation rules
                        if (this.requiresDisambiguation(normalizedEntity)) {
                            const disambiguated = this.disambiguate(normalizedEntity, text, context);
                            if (!disambiguated.isEntity) continue;
                        }
                        
                        entities.push({
                            text: extracted,
                            normalized: normalizedEntity,
                            type: config.type,
                            confidence: config.confidence,
                            pattern: patternName,
                            position: match.index
                        });
                    }
                }
            }
            
            resolve(entities);
        });
        
        // Race between extraction and timeout
        return await Promise.race([extractionPromise, timeoutPromise]);
    }

    normalizeEntity(entity) {
        return entity
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[.,;:!?'"]+$/g, '') // Remove trailing punctuation
            .replace(/^['"]+/g, ''); // Remove leading quotes
    }

    validateTicker(ticker) {
        // Remove $ if present
        ticker = ticker.replace('$', '');
        
        // Valid ticker rules
        return /^[A-Z]{1,5}$/.test(ticker) && 
               !['I', 'O'].includes(ticker) && // Exclude confusing letters
               ticker.length >= 1 && ticker.length <= 5;
    }

    requiresDisambiguation(entity) {
        const rules = this.disambiguationRules.get('exclude_common');
        return rules.words.has(entity);
    }

    disambiguate(entity, fullText, context) {
        const rules = this.disambiguationRules.get('exclude_common');
        
        // Check if required context is present
        for (const contextPattern of rules.contextRequired) {
            if (contextPattern.test(fullText)) {
                return { isEntity: true, confidence: 0.9 };
            }
        }
        
        // Check industry context
        const industryRules = this.disambiguationRules.get('industry_context');
        for (const [industry, pattern] of Object.entries(industryRules)) {
            if (pattern.test(fullText)) {
                return { isEntity: true, confidence: 0.8, industry };
            }
        }
        
        // If no supporting context, likely not an entity
        return { isEntity: false };
    }

    validateAndRankEntities(entities, fullText, context) {
        // Sort by confidence and position
        const sorted = entities.sort((a, b) => {
            // Prefer higher confidence
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            // Then prefer entities appearing earlier
            return a.position - b.position;
        });
        
        // Apply coreference resolution
        const resolved = this.resolveCoreferences(sorted, fullText);
        
        // Calculate overall confidence
        const overallConfidence = this.calculateOverallConfidence(resolved);
        
        return {
            entities: resolved.slice(0, this.maxEntities),
            confidence: overallConfidence,
            processingTime: performance.now()
        };
    }

    resolveCoreferences(entities, fullText) {
        // Simple coreference resolution
        const resolved = [];
        const entityMap = new Map();
        
        for (const entity of entities) {
            // Check if this might be a reference to a previous entity
            const coref = this.findCoreference(entity, entityMap, fullText);
            
            if (coref) {
                // Merge with existing entity
                coref.references = coref.references || [];
                coref.references.push(entity);
                coref.confidence = Math.max(coref.confidence, entity.confidence);
            } else {
                // New entity
                resolved.push(entity);
                entityMap.set(entity.normalized.toLowerCase(), entity);
            }
        }
        
        return resolved;
    }

    findCoreference(entity, entityMap, fullText) {
        // Look for pronouns or references
        const pronounPatterns = [
            /\b(?:the\s+company|the\s+firm|it|they|them)\b/gi,
            /\b(?:this|that|these|those)\s+(?:company|firm|business)\b/gi
        ];
        
        // Check if entity text matches pronoun patterns
        for (const pattern of pronounPatterns) {
            if (pattern.test(entity.text)) {
                // Find the nearest preceding company entity
                for (const [key, existingEntity] of entityMap) {
                    if (existingEntity.position < entity.position) {
                        return existingEntity;
                    }
                }
            }
        }
        
        // Check for partial matches (e.g., "Apple" referring to "Apple Inc.")
        const lowerNormalized = entity.normalized.toLowerCase();
        for (const [key, existingEntity] of entityMap) {
            if (key.includes(lowerNormalized) || lowerNormalized.includes(key)) {
                return existingEntity;
            }
        }
        
        return null;
    }

    calculateOverallConfidence(entities) {
        if (entities.length === 0) return 0;
        
        // Weighted average based on entity confidence and type
        const weights = {
            ticker: 1.0,
            company: 0.9,
            company_abbrev: 0.8,
            company_intl: 0.85,
            company_context: 0.7
        };
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const entity of entities) {
            const weight = weights[entity.type] || 0.5;
            weightedSum += entity.confidence * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    generateCacheKey(text) {
        // Simple hash for cache key
        let hash = 0;
        for (let i = 0; i < Math.min(text.length, 100); i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `nlp_${Math.abs(hash)}`;
    }

    checkCache(key) {
        const cached = this.entityCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        // Clean up expired entry
        if (cached) {
            this.entityCache.delete(key);
        }
        return null;
    }

    cacheResults(key, results) {
        // Limit cache size
        if (this.entityCache.size > 1000) {
            // Remove oldest entries
            const firstKey = this.entityCache.keys().next().value;
            this.entityCache.delete(firstKey);
        }
        
        this.entityCache.set(key, {
            data: results,
            timestamp: Date.now()
        });
    }

    updatePerformanceStats(processingTime) {
        this.performanceStats.totalProcessed++;
        this.performanceStats.averageTime = 
            (this.performanceStats.averageTime * (this.performanceStats.totalProcessed - 1) + processingTime) 
            / this.performanceStats.totalProcessed;
    }

    getPerformanceStats() {
        return {
            ...this.performanceStats,
            cacheHitRate: this.performanceStats.totalProcessed > 0 
                ? this.performanceStats.cacheHits / this.performanceStats.totalProcessed 
                : 0
        };
    }

    clearCache() {
        this.entityCache.clear();
        console.log('NLP cache cleared');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SecureNLPProcessor = SecureNLPProcessor;
}

console.log('🧠 Secure NLP Processor ready - Advanced entity recognition enabled');