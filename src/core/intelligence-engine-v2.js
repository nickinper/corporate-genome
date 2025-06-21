// Corporate Genome: Enhanced Intelligence Engine v2 - Multi-Site Entity Resolution
console.log('Corporate Genome: Enhanced Intelligence Engine v2 initializing...');

class EnhancedIntelligenceEngine {
    constructor() {
        // Core components - check if available in window first
        this.isolationMembrane = window.SiteIsolationMembrane ? new window.SiteIsolationMembrane() : null;
        this.nlpProcessor = window.SecureNLPProcessor ? new window.SecureNLPProcessor() : null;
        this.domInterpreter = window.DOMInterpreter ? new window.DOMInterpreter() : null;
        this.confidenceScorer = window.ConfidenceScorer ? new window.ConfidenceScorer() : null;
        
        // Site adapters
        this.siteAdapters = new Map();
        this.currentAdapter = null;
        
        // Global state
        this.detectedEntities = new Map();
        this.isActive = false;
        
        // Performance monitoring
        this.performanceMetrics = {
            totalDetections: 0,
            successRate: 0,
            averageConfidence: 0,
            siteMetrics: new Map()
        };
        
        // Throttling for performance
        this.lastProcessTime = 0;
        this.processThrottle = 100; // milliseconds
        
        // Enhanced UI management
        this.tooltipManager = window.EnhancedTooltipManager ? new window.EnhancedTooltipManager() : null;
        this.hoverHandler = null;
        this.lastMousePosition = { x: 0, y: 0 };
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced Intelligence Engine...');
            
            // Detect current site
            const siteInfo = this.detectCurrentSite();
            if (!siteInfo.supported) {
                console.log(`Site ${siteInfo.domain} not supported`);
                return false;
            }
            
            // Load appropriate adapter
            await this.loadSiteAdapter(siteInfo.site);
            
            // Initialize enhanced hover system
            if (this.currentAdapter) {
                this.initializeEnhancedHoverSystem();
            } else {
                console.warn('No adapter loaded, hover system not initialized');
                return false;
            }
            
            // Set up mutation observer for dynamic content
            this.observeDynamicContent();
            
            this.isActive = true;
            console.log('✅ Enhanced Intelligence Engine ready');
            
            // Do initial scan for entities
            await this.performInitialScan();
            
            return true;
            
        } catch (error) {
            console.error('Failed to initialize intelligence engine:', error);
            return false;
        }
    }

    detectCurrentSite() {
        const hostname = window.location.hostname;
        const supportedSites = {
            'www.forbes.com': 'forbes',
            'finance.yahoo.com': 'yahoo',
            'www.bloomberg.com': 'bloomberg',
            'www.marketwatch.com': 'marketwatch'
        };
        
        const site = supportedSites[hostname];
        return {
            supported: !!site,
            site: site,
            domain: hostname
        };
    }

    async loadSiteAdapter(siteName) {
        // Dynamically load the appropriate adapter
        let adapter;
        
        switch (siteName) {
            case 'forbes':
                // Use existing pattern recognition for Forbes
                if (typeof ForbesAdapter !== 'undefined') {
                    adapter = new ForbesAdapter();
                } else {
                    console.warn('ForbesAdapter not available, using base adapter');
                    adapter = window.BaseSiteAdapter ? new window.BaseSiteAdapter(siteName, {}) : null;
                }
                break;
            case 'yahoo':
                if (typeof YahooFinanceAdapter !== 'undefined') {
                    adapter = new YahooFinanceAdapter();
                } else {
                    adapter = window.BaseSiteAdapter ? new window.BaseSiteAdapter(siteName, {}) : null;
                }
                break;
            case 'bloomberg':
                if (typeof BloombergAdapter !== 'undefined') {
                    adapter = new BloombergAdapter();
                } else {
                    adapter = window.BaseSiteAdapter ? new window.BaseSiteAdapter(siteName, {}) : null;
                }
                break;
            case 'marketwatch':
                if (typeof MarketWatchAdapter !== 'undefined') {
                    adapter = new MarketWatchAdapter();
                } else {
                    adapter = window.BaseSiteAdapter ? new window.BaseSiteAdapter(siteName, {}) : null;
                }
                break;
            default:
                throw new Error(`No adapter for site: ${siteName}`);
        }
        
        // Initialize adapter with shared components if available
        if (adapter) {
            await adapter.initialize({
                nlpProcessor: this.nlpProcessor,
            domInterpreter: this.domInterpreter,
            confidenceScorer: this.confidenceScorer,
            isolationMembrane: this.isolationMembrane
            });
            
            this.currentAdapter = adapter;
            this.siteAdapters.set(siteName, adapter);
        }
    }

    initializeEnhancedHoverSystem() {
        // Initialize enhanced hover handler
        if (window.EnhancedHoverHandler && this.tooltipManager) {
            this.hoverHandler = new window.EnhancedHoverHandler(this.currentAdapter, this.tooltipManager);
            this.hoverHandler.initialize();
            console.log('✅ Enhanced hover system initialized');
        } else {
            console.warn('Enhanced hover components not available, falling back to basic hover');
            this.initializeFallbackHoverSystem();
        }
        
        // Click handler for entity details (still needed)
        document.addEventListener('click', this.handleClick.bind(this), true);
    }
    
    initializeFallbackHoverSystem() {
        // Fallback to original hover system if enhanced components aren't available
        document.addEventListener('mouseover', this.handleMouseOver.bind(this), true);
        document.addEventListener('mouseout', this.handleMouseOut.bind(this), true);
    }

    async handleMouseOver(event) {
        if (!this.isActive || !this.currentAdapter) return;
        
        // Store mouse position
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
        
        // Skip if we're hovering over our own tooltip
        if (event.target.closest('.genome-tooltip')) {
            return;
        }
        
        // Throttle processing to prevent excessive calls
        const now = Date.now();
        if (now - this.lastProcessTime < this.processThrottle) {
            return; // Skip if processed too recently
        }
        this.lastProcessTime = now;
        
        const element = event.target;
        
        // First check if this element or its parents have an entity ID
        let entityElement = element;
        let attempts = 0;
        
        while (entityElement && attempts < 5) {
            if (entityElement.dataset?.genomeEntityId) {
                console.log('Found pre-detected entity on element:', entityElement);
                
                // Get the stored entity
                const entity = this.detectedEntities.get(entityElement.dataset.genomeEntityId);
                if (entity) {
                    console.log('Retrieved stored entity:', entity);
                    
                    // Clear any existing timeout
                    if (this.tooltipTimeout) {
                        clearTimeout(this.tooltipTimeout);
                    }
                    
                    // Show tooltip after short delay
                    this.tooltipTimeout = setTimeout(() => {
                        console.log('Showing tooltip for pre-detected entity');
                        this.showEntityTooltip(entity);
                    }, 300);
                    return;
                }
            }
            entityElement = entityElement.parentElement;
            attempts++;
        }
        
        // If already processed but no entity ID, skip
        if (element.dataset.genomeProcessed && !element.dataset.genomeEntityId) {
            return;
        }
        
        try {
            // Use the element itself or its parent, ensuring we have a valid element
            const rootElement = element.parentElement || element;
            
            // Detect entities using current adapter
            const entities = await this.currentAdapter.detectEntities(rootElement);
            console.log('Detected entities:', entities.length, entities);
            
            // Log confidence scores for debugging
            if (entities.length > 0) {
                entities.forEach((e, i) => {
                    console.log(`Entity ${i}: "${e.text}" - Confidence: ${e.confidence?.score || 'NO SCORE'}`);
                });
            }
            
            // Find entity for this specific element or check if element contains detected entity text
            let targetEntity = null;
            
            // First check if any entity matches this exact element
            targetEntity = entities.find(e => e.element === element);
            
            // If not found, check if the element's text contains any detected entity
            if (!targetEntity && element.textContent) {
                const elementText = element.textContent.trim();
                
                // Skip if element is too large (likely a container)
                if (element.offsetHeight > 200) {
                    console.log('Skipping large element:', element.offsetHeight + 'px tall');
                    return;
                }
                
                targetEntity = entities.find(e => {
                    // Check if element contains the entity text
                    return elementText.includes(e.text) || elementText.includes(e.normalized);
                });
            }
            
            // Check confidence structure
            const confidenceScore = targetEntity?.confidence?.score || targetEntity?.confidence || 0;
            console.log('Target entity confidence structure:', targetEntity?.confidence);
            
            if (targetEntity && confidenceScore >= 0.3) { // Lowered temporarily for debugging
                console.log('Entity detected:', targetEntity);
                console.log('Confidence score:', targetEntity.confidence.score);
                console.log('Element:', element);
                console.log('Element text:', element.textContent);
                
                // Mark as processed
                element.dataset.genomeProcessed = 'true';
                const entityId = this.generateEntityId(targetEntity);
                element.dataset.genomeEntityId = entityId;
                
                // Store entity with reference to the hovered element
                targetEntity.hoveredElement = element;
                this.detectedEntities.set(entityId, targetEntity);
                
                console.log(`Stored entity with ID: ${entityId}`);
                
                // Visual feedback
                if (this.currentAdapter.highlightEntity) {
                    console.log('Applying highlight...');
                    // Highlight the hovered element, not the original
                    const entityCopy = { ...targetEntity, element: element };
                    this.currentAdapter.highlightEntity(entityCopy);
                }
                
                // Show tooltip with a slight delay
                console.log('Setting up tooltip display...');
                
                // Clear any existing timeout
                if (this.tooltipTimeout) {
                    clearTimeout(this.tooltipTimeout);
                }
                
                // Show tooltip after short delay
                this.tooltipTimeout = setTimeout(() => {
                    console.log('Calling showEntityTooltip now...');
                    this.showEntityTooltip({ ...targetEntity, element: element });
                }, 300);
                
                // Update metrics
                this.updateMetrics(targetEntity);
            } else if (targetEntity) {
                console.log('Entity found but confidence too low:', targetEntity.confidence.score);
            } else {
                console.log('No matching entity found for element:', element.textContent);
            }
        } catch (error) {
            console.error('Entity detection error:', error);
        }
    }

    handleMouseOut(event) {
        const element = event.target;
        const entityId = element.dataset.genomeEntityId;
        
        if (entityId) {
            const entity = this.detectedEntities.get(entityId);
            if (entity) {
                // Use the hovered element if available
                const entityCopy = { ...entity, element: entity.hoveredElement || element };
                this.currentAdapter.removeHighlight(entityCopy);
                this.hideTooltip();
            }
        }
    }

    async handleClick(event) {
        if (event.ctrlKey || event.metaKey) {
            const element = event.target;
            const entityId = element.dataset.genomeEntityId;
            
            if (entityId) {
                event.preventDefault();
                event.stopPropagation();
                
                const entity = this.detectedEntities.get(entityId);
                if (entity) {
                    console.log('Opening detailed view for:', entity);
                    await this.showEntityDetails(entity);
                }
            }
        }
    }

    showEntityTooltip(entity) {
        console.log('🎯 showEntityTooltip called with:', {
            element: entity.element,
            entity: entity,
            hasCurrentTooltip: !!this.currentTooltip
        });
        
        try {
            // Remove any existing tooltip
            if (this.currentTooltip) {
                console.log('Removing existing tooltip');
                this.currentTooltip.remove();
                this.currentTooltip = null;
            }
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.id = 'genome-tooltip-' + Date.now();
            tooltip.className = 'genome-tooltip';
            tooltip.style.cssText = `
                position: fixed !important;
                z-index: 2147483647 !important;
                background: white !important;
                border: 2px solid #3b82f6 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                padding: 16px !important;
                min-width: 280px !important;
                font-family: Arial, sans-serif !important;
                font-size: 14px !important;
                color: #333 !important;
                pointer-events: auto !important;
            `;
            
            const confidenceValue = entity.confidence?.score || entity.confidence || 0;
            
            // Build enhanced entity info
            let entityInfo = `
                <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8px;">
                    🧬 Corporate Genome
                </div>
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                    ${entity.text}
                </div>`;
            
            // Add normalized/base name if different
            if (entity.baseName && entity.baseName !== entity.text) {
                entityInfo += `
                <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
                    Base: ${entity.baseName}
                </div>`;
            }
            
            // Add knowledge base info if available
            if (entity.knowledgeBase && entity.knowledgeBase.company) {
                const kb = entity.knowledgeBase.company;
                entityInfo += `
                <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
                    ${kb.ticker ? `Ticker: ${kb.ticker}` : ''} ${kb.exchange ? `(${kb.exchange})` : ''}
                    ${kb.industry ? `| ${kb.industry}` : ''}
                </div>`;
            }
            
            entityInfo += `
                <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
                    Confidence: ${Math.round(confidenceValue * 100)}%
                    ${entity.knowledgeBase ? ' ✓ Verified' : ''}
                </div>
                <div style="color: #999; font-size: 12px;">
                    Loading ownership data...
                </div>`;
            
            tooltip.innerHTML = entityInfo;
            
            // Add to body
            document.body.appendChild(tooltip);
            console.log('✅ Tooltip added to DOM:', tooltip.id);
            
            // Position tooltip
            const rect = entity.element.getBoundingClientRect();
            console.log('Element position:', rect);
            console.log('Element:', entity.element);
            
            // Ensure we have valid positioning
            let top = 0;
            let left = 0;
            
            // Check if element is visible in viewport
            if (rect.top >= 0 && rect.top < window.innerHeight && 
                rect.left >= 0 && rect.left < window.innerWidth) {
                // Element is visible, position below it
                top = Math.min(rect.bottom + 10, window.innerHeight - 200);
                left = rect.left;
            } else {
                // Element is off-screen, use mouse position if available
                if (this.lastMousePosition) {
                    top = this.lastMousePosition.y + 10;
                    left = this.lastMousePosition.x + 10;
                } else {
                    // Fallback to safe position
                    top = 100;
                    left = 100;
                }
                console.log('Element off-screen, using fallback position');
            }
            
            // Get tooltip dimensions after adding to DOM
            const tooltipRect = tooltip.getBoundingClientRect();
            console.log('Tooltip dimensions:', tooltipRect);
            
            // Adjust to keep tooltip on screen
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
            if (top + tooltipRect.height > window.innerHeight) {
                top = rect.top - tooltipRect.height - 10;
            }
            
            // Ensure minimum distance from edges
            top = Math.max(10, top);
            left = Math.max(10, left);
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            
            console.log('📍 Tooltip positioned at:', { top, left });
            
            this.currentTooltip = tooltip;
            
            // Verify tooltip is visible
            const computedStyle = window.getComputedStyle(tooltip);
            console.log('Tooltip visibility check:', {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                position: computedStyle.position,
                zIndex: computedStyle.zIndex
            });
            
            // Add highlight to element
            entity.element.classList.add('genome-highlight');
            
            // Add highlight styles if not already present
            if (!document.getElementById('genome-highlight-styles')) {
                const highlightStyle = document.createElement('style');
                highlightStyle.id = 'genome-highlight-styles';
                highlightStyle.textContent = `
                    .genome-highlight {
                        background-color: rgba(59, 130, 246, 0.1) !important;
                        outline: 2px solid rgba(59, 130, 246, 0.3) !important;
                        outline-offset: 2px !important;
                        cursor: pointer !important;
                        transition: all 0.2s !important;
                    }
                    
                    .genome-highlight:hover {
                        background-color: rgba(59, 130, 246, 0.2) !important;
                        outline-color: rgba(59, 130, 246, 0.5) !important;
                    }
                `;
                document.head.appendChild(highlightStyle);
            }
            
            // Test with mock data after delay
            setTimeout(() => {
                if (this.currentTooltip && this.currentTooltip.id === tooltip.id) {
                    console.log('Updating tooltip with mock data');
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8px;">
                            🧬 Corporate Genome
                        </div>
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                            ${entity.text}
                        </div>
                        <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
                            Major Shareholders:
                        </div>
                        <div style="font-size: 13px; line-height: 1.5;">
                            <div>• Vanguard Group - 9.7%</div>
                            <div>• BlackRock Inc. - 7.2%</div>
                            <div>• State Street - 4.8%</div>
                        </div>
                    `;
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error creating tooltip:', error);
        }
    }


    hideTooltip() {
        console.log('🎯 hideTooltip called');
        if (this.currentTooltip) {
            console.log('Removing tooltip:', this.currentTooltip.id);
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
        
        // Remove all highlights
        document.querySelectorAll('.genome-highlight').forEach(el => {
            el.classList.remove('genome-highlight');
        });
    }
    
    async fetchOwnershipData(entity) {
        if (!this.currentTooltip) return;
        
        try {
            // Mock data for now - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const mockOwners = [
                { name: 'Vanguard Group', percent: '9.7%', shares: '151M' },
                { name: 'BlackRock Inc.', percent: '7.2%', shares: '112M' },
                { name: 'State Street Corp', percent: '4.8%', shares: '75M' }
            ];
            
            const content = this.currentTooltip.querySelector('.genome-tooltip-content');
            if (!content) return;
            
            content.innerHTML = `
                <div class="genome-entity-name">${entity.text}</div>
                <div class="genome-entity-type">${entity.type}</div>
                <div class="genome-ownership">
                    <div class="genome-ownership-title">Major Shareholders:</div>
                    ${mockOwners.map(owner => `
                        <div class="genome-owner">
                            <span class="genome-owner-name">${owner.name}</span>
                            <span class="genome-owner-percent">${owner.percent}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add ownership styles
            const ownershipStyles = `
                .genome-ownership {
                    margin-top: 8px;
                }
                .genome-ownership-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6b7280;
                    margin-bottom: 6px;
                }
                .genome-owner {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    font-size: 13px;
                }
                .genome-owner-name {
                    color: #374151;
                }
                .genome-owner-percent {
                    color: #3b82f6;
                    font-weight: 600;
                }
            `;
            
            const styleElement = document.getElementById('genome-tooltip-styles');
            if (styleElement && !styleElement.textContent.includes('genome-ownership')) {
                styleElement.textContent += ownershipStyles;
            }
            
        } catch (error) {
            console.error('Failed to fetch ownership data:', error);
            
            const content = this.currentTooltip?.querySelector('.genome-tooltip-content');
            if (content) {
                content.innerHTML = `
                    <div class="genome-entity-name">${entity.text}</div>
                    <div class="genome-entity-type">${entity.type}</div>
                    <div class="genome-error" style="color: #ef4444; font-size: 13px; margin-top: 8px;">
                        Failed to load ownership data
                    </div>
                `;
            }
        }
    }

    async showEntityDetails(entity) {
        console.log('Fetching ownership data for:', entity.normalized);
        
        // This would trigger the data orchestrator to fetch ownership data
        // For now, we'll just log the entity details
        console.log('Entity details:', {
            text: entity.text,
            normalized: entity.normalized,
            type: entity.type,
            confidence: entity.confidence,
            context: entity.context
        });
        
        // Send message to background script to fetch data
        chrome.runtime.sendMessage({
            action: 'fetchOwnershipData',
            entity: {
                name: entity.normalized,
                type: entity.type,
                confidence: entity.confidence.score
            }
        }, response => {
            if (response && response.data) {
                this.displayOwnershipData(entity, response.data);
            }
        });
    }

    displayOwnershipData(entity, data) {
        // Create modal or detailed view
        console.log('Ownership data received:', data);
        // Implementation would create a proper UI component
    }

    async performInitialScan() {
        console.log('🔍 Performing initial entity scan...');
        
        try {
            // Detect all entities on the page
            const entities = await this.currentAdapter.detectEntities(document.body);
            console.log(`Found ${entities.length} entities on initial scan`);
            
            // Mark and store each entity
            for (const entity of entities) {
                if (entity.element && entity.confidence.score >= 0.3) {
                    const entityId = this.generateEntityId(entity);
                    
                    // Mark the element
                    entity.element.dataset.genomeProcessed = 'true';
                    entity.element.dataset.genomeEntityId = entityId;
                    
                    // Add hover styling
                    entity.element.style.cursor = 'pointer';
                    entity.element.title = `Corporate Genome: ${entity.text} (${Math.round(entity.confidence.score * 100)}% confidence)`;
                    
                    // Store the entity
                    this.detectedEntities.set(entityId, entity);
                    
                    console.log(`Pre-marked entity: "${entity.text}" on element:`, entity.element);
                }
            }
            
            console.log(`✅ Initial scan complete. ${this.detectedEntities.size} entities marked for hover.`);
            
        } catch (error) {
            console.error('Initial scan failed:', error);
        }
    }
    
    observeDynamicContent() {
        if (!this.currentAdapter) return;
        
        // Use adapter's change observer
        this.currentAdapter.observeChanges(async (mutations) => {
            console.log('Dynamic content detected, re-scanning...');
            
            // Process new content
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        await this.currentAdapter.detectEntities(node);
                    }
                }
            }
        });
    }

    generateEntityId(entity) {
        return `${entity.normalized}_${entity.type}_${Date.now()}`;
    }

    updateMetrics(entity) {
        this.performanceMetrics.totalDetections++;
        
        // Update average confidence
        const currentAvg = this.performanceMetrics.averageConfidence;
        const newAvg = (currentAvg * (this.performanceMetrics.totalDetections - 1) + entity.confidence.score) 
                      / this.performanceMetrics.totalDetections;
        this.performanceMetrics.averageConfidence = newAvg;
        
        // Update site-specific metrics
        const siteMetrics = this.performanceMetrics.siteMetrics.get(entity.source) || {
            detections: 0,
            avgConfidence: 0
        };
        
        siteMetrics.detections++;
        siteMetrics.avgConfidence = (siteMetrics.avgConfidence * (siteMetrics.detections - 1) + entity.confidence.score)
                                   / siteMetrics.detections;
        
        this.performanceMetrics.siteMetrics.set(entity.source, siteMetrics);
    }

    getMetrics() {
        return {
            ...this.performanceMetrics,
            currentSite: this.currentAdapter?.siteName,
            entitiesDetected: this.detectedEntities.size,
            adapterMetrics: this.currentAdapter?.getMetrics()
        };
    }

    cleanup() {
        // Clean up enhanced UI systems
        if (this.hoverHandler) {
            this.hoverHandler.deactivate();
            this.hoverHandler = null;
        }
        
        if (this.tooltipManager) {
            this.tooltipManager.cleanup();
            this.tooltipManager = null;
        }
        
        // Clean up all adapters
        for (const adapter of this.siteAdapters.values()) {
            adapter.cleanup();
        }
        
        // Clear detected entities
        this.detectedEntities.clear();
        
        // Remove remaining event listeners
        document.removeEventListener('mouseover', this.handleMouseOver, true);
        document.removeEventListener('mouseout', this.handleMouseOut, true);
        document.removeEventListener('click', this.handleClick, true);
        
        this.isActive = false;
        console.log('Intelligence engine cleaned up');
    }
}

// Forbes Adapter using existing pattern recognition
if (typeof BaseSiteAdapter !== 'undefined') {
class ForbesAdapter extends BaseSiteAdapter {
    constructor() {
        super('forbes', {
            selectors: [
                'article', '.article-text', 'h1', 'h2', 'p', 'a',
                '.article-headline', '.fs-headline', '.body-content'
            ]
        });
        
        // Use existing pattern recognition if available
        if (typeof PatternRecognitionMembrane !== 'undefined') {
            this.patternRecognizer = new PatternRecognitionMembrane();
        } else {
            console.warn('PatternRecognitionMembrane not available for Forbes adapter');
        }
    }

    async extractEntity(element, sandbox) {
        // Use existing Forbes pattern detection if available
        if (!this.patternRecognizer) {
            return super.extractEntity(element, sandbox);
        }
        
        const detection = await this.patternRecognizer.detectCompany(element);
        
        if (!detection) return null;
        
        // Convert to new entity format
        const confidence = await this.confidenceScorer.calculateScore({
            patternMatch: detection,
            domContext: { confidence: detection.confidence },
            nlpConfidence: { confidence: detection.confidence },
            entity: { text: detection.company, type: 'company' }
        }, { site: 'forbes' });
        
        return {
            text: detection.company,
            normalized: detection.company,
            type: 'company',
            element: element,
            position: {
                x: element.offsetLeft,
                y: element.offsetTop
            },
            context: {
                strategy: detection.strategy,
                forbes: true
            },
            confidence: confidence,
            source: 'forbes',
            timestamp: Date.now()
        };
    }
}
} // End of if (typeof BaseSiteAdapter !== 'undefined')

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedIntelligenceEngine = EnhancedIntelligenceEngine;
    
    // Delay initialization to ensure all dependencies are loaded
    window.createEnhancedGenome = function() {
        if (!window.enhancedGenome) {
            window.enhancedGenome = new EnhancedIntelligenceEngine();
        }
        return window.enhancedGenome;
    };
}

console.log('🧬 Enhanced Intelligence Engine v2 ready - Multi-site entity resolution enabled');