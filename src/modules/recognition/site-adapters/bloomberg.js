// Corporate Genome: Bloomberg Adapter - Professional financial news entity detection
console.log('Corporate Genome: Bloomberg Adapter initializing...');

class BloombergAdapter extends BaseSiteAdapter {
    constructor() {
        super('bloomberg', {
            selectors: [
                '.headline__text',
                '.article-headline',
                '.ticker',
                '.stock-ticker',
                '.company-tag',
                '[data-type="company"]',
                '.body-content p',
                '.article-body__content p',
                '.quote-data',
                '.market-summary',
                'a[href*="/quote/"]',
                '.related-ticker'
            ],
            patterns: {
                tickerFormat: /\b([A-Z]{1,5})(?:\s+(?:US|LN|HK|JP|GR|FP))(?:\s+Equity)?\b/,
                bloombergTicker: /([A-Z]{1,5}):([A-Z]{2})/,
                companyMention: /\b([A-Z][a-zA-Z\s\&\.]{2,50})\s+(?:said|announced|reported|posted)/,
                isinPattern: /\b([A-Z]{2}[A-Z0-9]{10})\b/
            }
        });
        
        // Bloomberg-specific features
        this.exchangeMap = {
            'US': 'NYSE/NASDAQ',
            'LN': 'LSE',
            'HK': 'HKEX',
            'JP': 'TSE',
            'GR': 'XETRA',
            'FP': 'EPA'
        };
        
        this.articleContext = null;
    }

    async onInitialize() {
        // Detect article context
        this.detectArticleContext();
        
        // Set up Bloomberg-specific features
        this.initializeBloombergEnhancements();
    }

    detectArticleContext() {
        const articleMeta = document.querySelector('meta[property="og:title"]');
        const articleSection = document.querySelector('[data-section]');
        
        this.articleContext = {
            title: articleMeta?.content || document.title,
            section: articleSection?.getAttribute('data-section') || 'general',
            isMarketNews: window.location.pathname.includes('/markets/'),
            isCompanyNews: window.location.pathname.includes('/company/'),
            isOpinion: window.location.pathname.includes('/opinion/')
        };
    }

    findCandidateElements(rootElement) {
        const elements = super.findCandidateElements(rootElement);
        
        // Add Bloomberg Terminal-style elements
        const terminalSelectors = [
            '.terminal-ticker',
            '.bbg-ticker',
            '[class*="ticker-"]',
            '.market-data-row',
            '.securities-table td'
        ];
        
        for (const selector of terminalSelectors) {
            try {
                const found = rootElement.querySelectorAll(selector);
                elements.push(...found);
            } catch (error) {
                console.warn(`Bloomberg selector error:`, error);
            }
        }
        
        // Filter and prioritize based on Bloomberg's structure
        return this.filterBloombergElements(elements);
    }

    filterBloombergElements(elements) {
        // Remove elements from ads and promotional content
        return elements.filter(el => {
            const isAd = el.closest('.ad-container, .promotion, [data-ad-placeholder]');
            const isNav = el.closest('nav, .navigation, .menu');
            return !isAd && !isNav;
        }).sort((a, b) => {
            // Prioritize elements with ticker classes
            const aHasTicker = a.className.includes('ticker') || a.hasAttribute('data-ticker');
            const bHasTicker = b.className.includes('ticker') || b.hasAttribute('data-ticker');
            if (aHasTicker && !bHasTicker) return -1;
            if (!aHasTicker && bHasTicker) return 1;
            
            // Prioritize headline elements
            const aIsHeadline = a.closest('.headline, .article-headline');
            const bIsHeadline = b.closest('.headline, .article-headline');
            if (aIsHeadline && !bIsHeadline) return -1;
            if (!aIsHeadline && bIsHeadline) return 1;
            
            return 0;
        });
    }

    async extractEntity(element, sandbox) {
        // Check for Bloomberg-specific ticker formats
        const bloombergTicker = this.extractBloombergTicker(element);
        if (bloombergTicker) {
            return this.createBloombergTickerEntity(bloombergTicker, element);
        }
        
        // Use base extraction with enhancements
        const entity = await super.extractEntity(element, sandbox);
        
        if (entity) {
            this.enhanceWithBloombergData(entity, element);
        }
        
        return entity;
    }

    extractBloombergTicker(element) {
        const text = element.textContent;
        
        // Check for Bloomberg ticker format (e.g., "AAPL US Equity")
        const fullMatch = text.match(this.config.patterns.tickerFormat);
        if (fullMatch) {
            return {
                ticker: fullMatch[1],
                exchange: fullMatch[2] || 'US',
                assetClass: fullMatch[3] || 'Equity'
            };
        }
        
        // Check for short format (e.g., "AAPL:US")
        const shortMatch = text.match(this.config.patterns.bloombergTicker);
        if (shortMatch) {
            return {
                ticker: shortMatch[1],
                exchange: shortMatch[2],
                assetClass: 'Equity'
            };
        }
        
        // Check for ISIN
        const isinMatch = text.match(this.config.patterns.isinPattern);
        if (isinMatch) {
            return {
                isin: isinMatch[1],
                type: 'isin'
            };
        }
        
        return null;
    }

    async createBloombergTickerEntity(tickerData, element) {
        const ticker = tickerData.ticker || tickerData.isin;
        const displayText = tickerData.isin ? 
            tickerData.isin : 
            `${tickerData.ticker} ${tickerData.exchange} ${tickerData.assetClass}`;
        
        const confidence = await this.confidenceScorer.calculateScore({
            patternMatch: { 
                confidence: 0.95, 
                type: tickerData.isin ? 'isin' : 'bloomberg_ticker',
                entity: ticker 
            },
            domContext: { 
                confidence: 0.9, 
                position: ['ticker'],
                contextClues: [{ type: 'bloomberg_format', confidence: 0.95 }]
            },
            nlpConfidence: { 
                confidence: 0.9, 
                entities: [{ text: ticker, type: 'ticker', confidence: 0.95 }] 
            },
            entity: { text: ticker, type: 'ticker' }
        }, { site: 'bloomberg' });
        
        return {
            text: displayText,
            normalized: ticker.toUpperCase(),
            type: tickerData.isin ? 'isin' : 'ticker',
            element: element,
            position: {
                x: element.offsetLeft,
                y: element.offsetTop
            },
            context: {
                bloomberg: {
                    exchange: tickerData.exchange,
                    exchangeName: this.exchangeMap[tickerData.exchange],
                    assetClass: tickerData.assetClass,
                    format: 'bloomberg_terminal'
                },
                article: this.articleContext
            },
            confidence: confidence,
            source: 'bloomberg',
            timestamp: Date.now()
        };
    }

    enhanceWithBloombergData(entity, element) {
        // Add Bloomberg-specific context
        entity.context.bloomberg = {
            inHeadline: element.closest('.headline, .article-headline') !== null,
            inLead: this.isInArticleLead(element),
            hasCompanyTag: element.classList.contains('company-tag') || 
                          element.hasAttribute('data-type'),
            articleSection: this.articleContext.section,
            isMarketData: element.closest('.market-data, .quote-data') !== null
        };
        
        // Boost confidence for Bloomberg-tagged companies
        if (entity.context.bloomberg.hasCompanyTag) {
            entity.confidence.score *= 1.15;
            entity.confidence.score = Math.min(entity.confidence.score, 1.0);
        }
        
        // Add exchange information if detected
        const exchangeInfo = this.detectExchangeContext(element);
        if (exchangeInfo) {
            entity.context.bloomberg.suggestedExchange = exchangeInfo;
        }
    }

    isInArticleLead(element) {
        const article = element.closest('article, .article-wrap');
        if (!article) return false;
        
        const paragraphs = article.querySelectorAll('.body-content p, .article-body__content p');
        if (paragraphs.length === 0) return false;
        
        // Check if element is in first 3 paragraphs (lead)
        for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
            if (paragraphs[i].contains(element)) {
                return true;
            }
        }
        
        return false;
    }

    detectExchangeContext(element) {
        // Look for exchange indicators nearby
        const text = element.textContent + ' ' + 
                    element.parentElement?.textContent || '';
        
        for (const [code, name] of Object.entries(this.exchangeMap)) {
            if (text.includes(code) || text.includes(name)) {
                return { code, name };
            }
        }
        
        // Default to US for Bloomberg.com
        return { code: 'US', name: 'NYSE/NASDAQ' };
    }

    initializeBloombergEnhancements() {
        // Watch for Bloomberg's dynamic data updates
        this.observeDataUpdates();
        
        // Enhance hover interactions
        this.setupHoverEnhancements();
    }

    observeDataUpdates() {
        // Bloomberg often updates data dynamically
        const dataObserver = new MutationObserver((mutations) => {
            const hasDataUpdate = mutations.some(m => 
                m.target.className?.includes('data') ||
                m.target.hasAttribute('data-ticker')
            );
            
            if (hasDataUpdate) {
                console.log('Bloomberg data update detected');
                // Could trigger targeted re-analysis
            }
        });
        
        const dataContainers = document.querySelectorAll('.market-data, .quote-data, [data-live]');
        dataContainers.forEach(container => {
            dataObserver.observe(container, {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-value', 'data-ticker']
            });
        });
    }

    setupHoverEnhancements() {
        // Bloomberg often shows additional data on hover
        document.addEventListener('mouseenter', (e) => {
            if (e.target.classList.contains('ticker') || 
                e.target.hasAttribute('data-ticker')) {
                this.enhanceTickerHover(e.target);
            }
        }, true);
    }

    enhanceTickerHover(element) {
        // Add Bloomberg-style tooltip data
        const ticker = element.textContent.trim();
        element.title = `${ticker} - Click for full quote on Bloomberg Terminal`;
    }

    onCleanup() {
        this.articleContext = null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BloombergAdapter = BloombergAdapter;
}

console.log('📊 Bloomberg Adapter ready - Professional financial news entity detection');