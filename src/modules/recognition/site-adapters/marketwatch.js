// Corporate Genome: MarketWatch Adapter - Real-time market news entity detection
console.log('Corporate Genome: MarketWatch Adapter initializing...');

class MarketWatchAdapter extends BaseSiteAdapter {
    constructor() {
        super('marketwatch', {
            selectors: [
                '.article__headline',
                '.ticker',
                '.company-ticker',
                'a[href*="/investing/stock/"]',
                '.article__body p',
                '.paywall p',
                'bg-quote',
                '.markets__ticker',
                '.quote__ticker',
                '.trending-tickers a',
                '.watchlist__symbol',
                '.headline--link',
                '.latestNews__headline'
            ],
            patterns: {
                tickerInLink: /\/investing\/stock\/([A-Z]{1,5})/,
                tickerWithExchange: /\(([A-Z]{1,5})(?::([A-Z]+))?\)/,
                companyFormat: /([A-Z][a-zA-Z\s\&\.]{2,50})(?:\s+\(([A-Z]{1,5})\))?/,
                percentChange: /([A-Z]{1,5})\s+[+-]?\d+\.?\d*%/
            }
        });
        
        // MarketWatch-specific state
        this.watchlistTickers = new Set();
        this.marketSummaryData = new Map();
        this.isRealTimePage = false;
    }

    async onInitialize() {
        // Detect page type
        this.detectPageType();
        
        // Initialize MarketWatch-specific features
        this.initializeMarketWatchFeatures();
        
        // Extract watchlist if present
        this.extractWatchlist();
    }

    detectPageType() {
        const path = window.location.pathname;
        this.pageType = {
            isArticle: path.includes('/story/') || path.includes('/articles/'),
            isQuote: path.includes('/investing/stock/'),
            isMarkets: path.includes('/markets'),
            isWatchlist: path.includes('/watchlist'),
            isHome: path === '/' || path === '/latest-news'
        };
        
        this.isRealTimePage = this.pageType.isQuote || this.pageType.isMarkets;
    }

    findCandidateElements(rootElement) {
        const elements = super.findCandidateElements(rootElement);
        
        // Add MarketWatch-specific dynamic content
        const dynamicSelectors = [
            '.element--intraday',
            '.markets-data td',
            '.screener__cell',
            '[data-ticker]',
            '.movers__item',
            '.futures__symbol'
        ];
        
        for (const selector of dynamicSelectors) {
            try {
                const found = rootElement.querySelectorAll(selector);
                elements.push(...found);
            } catch (error) {
                console.warn(`MarketWatch selector error:`, error);
            }
        }
        
        return this.prioritizeMarketWatchElements(elements);
    }

    prioritizeMarketWatchElements(elements) {
        return elements.filter(el => {
            // Filter out navigation and UI elements
            const isUI = el.closest('.navigation, .header, .footer, .ad-container');
            return !isUI;
        }).sort((a, b) => {
            // Prioritize real-time data elements
            const aIsRealTime = a.closest('[data-ticker], .element--intraday, bg-quote');
            const bIsRealTime = b.closest('[data-ticker], .element--intraday, bg-quote');
            if (aIsRealTime && !bIsRealTime) return -1;
            if (!aIsRealTime && bIsRealTime) return 1;
            
            // Prioritize watchlist items
            const aInWatchlist = a.closest('.watchlist');
            const bInWatchlist = b.closest('.watchlist');
            if (aInWatchlist && !bInWatchlist) return -1;
            if (!aInWatchlist && bInWatchlist) return 1;
            
            return 0;
        });
    }

    async extractEntity(element, sandbox) {
        // Check for MarketWatch-specific ticker elements
        const mwTicker = this.extractMarketWatchTicker(element);
        if (mwTicker) {
            return this.createMarketWatchTickerEntity(mwTicker, element);
        }
        
        // Check for custom web components
        if (element.tagName === 'BG-QUOTE') {
            return this.extractFromBgQuote(element);
        }
        
        // Use base extraction
        const entity = await super.extractEntity(element, sandbox);
        
        if (entity) {
            this.enhanceWithMarketWatchData(entity, element);
        }
        
        return entity;
    }

    extractMarketWatchTicker(element) {
        // Check data attributes
        const dataTicker = element.getAttribute('data-ticker') || 
                          element.getAttribute('data-symbol');
        if (dataTicker) {
            return { ticker: dataTicker, source: 'data-attribute' };
        }
        
        // Check href for stock pages
        const href = element.getAttribute('href');
        if (href) {
            const match = href.match(this.config.patterns.tickerInLink);
            if (match) {
                return { ticker: match[1], source: 'href' };
            }
        }
        
        // Check text for ticker patterns
        const text = element.textContent;
        const tickerMatch = text.match(this.config.patterns.tickerWithExchange);
        if (tickerMatch) {
            return {
                ticker: tickerMatch[1],
                exchange: tickerMatch[2],
                source: 'text-pattern'
            };
        }
        
        // Check for percentage change pattern
        const percentMatch = text.match(this.config.patterns.percentChange);
        if (percentMatch) {
            return { ticker: percentMatch[1], source: 'percent-change' };
        }
        
        return null;
    }

    async createMarketWatchTickerEntity(tickerData, element) {
        const confidence = await this.confidenceScorer.calculateScore({
            patternMatch: { 
                confidence: tickerData.source === 'data-attribute' ? 0.98 : 0.9,
                type: 'ticker',
                entity: tickerData.ticker 
            },
            domContext: { 
                confidence: 0.85,
                position: ['ticker'],
                contextClues: [{ 
                    type: 'marketwatch_ticker', 
                    value: tickerData.source,
                    confidence: 0.9 
                }]
            },
            nlpConfidence: { 
                confidence: 0.9,
                entities: [{ 
                    text: tickerData.ticker, 
                    type: 'ticker', 
                    confidence: 0.95 
                }] 
            },
            entity: { text: tickerData.ticker, type: 'ticker' }
        }, { site: 'marketwatch' });
        
        // Get real-time data if available
        const realtimeData = await this.fetchRealtimeData(tickerData.ticker);
        
        return {
            text: tickerData.ticker,
            normalized: tickerData.ticker.toUpperCase(),
            type: 'ticker',
            element: element,
            position: {
                x: element.offsetLeft,
                y: element.offsetTop
            },
            context: {
                marketwatch: {
                    source: tickerData.source,
                    exchange: tickerData.exchange,
                    pageType: this.pageType,
                    isWatchlisted: this.watchlistTickers.has(tickerData.ticker),
                    realtimeData: realtimeData
                }
            },
            confidence: confidence,
            source: 'marketwatch',
            timestamp: Date.now()
        };
    }

    async extractFromBgQuote(element) {
        // MarketWatch's custom web component for quotes
        const symbol = element.getAttribute('symbol') || 
                      element.getAttribute('channel');
        
        if (!symbol) return null;
        
        const field = element.getAttribute('field') || 'name';
        const value = element.textContent;
        
        const confidence = await this.confidenceScorer.calculateScore({
            patternMatch: { confidence: 0.98, type: 'ticker', entity: symbol },
            domContext: { confidence: 0.95, position: ['bg-quote'] },
            nlpConfidence: { confidence: 0.95, entities: [{ text: symbol, type: 'ticker', confidence: 0.98 }] },
            entity: { text: symbol, type: 'ticker' }
        }, { site: 'marketwatch' });
        
        return {
            text: symbol,
            normalized: symbol.toUpperCase(),
            type: 'ticker',
            element: element,
            position: {
                x: element.offsetLeft,
                y: element.offsetTop
            },
            context: {
                marketwatch: {
                    component: 'bg-quote',
                    field: field,
                    value: value,
                    isRealtime: true
                }
            },
            confidence: confidence,
            source: 'marketwatch',
            timestamp: Date.now()
        };
    }

    enhanceWithMarketWatchData(entity, element) {
        // Add MarketWatch-specific context
        entity.context.marketwatch = {
            inArticle: element.closest('.article__body, .paywall') !== null,
            inHeadline: element.closest('.article__headline, .headline--link') !== null,
            inMarketData: element.closest('.markets-data, .markets__group') !== null,
            inWatchlist: element.closest('.watchlist') !== null,
            inTrending: element.closest('.trending-tickers') !== null,
            pageType: this.pageType
        };
        
        // Boost confidence for certain contexts
        if (entity.context.marketwatch.inWatchlist || 
            entity.context.marketwatch.inMarketData) {
            entity.confidence.score *= 1.1;
            entity.confidence.score = Math.min(entity.confidence.score, 1.0);
        }
        
        // Add market summary context if available
        if (this.marketSummaryData.has(entity.normalized)) {
            entity.context.marketwatch.marketSummary = 
                this.marketSummaryData.get(entity.normalized);
        }
    }

    extractWatchlist() {
        // Extract tickers from watchlist if present
        const watchlistItems = document.querySelectorAll('.watchlist__symbol');
        watchlistItems.forEach(item => {
            const ticker = item.textContent.trim();
            if (ticker) {
                this.watchlistTickers.add(ticker.toUpperCase());
            }
        });
        
        if (this.watchlistTickers.size > 0) {
            console.log(`Found ${this.watchlistTickers.size} tickers in watchlist`);
        }
    }

    async fetchRealtimeData(ticker) {
        // Simulate fetching real-time data (would connect to actual API)
        if (!this.isRealTimePage) return null;
        
        // Check if data is already on page
        const quoteElement = document.querySelector(`[data-ticker="${ticker}"]`);
        if (quoteElement) {
            return {
                price: quoteElement.getAttribute('data-last-price'),
                change: quoteElement.getAttribute('data-change'),
                changePercent: quoteElement.getAttribute('data-change-percent'),
                volume: quoteElement.getAttribute('data-volume')
            };
        }
        
        return null;
    }

    initializeMarketWatchFeatures() {
        // Set up real-time data observers
        if (this.isRealTimePage) {
            this.observeRealtimeUpdates();
        }
        
        // Extract market summary data
        this.extractMarketSummary();
    }

    observeRealtimeUpdates() {
        // Watch for MarketWatch's real-time updates
        const rtObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.hasAttribute('data-ticker') ||
                    mutation.target.tagName === 'BG-QUOTE') {
                    this.handleRealtimeUpdate(mutation.target);
                }
            });
        });
        
        // Observe elements that typically contain real-time data
        const rtElements = document.querySelectorAll('[data-ticker], bg-quote, .element--intraday');
        rtElements.forEach(el => {
            rtObserver.observe(el, {
                attributes: true,
                attributeFilter: ['data-last-price', 'data-change', 'data-change-percent'],
                characterData: true,
                subtree: true
            });
        });
    }

    handleRealtimeUpdate(element) {
        const ticker = element.getAttribute('data-ticker') || 
                      element.getAttribute('symbol');
        if (ticker) {
            console.log(`Real-time update for ${ticker}`);
            // Could trigger UI updates or re-analysis
        }
    }

    extractMarketSummary() {
        // Extract summary data from market overview sections
        const summaryItems = document.querySelectorAll('.markets__item, .market-summary__item');
        summaryItems.forEach(item => {
            const ticker = item.querySelector('.ticker, [data-ticker]')?.textContent?.trim();
            const data = {
                price: item.querySelector('.price')?.textContent,
                change: item.querySelector('.change')?.textContent,
                changePercent: item.querySelector('.percent')?.textContent
            };
            
            if (ticker && data.price) {
                this.marketSummaryData.set(ticker.toUpperCase(), data);
            }
        });
    }

    getMarketContext() {
        return {
            watchlist: Array.from(this.watchlistTickers),
            marketSummary: Object.fromEntries(this.marketSummaryData),
            pageType: this.pageType,
            isRealtime: this.isRealTimePage
        };
    }

    onCleanup() {
        this.watchlistTickers.clear();
        this.marketSummaryData.clear();
        this.isRealTimePage = false;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MarketWatchAdapter = MarketWatchAdapter;
}

console.log('📰 MarketWatch Adapter ready - Real-time market news entity detection');