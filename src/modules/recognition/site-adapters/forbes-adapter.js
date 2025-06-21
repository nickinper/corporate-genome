// Corporate Genome: Forbes Site Adapter
console.log('Corporate Genome: Forbes Site Adapter initializing...');

class ForbesAdapter extends (window.BaseSiteAdapter || class {}) {
    constructor() {
        super('forbes', {
            selectors: {
                companyName: [
                    'h1.listuser-header__name',
                    'h3.listuser-block__title',
                    '.company-name',
                    '.organization-title',
                    '[data-ga-track*="company"]',
                    '.profile-name',
                    '.Forbes2000-profile-name'
                ],
                ticker: [
                    '.company-ticker',
                    '.ticker-symbol',
                    '[data-ticker]'
                ],
                context: [
                    '.profile-stats',
                    '.company-info',
                    '.article-body'
                ]
            },
            patterns: {
                ticker: /\(([A-Z]{1,5}:[A-Z]{1,5})\)/,
                ranking: /#(\d+)\s+(?:on|in)/i,
                revenue: /\$[\d.]+[BMT]/
            }
        });
        
        console.log('✅ ForbesAdapter initialized with Forbes-specific patterns');
    }

    // Override findCandidateElements for Forbes-specific selectors
    findCandidateElements(rootElement) {
        // For Forbes company pages, prioritize specific elements
        if (window.location.pathname.includes('/companies/')) {
            console.log('Forbes company page detected, using targeted selectors');
            
            // First try to find the company name in the header
            const profileName = document.querySelector('h1.profile-name, h1.listuser-header__name, .profile-heading h1');
            if (profileName && profileName.textContent.trim()) {
                console.log('Found profile name element:', profileName);
                return [profileName];
            }
        }
        
        const elements = [];
        
        // Use Forbes-specific selectors from config
        const selectors = [
            ...this.config.selectors.companyName,
            ...this.config.selectors.ticker,
            ...this.config.selectors.context,
            // Also include base selectors
            'h1', 'h2', 'h3', 'p', 'span', 'a',
            '[data-symbol]', '[data-ticker]', '.company-name'
        ];
        
        if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
            console.warn('Invalid root element for findCandidateElements:', rootElement);
            return elements;
        }
        
        // Filter out large container elements
        for (const selector of selectors) {
            try {
                const found = rootElement.querySelectorAll(selector);
                for (const el of found) {
                    // Skip elements that are too large (likely containers)
                    if (el.offsetHeight < 300 && el.offsetWidth < 1000) {
                        elements.push(el);
                    }
                }
            } catch (error) {
                console.warn(`Invalid selector ${selector}:`, error);
            }
        }
        
        return elements;
    }
    
    // Override extractEntity to add Forbes-specific logic
    async extractEntity(element, sandbox) {
        console.log(`Forbes extractEntity called for: "${element.textContent?.substring(0, 50)}..."`);
        
        // For the profile name, create a simple entity directly
        if (element.classList.contains('listuser-header__name')) {
            const text = element.textContent.trim();
            console.log(`📍 Direct extraction for profile name: "${text}"`);
            
            // Use enhanced NLP processor if available
            let enhancedData = null;
            if (this.nlpProcessor && this.nlpProcessor.extractEntities) {
                const nlpResult = await this.nlpProcessor.extractEntities(text, { site: 'forbes' });
                if (nlpResult.entities && nlpResult.entities.length > 0) {
                    enhancedData = nlpResult.entities[0];
                }
            }
            
            return {
                text: text,
                normalized: enhancedData?.normalized || text,
                baseName: enhancedData?.baseName || text,
                type: 'company',
                element: element,
                position: {
                    x: element.offsetLeft,
                    y: element.offsetTop
                },
                context: {
                    forbes: {
                        pageType: 'company-profile',
                        isProfileHeader: true
                    },
                    ...(enhancedData?.context || {})
                },
                confidence: {
                    score: 0.95,
                    level: 'high',
                    factors: {
                        isProfileHeader: true,
                        elementClass: 'listuser-header__name',
                        knowledgeBase: enhancedData?.knowledgeBase ? true : false
                    }
                },
                knowledgeBase: enhancedData?.knowledgeBase || null,
                source: this.siteName,
                timestamp: Date.now()
            };
        }
        
        // Otherwise use parent extraction
        const entity = await super.extractEntity(element, sandbox);
        if (!entity) return null;
        
        // Add Forbes-specific context
        const urlPath = window.location.pathname;
        if (urlPath.includes('/companies/')) {
            entity.context.forbes = {
                pageType: 'company-profile',
                companySlug: urlPath.split('/companies/')[1]?.split('/')[0]
            };
        } else if (urlPath.includes('/lists/')) {
            entity.context.forbes = {
                pageType: 'list'
            };
        }
        
        // Boost confidence for Forbes-specific indicators
        if (element.closest('.listuser-header') || 
            element.closest('.profile-header')) {
            entity.confidence.score = Math.min(entity.confidence.score + 0.2, 1.0);
        }
        
        if (element.classList.contains('listuser-block__title')) {
            entity.confidence.score = Math.min(entity.confidence.score + 0.1, 1.0);
        }
        
        return entity;
    }
}

// Register the adapter
if (typeof window !== 'undefined') {
    window.ForbesAdapter = ForbesAdapter;
}

console.log('🎯 Forbes Site Adapter ready - Specialized patterns for Forbes.com');