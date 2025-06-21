// Corporate Genome: Confidence Scoring System - Multi-Factor Entity Validation
console.log('Corporate Genome: Confidence Scorer initializing...');

class ConfidenceScorer {
    constructor() {
        // Weight configuration for different factors
        this.weights = {
            patternMatch: 0.25,      // How well the pattern matched
            domContext: 0.20,        // DOM position and structure
            nlpConfidence: 0.25,     // NLP extraction confidence
            crossReference: 0.15,    // Match with known entities
            contextConsistency: 0.15 // Consistency across multiple signals
        };
        
        // Thresholds for different confidence levels
        this.thresholds = {
            high: 0.85,
            medium: 0.65,
            low: 0.45
        };
        
        // Known entity database (would be loaded from external source in production)
        this.knownEntities = new Map();
        this.initializeKnownEntities();
        
        // Performance tracking
        this.scoringStats = {
            totalScored: 0,
            averageScore: 0,
            distributionByLevel: { high: 0, medium: 0, low: 0, reject: 0 }
        };
    }

    initializeKnownEntities() {
        // Major companies by sector
        const companies = {
            tech: [
                { name: 'Apple Inc.', aliases: ['Apple', 'AAPL'], ticker: 'AAPL', sector: 'technology' },
                { name: 'Microsoft Corporation', aliases: ['Microsoft', 'MSFT'], ticker: 'MSFT', sector: 'technology' },
                { name: 'Alphabet Inc.', aliases: ['Google', 'Alphabet', 'GOOGL', 'GOOG'], ticker: 'GOOGL', sector: 'technology' },
                { name: 'Amazon.com Inc.', aliases: ['Amazon', 'AMZN'], ticker: 'AMZN', sector: 'technology' },
                { name: 'Meta Platforms Inc.', aliases: ['Facebook', 'Meta', 'FB', 'META'], ticker: 'META', sector: 'technology' }
            ],
            finance: [
                { name: 'JPMorgan Chase & Co.', aliases: ['JPMorgan', 'Chase', 'JPM'], ticker: 'JPM', sector: 'finance' },
                { name: 'Bank of America Corporation', aliases: ['Bank of America', 'BofA', 'BAC'], ticker: 'BAC', sector: 'finance' },
                { name: 'Wells Fargo & Company', aliases: ['Wells Fargo', 'WFC'], ticker: 'WFC', sector: 'finance' },
                { name: 'Goldman Sachs Group Inc.', aliases: ['Goldman Sachs', 'Goldman', 'GS'], ticker: 'GS', sector: 'finance' },
                { name: 'Morgan Stanley', aliases: ['MS'], ticker: 'MS', sector: 'finance' }
            ],
            institutional: [
                { name: 'The Vanguard Group', aliases: ['Vanguard'], ticker: null, sector: 'asset_management' },
                { name: 'BlackRock Inc.', aliases: ['BlackRock', 'BLK'], ticker: 'BLK', sector: 'asset_management' },
                { name: 'State Street Corporation', aliases: ['State Street', 'STT'], ticker: 'STT', sector: 'asset_management' },
                { name: 'Fidelity Investments', aliases: ['Fidelity'], ticker: null, sector: 'asset_management' }
            ]
        };
        
        // Build index for fast lookup
        for (const [sector, sectorCompanies] of Object.entries(companies)) {
            for (const company of sectorCompanies) {
                // Index by official name
                this.knownEntities.set(company.name.toLowerCase(), company);
                
                // Index by aliases
                for (const alias of company.aliases) {
                    this.knownEntities.set(alias.toLowerCase(), company);
                }
                
                // Index by ticker if available
                if (company.ticker) {
                    this.knownEntities.set(company.ticker.toLowerCase(), company);
                    this.knownEntities.set(`$${company.ticker}`.toLowerCase(), company);
                }
            }
        }
    }

    async calculateScore(factors, context = {}) {
        try {
            // Validate input factors
            const validatedFactors = this.validateFactors(factors);
            
            // Calculate individual scores
            const scores = {
                patternMatch: this.scorePatternMatch(validatedFactors.patternMatch),
                domContext: this.scoreDOMContext(validatedFactors.domContext),
                nlpConfidence: this.scoreNLPConfidence(validatedFactors.nlpConfidence),
                crossReference: this.scoreCrossReference(validatedFactors.entity, context),
                contextConsistency: this.scoreContextConsistency(validatedFactors, context)
            };
            
            // Calculate weighted average
            const finalScore = this.calculateWeightedScore(scores);
            
            // Determine confidence level
            const level = this.determineConfidenceLevel(finalScore);
            
            // Update statistics
            this.updateStatistics(finalScore, level);
            
            return {
                score: finalScore,
                level: level,
                breakdown: scores,
                recommendation: this.getRecommendation(finalScore, level, scores)
            };
            
        } catch (error) {
            console.error('Confidence scoring error:', error);
            return {
                score: 0,
                level: 'error',
                breakdown: {},
                recommendation: 'Unable to calculate confidence'
            };
        }
    }

    validateFactors(factors) {
        const validated = {
            patternMatch: factors.patternMatch || {},
            domContext: factors.domContext || {},
            nlpConfidence: factors.nlpConfidence || {},
            entity: factors.entity || {}
        };
        
        // Ensure all required fields exist
        validated.patternMatch.confidence = validated.patternMatch.confidence || 0;
        validated.domContext.confidence = validated.domContext.confidence || 0;
        validated.nlpConfidence.confidence = validated.nlpConfidence.confidence || 0;
        validated.entity.text = validated.entity.text || '';
        validated.entity.normalized = validated.entity.normalized || validated.entity.text;
        
        return validated;
    }

    scorePatternMatch(patternMatch) {
        let score = patternMatch.confidence || 0;
        
        // Boost score for exact pattern types
        if (patternMatch.type === 'ticker') {
            score *= 1.2;
        } else if (patternMatch.type === 'company_formal') {
            score *= 1.1;
        }
        
        // Penalty for weak patterns
        if (patternMatch.type === 'company_context') {
            score *= 0.8;
        }
        
        return Math.min(score, 1.0);
    }

    scoreDOMContext(domContext) {
        let score = domContext.confidence || 0;
        
        // Position-based adjustments
        if (domContext.position) {
            if (domContext.position.includes('h1')) {
                score *= 1.3;
            } else if (domContext.position.includes('h2')) {
                score *= 1.2;
            } else if (domContext.position.includes('firstParagraph')) {
                score *= 1.15;
            }
        }
        
        // Context clue bonuses
        if (domContext.contextClues) {
            const hasStrongClues = domContext.contextClues.some(clue => 
                clue.type === 'dataAttribute' || clue.type.includes('ticker')
            );
            if (hasStrongClues) {
                score *= 1.25;
            }
        }
        
        return Math.min(score, 1.0);
    }

    scoreNLPConfidence(nlpConfidence) {
        let score = nlpConfidence.confidence || 0;
        
        // Adjust based on entity count and quality
        if (nlpConfidence.entities && nlpConfidence.entities.length > 0) {
            const topEntity = nlpConfidence.entities[0];
            
            // Boost for high-confidence primary entity
            if (topEntity.confidence > 0.9) {
                score *= 1.15;
            }
            
            // Check for supporting entities
            const supportingEntities = nlpConfidence.entities.slice(1)
                .filter(e => e.confidence > 0.7);
            if (supportingEntities.length > 0) {
                score *= 1.1;
            }
        }
        
        return Math.min(score, 1.0);
    }

    scoreCrossReference(entity, context) {
        const normalizedEntity = entity.normalized?.toLowerCase() || entity.text?.toLowerCase() || '';
        
        // Check against known entities
        const knownEntity = this.knownEntities.get(normalizedEntity);
        if (!knownEntity) {
            // Try partial matching
            return this.fuzzyMatchKnownEntity(normalizedEntity);
        }
        
        let score = 0.9; // Base score for exact match
        
        // Boost for ticker match
        if (entity.type === 'ticker' && knownEntity.ticker === entity.text.toUpperCase()) {
            score = 1.0;
        }
        
        // Sector consistency check
        if (context.industry && knownEntity.sector) {
            const sectorMatch = this.checkSectorConsistency(context.industry, knownEntity.sector);
            score *= sectorMatch ? 1.1 : 0.9;
        }
        
        return Math.min(score, 1.0);
    }

    fuzzyMatchKnownEntity(entityText) {
        let bestScore = 0;
        
        // Check each known entity for partial matches
        for (const [key, knownEntity] of this.knownEntities) {
            const similarity = this.calculateSimilarity(entityText, key);
            
            if (similarity > 0.8) {
                bestScore = Math.max(bestScore, similarity * 0.8); // Reduce score for fuzzy matches
            }
        }
        
        return bestScore;
    }

    calculateSimilarity(str1, str2) {
        // Simple Jaccard similarity for words
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    checkSectorConsistency(detectedIndustry, knownSector) {
        const sectorMap = {
            'technology': ['tech', 'software', 'internet', 'digital'],
            'finance': ['financial', 'banking', 'investment'],
            'asset_management': ['investment', 'fund', 'capital']
        };
        
        const sectorKeywords = sectorMap[knownSector] || [];
        return sectorKeywords.some(keyword => 
            detectedIndustry.toLowerCase().includes(keyword)
        );
    }

    scoreContextConsistency(factors, context) {
        const consistencyChecks = [];
        
        // Check pattern vs NLP consistency
        if (factors.patternMatch.entity && factors.nlpConfidence.entities?.[0]) {
            const patternEntity = factors.patternMatch.entity.toLowerCase();
            const nlpEntity = factors.nlpConfidence.entities[0].normalized.toLowerCase();
            
            if (patternEntity === nlpEntity) {
                consistencyChecks.push(1.0);
            } else if (this.calculateSimilarity(patternEntity, nlpEntity) > 0.7) {
                consistencyChecks.push(0.8);
            } else {
                consistencyChecks.push(0.5);
            }
        }
        
        // Check DOM context vs entity type consistency
        if (factors.domContext.contextClues && factors.entity.type) {
            const hasRelevantClues = factors.domContext.contextClues.some(clue => {
                if (factors.entity.type === 'ticker') {
                    return clue.type.includes('ticker') || clue.type.includes('symbol');
                }
                return clue.type.includes('company');
            });
            
            consistencyChecks.push(hasRelevantClues ? 1.0 : 0.6);
        }
        
        // Calculate average consistency
        if (consistencyChecks.length === 0) return 0.7; // Default moderate consistency
        
        return consistencyChecks.reduce((a, b) => a + b, 0) / consistencyChecks.length;
    }

    calculateWeightedScore(scores) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [factor, score] of Object.entries(scores)) {
            const weight = this.weights[factor] || 0;
            weightedSum += score * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    determineConfidenceLevel(score) {
        if (score >= this.thresholds.high) return 'high';
        if (score >= this.thresholds.medium) return 'medium';
        if (score >= this.thresholds.low) return 'low';
        return 'reject';
    }

    getRecommendation(score, level, breakdown) {
        if (level === 'high') {
            return 'Entity highly reliable - proceed with confidence';
        } else if (level === 'medium') {
            const weakestFactor = this.findWeakestFactor(breakdown);
            return `Entity moderately reliable - verify ${weakestFactor}`;
        } else if (level === 'low') {
            return 'Entity uncertain - additional validation recommended';
        } else {
            return 'Entity not reliable - consider rejection';
        }
    }

    findWeakestFactor(breakdown) {
        let weakest = null;
        let lowestScore = 1.0;
        
        for (const [factor, score] of Object.entries(breakdown)) {
            if (score < lowestScore) {
                lowestScore = score;
                weakest = factor;
            }
        }
        
        const factorNames = {
            patternMatch: 'pattern matching',
            domContext: 'DOM position',
            nlpConfidence: 'NLP extraction',
            crossReference: 'entity verification',
            contextConsistency: 'context consistency'
        };
        
        return factorNames[weakest] || 'unknown factor';
    }

    updateStatistics(score, level) {
        this.scoringStats.totalScored++;
        
        // Update average
        this.scoringStats.averageScore = 
            (this.scoringStats.averageScore * (this.scoringStats.totalScored - 1) + score) 
            / this.scoringStats.totalScored;
        
        // Update distribution
        this.scoringStats.distributionByLevel[level]++;
    }

    getStatistics() {
        return {
            ...this.scoringStats,
            distributionPercentages: Object.entries(this.scoringStats.distributionByLevel)
                .reduce((acc, [level, count]) => {
                    acc[level] = this.scoringStats.totalScored > 0 
                        ? (count / this.scoringStats.totalScored * 100).toFixed(1) + '%'
                        : '0%';
                    return acc;
                }, {})
        };
    }

    adjustThresholds(newThresholds) {
        // Allow dynamic threshold adjustment based on performance
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('Confidence thresholds updated:', this.thresholds);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ConfidenceScorer = ConfidenceScorer;
}

console.log('📊 Confidence Scorer ready - Multi-factor entity validation enabled');