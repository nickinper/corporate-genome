// Corporate Genome: Yahoo Finance Adapter - Specialized entity detection
console.log('Corporate Genome: Yahoo Finance Adapter initializing...');

class YahooFinanceAdapter extends BaseSiteAdapter {
    constructor() {
        super('yahoo', {
            selectors: [
                '[data-symbol]',
                '.company-name',
                'h1[data-symbol]',
                '.quote-header-section h1',
                '.ticker-symbol',
                '.news-item h3',
                '.js-stream-content h3',
                'a[href*="/quote/"]',
                '.market-summary-item',
                '.trending-ticker'
            ],
            patterns: {
                tickerInUrl: /\/quote\/([A-Z]{1,5})/,
                symbolAttribute: /data-symbol="([A-Z]{1,5})"/,
                priceChange: /([A-Z]{1,5})\s*[+-]\d+\.\d+%/
            }
        });
        
        // Yahoo-specific state
        this.primaryTicker = null;
        this.relatedTickers = new Set();
    }

    async onInitialize() {
        // Extract primary ticker from URL if on quote page
        const urlMatch = window.location.pathname.match(this.config.patterns.tickerInUrl);
        if (urlMatch) {
            this.primaryTicker = urlMatch[1];
            console.log(`Primary ticker detected: ${this.primaryTicker}`);
        }
        
        // Set up Yahoo-specific observers
        this.observeQuoteUpdates();
    }

    findCandidateElements(rootElement) {
        const elements = super.findCandidateElements(rootElement);
        
        // Add Yahoo-specific dynamic selectors
        const additionalSelectors = [
            '.quote-link',
            '[data-test="quote-links"]',
            '.asset-profile h3',
            '.recommendation-list-item'
        ];
        
        for (const selector of additionalSelectors) {
            try {
                const found = rootElement.querySelectorAll(selector);
                elements.push(...found);
            } catch (error) {
                console.warn(`Yahoo selector error:`, error);
            }
        }
        
        return this.prioritizeElements(elements);
    }

    prioritizeElements(elements) {
        // Sort elements by relevance on Yahoo Finance
        return elements.sort((a, b) => {
            // Prioritize elements with data-symbol
            const aHasSymbol = a.hasAttribute('data-symbol');
            const bHasSymbol = b.hasAttribute('data-symbol');
            if (aHasSymbol && !bHasSymbol) return -1;
            if (!aHasSymbol && bHasSymbol) return 1;
            
            // Prioritize quote header elements
            const aInHeader = a.closest('.quote-header-section') !== null;
            const bInHeader = b.closest('.quote-header-section') !== null;
            if (aInHeader && !bInHeader) return -1;
            if (!aInHeader && bInHeader) return 1;
            
            // Prioritize h1 elements
            if (a.tagName === 'H1' && b.tagName !== 'H1') return -1;
            if (a.tagName !== 'H1' && b.tagName === 'H1') return 1;
            
            return 0;
        });
    }

    async extractEntity(element, sandbox) {
        // First check for direct ticker symbol
        const ticker = this.extractTickerSymbol(element);
        if (ticker) {
            return this.createTickerEntity(ticker, element);
        }
        
        // Otherwise use base extraction
        const entity = await super.extractEntity(element, sandbox);
        
        // Enhance with Yahoo-specific data
        if (entity) {
            this.enhanceEntityWithYahooData(entity, element);
        }
        
        return entity;
    }

    extractTickerSymbol(element) {
        // Check data-symbol attribute
        const dataSymbol = element.getAttribute('data-symbol');
        if (dataSymbol) return dataSymbol;
        
        // Check href for quote pattern
        const href = element.getAttribute('href');
        if (href) {
            const match = href.match(this.config.patterns.tickerInUrl);
            if (match) return match[1];
        }
        
        // Check text content for price change pattern
        const text = element.textContent;
        const priceMatch = text.match(this.config.patterns.priceChange);
        if (priceMatch) return priceMatch[1];
        
        return null;
    }

    async createTickerEntity(ticker, element) {
        // Create high-confidence entity for direct ticker
        const confidence = await this.confidenceScorer.calculateScore({
            patternMatch: { confidence: 0.95, type: 'ticker', entity: ticker },
            domContext: { confidence: 0.9, position: ['ticker'] },
            nlpConfidence: { confidence: 0.95, entities: [{ text: ticker, type: 'ticker', confidence: 0.95 }] },
            entity: { text: ticker, type: 'ticker' }
        }, { site: 'yahoo' });
        
        return {
            text: ticker,
            normalized: ticker.toUpperCase(),
            type: 'ticker',
            element: element,
            position: {
                x: element.offsetLeft,
                y: element.offsetTop
            },
            context: {
                source: 'yahoo-direct',
                isPrimary: ticker === this.primaryTicker
            },
            confidence: confidence,
            source: 'yahoo',
            timestamp: Date.now()
        };
    }

    enhanceEntityWithYahooData(entity, element) {
        // Add Yahoo-specific context
        entity.context.yahoo = {
            isPrimaryTicker: entity.normalized === this.primaryTicker,
            inQuoteHeader: element.closest('.quote-header-section') !== null,
            inNewsFeed: element.closest('.js-stream-content') !== null,
            inTrendingSection: element.closest('.trending-list') !== null
        };
        
        // Track related tickers
        if (entity.type === 'ticker' && entity.normalized !== this.primaryTicker) {
            this.relatedTickers.add(entity.normalized);
        }
        
        // Boost confidence for primary ticker mentions
        if (entity.context.yahoo.isPrimaryTicker) {
            entity.confidence.score *= 1.1;
            entity.confidence.score = Math.min(entity.confidence.score, 1.0);
        }
    }

    observeQuoteUpdates() {
        // Watch for real-time price updates
        const priceObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.target.hasAttribute('data-field')) {
                    this.handlePriceUpdate(mutation.target);
                }
            }
        });
        
        const priceElements = document.querySelectorAll('[data-field]');
        priceElements.forEach(el => {
            priceObserver.observe(el, {
                childList: true,
                characterData: true,
                subtree: true
            });
        });
    }

    handlePriceUpdate(element) {
        // Extract company from price update context
        const symbol = element.closest('[data-symbol]')?.getAttribute('data-symbol');
        if (symbol) {
            console.log(`Price update for ${symbol}`);
            // Could trigger re-analysis of this specific symbol
        }
    }

    getRelatedCompanies() {
        return {
            primary: this.primaryTicker,
            related: Array.from(this.relatedTickers)
        };
    }

    onCleanup() {
        this.primaryTicker = null;
        this.relatedTickers.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.YahooFinanceAdapter = YahooFinanceAdapter;
}

console.log('📈 Yahoo Finance Adapter ready - Specialized financial entity detection');