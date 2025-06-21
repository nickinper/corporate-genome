// Corporate Genome: Enhanced NLP Processor with Entity Resolution
// Integrates company normalization, fuzzy matching, and knowledge base

console.log('Corporate Genome: Enhanced NLP Processor initializing...');

class EnhancedNLPProcessor extends (window.SecureNLPProcessor || class {}) {
    constructor() {
        super();
        
        // Entity resolution components
        this.normalizer = window.CompanyNormalizer ? new window.CompanyNormalizer() : null;
        this.fuzzyMatcher = window.FuzzyMatcher ? new window.FuzzyMatcher() : null;
        this.knowledgeBase = window.CompanyKnowledgeBase ? new window.CompanyKnowledgeBase() : null;
        
        // Enhanced configuration
        this.config = {
            ...this.config,
            fuzzyMatchThreshold: 0.75,
            knowledgeBaseEnabled: true,
            normalizeBeforeExtraction: true,
            enhancedCaching: true
        };
        
        // Enhanced cache with entity resolution results
        this.resolutionCache = new Map();
        
        console.log('✅ Enhanced NLP Processor initialized with entity resolution');
    }
    
    async extractEntities(text, context = {}) {
        const startTime = performance.now();
        
        try {
            // First, get base entities from parent class
            const baseResult = await super.extractEntities(text, context);
            
            if (!baseResult.entities || baseResult.entities.length === 0) {
                return baseResult;
            }
            
            // Enhance entities with resolution
            const enhancedEntities = await this.enhanceEntities(baseResult.entities, text, context);
            
            // Re-rank based on enhanced data
            const rankedEntities = this.rankEnhancedEntities(enhancedEntities);
            
            // Calculate enhanced confidence
            const enhancedConfidence = this.calculateEnhancedConfidence(rankedEntities);
            
            return {
                entities: rankedEntities,
                confidence: enhancedConfidence,
                processingTime: performance.now() - startTime,
                enhanced: true
            };
            
        } catch (error) {
            console.error('Enhanced NLP processing error:', error);
            // Fallback to base extraction
            return super.extractEntities(text, context);
        }
    }
    
    async enhanceEntities(entities, fullText, context) {
        const enhanced = [];
        
        for (const entity of entities) {
            try {
                // Create enhanced entity object
                const enhancedEntity = { ...entity };
                
                // Step 1: Normalize company name
                if (this.normalizer && (entity.type === 'company' || entity.type === 'company_intl')) {
                    enhancedEntity.baseName = this.normalizer.getBaseName(entity.text);
                    enhancedEntity.suffixes = this.normalizer.getSuffixes(entity.text);
                    enhancedEntity.companyType = this.normalizer.getType(entity.text);
                    enhancedEntity.countryHints = this.normalizer.getCountryHints(entity.text);
                }
                
                // Step 2: Check knowledge base
                if (this.knowledgeBase && this.config.knowledgeBaseEnabled) {
                    const kbResults = await this.searchKnowledgeBase(enhancedEntity);
                    if (kbResults && kbResults.length > 0) {
                        enhancedEntity.knowledgeBase = kbResults[0];
                        enhancedEntity.confidence = Math.min(1.0, entity.confidence + 0.1); // Boost confidence
                    }
                }
                
                // Step 3: Find similar entities using fuzzy matching
                if (this.fuzzyMatcher) {
                    enhancedEntity.variations = await this.findVariations(enhancedEntity, entities);
                }
                
                // Step 4: Add contextual information
                enhancedEntity.context = this.extractEntityContext(enhancedEntity, fullText);
                
                enhanced.push(enhancedEntity);
                
            } catch (error) {
                console.error('Error enhancing entity:', error);
                enhanced.push(entity); // Use original if enhancement fails
            }
        }
        
        return enhanced;
    }
    
    async searchKnowledgeBase(entity) {
        if (!this.knowledgeBase) return null;
        
        // Check cache first
        const cacheKey = `kb_${entity.normalized || entity.text}`;
        if (this.resolutionCache.has(cacheKey)) {
            return this.resolutionCache.get(cacheKey);
        }
        
        // Search using multiple strategies
        const searchText = entity.baseName || entity.normalized || entity.text;
        const results = this.knowledgeBase.search(searchText, {
            limit: 3,
            threshold: this.config.fuzzyMatchThreshold,
            includeAliases: true,
            includeTickers: entity.type === 'ticker'
        });
        
        // Cache results
        this.resolutionCache.set(cacheKey, results);
        
        return results;
    }
    
    async findVariations(entity, allEntities) {
        if (!this.fuzzyMatcher) return [];
        
        const variations = [];
        const searchText = entity.baseName || entity.normalized || entity.text;
        
        // Find variations among detected entities
        for (const other of allEntities) {
            if (other === entity) continue;
            
            const otherText = other.baseName || other.normalized || other.text;
            const similarity = this.fuzzyMatcher.companyNameRatio(searchText, otherText);
            
            if (similarity >= this.config.fuzzyMatchThreshold) {
                variations.push({
                    text: other.text,
                    similarity: similarity,
                    type: other.type
                });
            }
        }
        
        return variations;
    }
    
    extractEntityContext(entity, fullText) {
        // Extract surrounding context for the entity
        const contextWindow = 50; // characters before and after
        const position = entity.position || fullText.indexOf(entity.text);
        
        if (position === -1) return null;
        
        const start = Math.max(0, position - contextWindow);
        const end = Math.min(fullText.length, position + entity.text.length + contextWindow);
        
        const contextText = fullText.substring(start, end);
        
        // Look for industry indicators
        const industryPatterns = {
            finance: /\b(?:bank|financial|capital|investment|portfolio|fund|trading)\b/i,
            technology: /\b(?:software|tech|AI|cloud|data|digital|platform|app)\b/i,
            healthcare: /\b(?:pharma|medical|health|drug|biotech|clinical)\b/i,
            retail: /\b(?:retail|store|consumer|brand|shopping|commerce)\b/i,
            energy: /\b(?:oil|gas|energy|renewable|solar|electric|power)\b/i,
            manufacturing: /\b(?:manufacturing|factory|production|industrial)\b/i
        };
        
        const detectedIndustries = [];
        for (const [industry, pattern] of Object.entries(industryPatterns)) {
            if (pattern.test(contextText)) {
                detectedIndustries.push(industry);
            }
        }
        
        // Look for financial indicators
        const financialIndicators = {
            revenue: /\b(?:revenue|sales|turnover)[\s:]+\$?[\d.,]+[BMK]?\b/i,
            market_cap: /\b(?:market\s+cap|valuation)[\s:]+\$?[\d.,]+[BMK]?\b/i,
            stock_price: /\$[\d.,]+(?:\s+per\s+share)?/i,
            percentage: /[\d.,]+%/g
        };
        
        const financialData = {};
        for (const [indicator, pattern] of Object.entries(financialIndicators)) {
            const match = contextText.match(pattern);
            if (match) {
                financialData[indicator] = match[0];
            }
        }
        
        return {
            text: contextText,
            industries: detectedIndustries,
            financialData: Object.keys(financialData).length > 0 ? financialData : null,
            sentiment: this.analyzeSentiment(contextText)
        };
    }
    
    analyzeSentiment(text) {
        // Simple sentiment analysis
        const positiveWords = /\b(?:growth|profit|success|increase|gain|improve|strong|positive|up)\b/gi;
        const negativeWords = /\b(?:loss|decline|decrease|fall|weak|negative|down|risk|concern)\b/gi;
        
        const positiveMatches = (text.match(positiveWords) || []).length;
        const negativeMatches = (text.match(negativeWords) || []).length;
        
        if (positiveMatches > negativeMatches) return 'positive';
        if (negativeMatches > positiveMatches) return 'negative';
        return 'neutral';
    }
    
    rankEnhancedEntities(entities) {
        // Enhanced ranking considering knowledge base matches and variations
        return entities.sort((a, b) => {
            // Priority 1: Knowledge base match
            const aHasKB = a.knowledgeBase && a.knowledgeBase.score > 0.8;
            const bHasKB = b.knowledgeBase && b.knowledgeBase.score > 0.8;
            if (aHasKB && !bHasKB) return -1;
            if (!aHasKB && bHasKB) return 1;
            
            // Priority 2: Confidence score
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            
            // Priority 3: Entity type (prefer formal company names)
            const typeOrder = {
                'ticker': 5,
                'company': 4,
                'company_intl': 3,
                'company_abbrev': 2,
                'company_context': 1
            };
            const aTypeScore = typeOrder[a.type] || 0;
            const bTypeScore = typeOrder[b.type] || 0;
            if (aTypeScore !== bTypeScore) {
                return bTypeScore - aTypeScore;
            }
            
            // Priority 4: Position in text (earlier is better)
            return (a.position || 0) - (b.position || 0);
        });
    }
    
    calculateEnhancedConfidence(entities) {
        if (entities.length === 0) return 0;
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const entity of entities) {
            let weight = 1.0;
            let score = entity.confidence;
            
            // Boost for knowledge base match
            if (entity.knowledgeBase) {
                weight *= 1.2;
                score = Math.max(score, entity.knowledgeBase.score);
            }
            
            // Boost for multiple variations found
            if (entity.variations && entity.variations.length > 0) {
                weight *= 1.1;
            }
            
            // Boost for financial context
            if (entity.context && entity.context.financialData) {
                weight *= 1.1;
            }
            
            totalScore += score * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }
    
    // Additional utility methods
    
    async resolveEntity(text) {
        // Resolve a single entity text to its canonical form
        if (!this.knowledgeBase) return null;
        
        const results = this.knowledgeBase.search(text, { limit: 1 });
        return results.length > 0 ? results[0].company : null;
    }
    
    async areEntitiesRelated(entity1, entity2) {
        // Check if two entities are related (same company, subsidiary, etc.)
        if (!this.knowledgeBase) {
            // Fallback to fuzzy matching
            if (this.fuzzyMatcher) {
                return this.fuzzyMatcher.isMatch(entity1, entity2);
            }
            return false;
        }
        
        return this.knowledgeBase.isSameCompany(entity1, entity2);
    }
    
    getEntitySuggestions(partialText) {
        // Get autocomplete suggestions for partial company names
        if (!this.knowledgeBase) return [];
        
        return this.knowledgeBase.search(partialText, {
            limit: 10,
            threshold: 0.5
        }).map(result => ({
            text: result.company.name,
            ticker: result.company.ticker,
            confidence: result.score
        }));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedNLPProcessor = EnhancedNLPProcessor;
}

console.log('🚀 Enhanced NLP Processor ready - Entity resolution enabled');