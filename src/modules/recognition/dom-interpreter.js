// Corporate Genome: DOM Interpreter - Site-Aware Structural Analysis
console.log('Corporate Genome: DOM Interpreter initializing...');

class DOMInterpreter {
    constructor() {
        // Site profiles for DOM structure understanding
        this.siteProfiles = new Map();
        this.loadSiteProfiles();
        
        // Performance constraints
        this.maxAnalysisTime = 100; // ms
        this.maxTraversalDepth = 10;
        this.maxElementsAnalyzed = 50;
        
        // Weighting factors for position-based confidence
        this.positionWeights = {
            title: 1.0,
            h1: 0.9,
            h2: 0.8,
            h3: 0.7,
            articleHeader: 0.85,
            articleBody: 0.6,
            sidebar: 0.3,
            footer: 0.1
        };
        
        // Cache for performance
        this.analysisCache = new Map();
        this.cacheTimeout = 60000; // 1 minute
    }

    loadSiteProfiles() {
        // Forbes profile
        this.siteProfiles.set('forbes', {
            selectors: {
                articleContainer: 'article, .article-text, [role="article"]',
                headline: 'h1, .article-headline, .fs-headline',
                subheadline: 'h2, .article-subhead',
                body: '.article-body, .article-text, .body-content',
                companyMentions: 'a[href*="/companies/"], .company-tag',
                metadata: '.article-meta, .byline, time'
            },
            patterns: {
                companyLink: /\/companies\/([^\/]+)\/?$/,
                profileLink: /\/profile\/([^\/]+)\/?$/,
                tickerPattern: /\(([A-Z]{1,5})\)/
            },
            weightMultipliers: {
                inHeadline: 1.5,
                inFirstParagraph: 1.3,
                hasCompanyLink: 1.4,
                inQuote: 0.8
            }
        });
        
        // Yahoo Finance profile
        this.siteProfiles.set('yahoo', {
            selectors: {
                quoteHeader: '[data-symbol], .quote-header-section',
                companyName: 'h1[data-symbol], .company-name',
                ticker: '[data-symbol], .ticker-symbol',
                newsItem: '.news-item, article.js-stream-content',
                priceInfo: '[data-field="regularMarketPrice"]',
                metadata: '.published-date, .author-info'
            },
            patterns: {
                symbolPattern: /data-symbol="([A-Z]{1,5})"/,
                tickerInUrl: /quote\/([A-Z]{1,5})/,
                companyInTitle: /^(.+?)\s*\([A-Z]{1,5}\)/
            },
            weightMultipliers: {
                hasDataSymbol: 2.0,
                inQuoteHeader: 1.8,
                inNewsHeadline: 1.4,
                inFinancialTable: 1.2
            }
        });
        
        // Bloomberg profile
        this.siteProfiles.set('bloomberg', {
            selectors: {
                articleContainer: 'article, .article-wrap',
                headline: 'h1.headline, .headline__text',
                ticker: '.ticker, .stock-ticker',
                companyTag: '.company-tag, [data-type="company"]',
                body: '.body-content, .article-body__content',
                metadata: '.published-date, .byline'
            },
            patterns: {
                tickerFormat: /([A-Z]{1,5})(?:\s+(?:US|LN|HK|JP))?(?:\s+Equity)?/,
                companyMention: /\b([A-Z][a-zA-Z\s\&\.]{2,50})\s+(?:said|announced|reported)/
            },
            weightMultipliers: {
                hasTicker: 1.6,
                inHeadline: 1.5,
                hasCompanyTag: 1.4,
                inLead: 1.3
            }
        });
        
        // MarketWatch profile
        this.siteProfiles.set('marketwatch', {
            selectors: {
                articleContainer: '.article__content, article',
                headline: 'h1.article__headline',
                ticker: '.ticker, .company-ticker',
                companyLink: 'a[href*="/investing/stock/"]',
                body: '.article__body, .paywall',
                metadata: '.article__timestamp, .author'
            },
            patterns: {
                tickerInLink: /\/investing\/stock\/([A-Z]{1,5})/,
                companyFormat: /([A-Z][a-zA-Z\s\&\.]{2,50})(?:\s+\([A-Z]{1,5}\))?/
            },
            weightMultipliers: {
                hasStockLink: 1.5,
                inHeadline: 1.4,
                inFirstParagraph: 1.3,
                hasTickerTag: 1.4
            }
        });
    }

    async analyzeDOMContext(element, site, options = {}) {
        const startTime = performance.now();
        
        try {
            // Validate inputs
            if (!element || !site) {
                throw new Error('Invalid parameters for DOM analysis');
            }
            
            // Get site profile
            const profile = this.siteProfiles.get(site);
            if (!profile) {
                console.warn(`No profile for site: ${site}, using default`);
                return this.getDefaultAnalysis();
            }
            
            // Check cache
            const cacheKey = this.generateCacheKey(element, site);
            const cached = this.checkCache(cacheKey);
            if (cached) return cached;
            
            // Perform analysis with timeout protection
            const analysis = await this.performAnalysis(element, profile, options);
            
            // Cache results
            this.cacheAnalysis(cacheKey, analysis);
            
            // Check performance
            const elapsed = performance.now() - startTime;
            if (elapsed > this.maxAnalysisTime) {
                console.warn(`DOM analysis took ${elapsed}ms, exceeding limit`);
            }
            
            return analysis;
            
        } catch (error) {
            console.error('DOM analysis error:', error);
            return this.getDefaultAnalysis();
        }
    }

    async performAnalysis(element, profile, options) {
        const analysis = {
            structuralWeight: 0,
            contextClues: [],
            metadata: {},
            confidence: 0,
            position: null
        };
        
        // Determine element's structural position
        analysis.position = this.determinePosition(element, profile);
        analysis.structuralWeight = this.calculateStructuralWeight(analysis.position);
        
        // Extract context clues
        analysis.contextClues = this.extractContextClues(element, profile);
        
        // Analyze surrounding elements
        const surroundingContext = this.analyzeSurroundings(element, profile);
        analysis.contextClues.push(...surroundingContext);
        
        // Extract metadata
        analysis.metadata = this.extractMetadata(element, profile);
        
        // Calculate final confidence based on all factors
        analysis.confidence = this.calculateDOMConfidence(analysis, profile);
        
        return analysis;
    }

    determinePosition(element, profile) {
        // Check if element is in specific structural positions
        const positions = [];
        
        // Check headline positions
        if (element.tagName === 'H1' || element.closest('h1')) {
            positions.push('h1');
        } else if (element.tagName === 'H2' || element.closest('h2')) {
            positions.push('h2');
        } else if (element.tagName === 'H3' || element.closest('h3')) {
            positions.push('h3');
        }
        
        // Check article structure
        for (const [key, selector] of Object.entries(profile.selectors)) {
            if (element.closest(selector)) {
                positions.push(key);
            }
        }
        
        // Special position checks
        if (this.isInFirstParagraph(element)) {
            positions.push('firstParagraph');
        }
        
        if (this.isInQuote(element)) {
            positions.push('quote');
        }
        
        return positions;
    }

    calculateStructuralWeight(positions) {
        let maxWeight = 0;
        
        for (const pos of positions) {
            const weight = this.positionWeights[pos] || 0.5;
            maxWeight = Math.max(maxWeight, weight);
        }
        
        return maxWeight;
    }

    extractContextClues(element, profile) {
        const clues = [];
        
        // Check for pattern matches
        for (const [patternName, pattern] of Object.entries(profile.patterns)) {
            const text = element.textContent || '';
            const matches = text.match(pattern);
            
            if (matches) {
                clues.push({
                    type: patternName,
                    value: matches[1] || matches[0],
                    confidence: 0.9
                });
            }
        }
        
        // Check for specific attributes
        const dataSymbol = element.getAttribute('data-symbol');
        if (dataSymbol) {
            clues.push({
                type: 'dataAttribute',
                value: dataSymbol,
                confidence: 0.95
            });
        }
        
        // Check href for company information
        const href = element.getAttribute('href');
        if (href) {
            for (const [patternName, pattern] of Object.entries(profile.patterns)) {
                const matches = href.match(pattern);
                if (matches) {
                    clues.push({
                        type: `href_${patternName}`,
                        value: matches[1],
                        confidence: 0.85
                    });
                }
            }
        }
        
        return clues;
    }

    analyzeSurroundings(element, profile) {
        const clues = [];
        const maxDistance = 3; // Check up to 3 elements away
        
        // Check parent elements
        let current = element.parentElement;
        let distance = 1;
        
        while (current && distance <= maxDistance) {
            const parentClues = this.extractContextClues(current, profile);
            parentClues.forEach(clue => {
                clue.distance = distance;
                clue.confidence *= (1 - distance * 0.1); // Reduce confidence with distance
            });
            clues.push(...parentClues);
            
            current = current.parentElement;
            distance++;
        }
        
        // Check siblings
        const siblings = Array.from(element.parentElement?.children || []);
        const elementIndex = siblings.indexOf(element);
        
        for (let i = Math.max(0, elementIndex - 2); i <= Math.min(siblings.length - 1, elementIndex + 2); i++) {
            if (i === elementIndex) continue;
            
            const sibling = siblings[i];
            const siblingClues = this.extractContextClues(sibling, profile);
            siblingClues.forEach(clue => {
                clue.distance = Math.abs(i - elementIndex);
                clue.confidence *= 0.7; // Siblings have lower weight than parents
            });
            clues.push(...siblingClues);
        }
        
        return clues;
    }

    extractMetadata(element, profile) {
        const metadata = {};
        
        // Extract publish date if available
        const timeElement = element.closest('article')?.querySelector('time');
        if (timeElement) {
            metadata.publishDate = timeElement.getAttribute('datetime') || timeElement.textContent;
        }
        
        // Extract author if available
        const authorSelector = profile.selectors.metadata;
        if (authorSelector) {
            const authorElement = element.closest('article')?.querySelector(authorSelector);
            if (authorElement) {
                metadata.author = authorElement.textContent.trim();
            }
        }
        
        // Extract section/category
        const sectionElement = element.closest('[data-section], .section');
        if (sectionElement) {
            metadata.section = sectionElement.getAttribute('data-section') || 
                              sectionElement.className.match(/section-(\w+)/)?.[1];
        }
        
        return metadata;
    }

    calculateDOMConfidence(analysis, profile) {
        let confidence = analysis.structuralWeight;
        
        // Apply multipliers based on context clues
        const multipliers = profile.weightMultipliers;
        
        // Check position-based multipliers
        if (analysis.position.includes('h1') && multipliers.inHeadline) {
            confidence *= multipliers.inHeadline;
        }
        
        if (analysis.position.includes('firstParagraph') && multipliers.inFirstParagraph) {
            confidence *= multipliers.inFirstParagraph;
        }
        
        // Check context clue multipliers
        analysis.contextClues.forEach(clue => {
            if (clue.type === 'dataAttribute' && multipliers.hasDataSymbol) {
                confidence *= multipliers.hasDataSymbol;
            } else if (clue.type.includes('ticker') && multipliers.hasTicker) {
                confidence *= multipliers.hasTicker;
            } else if (clue.type.includes('company') && multipliers.hasCompanyTag) {
                confidence *= multipliers.hasCompanyTag;
            }
        });
        
        // Normalize confidence to 0-1 range
        return Math.min(confidence, 1.0);
    }

    isInFirstParagraph(element) {
        const article = element.closest('article');
        if (!article) return false;
        
        const paragraphs = article.querySelectorAll('p');
        if (paragraphs.length === 0) return false;
        
        return paragraphs[0].contains(element);
    }

    isInQuote(element) {
        return element.closest('blockquote, q, .quote') !== null ||
               element.textContent.match(/[""].*[""]/) !== null;
    }

    generateCacheKey(element, site) {
        // Create a unique key based on element and site
        const elementPath = this.getElementPath(element);
        return `${site}_${elementPath}_${element.textContent.slice(0, 50)}`;
    }

    getElementPath(element) {
        const path = [];
        let current = element;
        
        while (current && current.tagName) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
                selector += `#${current.id}`;
            } else if (current.className) {
                selector += `.${current.className.split(' ')[0]}`;
            }
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join('>');
    }

    checkCache(key) {
        const cached = this.analysisCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        if (cached) {
            this.analysisCache.delete(key);
        }
        return null;
    }

    cacheAnalysis(key, analysis) {
        // Limit cache size
        if (this.analysisCache.size > 500) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }
        
        this.analysisCache.set(key, {
            data: analysis,
            timestamp: Date.now()
        });
    }

    getDefaultAnalysis() {
        return {
            structuralWeight: 0.5,
            contextClues: [],
            metadata: {},
            confidence: 0.5,
            position: ['unknown']
        };
    }

    clearCache() {
        this.analysisCache.clear();
        console.log('DOM analysis cache cleared');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DOMInterpreter = DOMInterpreter;
}


console.log('🔍 DOM Interpreter ready - Site-aware structural analysis enabled');
