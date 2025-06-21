// Corporate Genome: Base Site Adapter - Common functionality for all sites
console.log('Corporate Genome: Base Site Adapter initializing...');

class BaseSiteAdapter {
    constructor(siteName, siteConfig) {
        this.siteName = siteName;
        this.config = siteConfig;
        
        // Components
        this.nlpProcessor = null;
        this.domInterpreter = null;
        this.confidenceScorer = null;
        this.isolationMembrane = null;
        
        // Performance tracking
        this.metrics = {
            entitiesDetected: 0,
            averageConfidence: 0,
            processingTime: 0
        };
        
        // State management
        this.isActive = false;
        this.processedElements = new WeakSet();
    }

    async initialize(components) {
        try {
            // Use enhanced NLP processor if available
            this.nlpProcessor = components.nlpProcessor || 
                (window.EnhancedNLPProcessor ? new window.EnhancedNLPProcessor() : 
                 window.SecureNLPProcessor ? new window.SecureNLPProcessor() : null);
            this.domInterpreter = components.domInterpreter || (window.DOMInterpreter ? new window.DOMInterpreter() : null);
            this.confidenceScorer = components.confidenceScorer || (window.ConfidenceScorer ? new window.ConfidenceScorer() : null);
            this.isolationMembrane = components.isolationMembrane || (window.SiteIsolationMembrane ? new window.SiteIsolationMembrane() : null);
            
            // Site-specific initialization
            await this.onInitialize();
            
            this.isActive = true;
            console.log(`✅ ${this.siteName} adapter initialized`);
            
        } catch (error) {
            console.error(`Failed to initialize ${this.siteName} adapter:`, error);
            throw error;
        }
    }

    // Override in subclasses for site-specific initialization
    async onInitialize() {
        // Default implementation - no additional setup
    }

    async detectEntities(rootElement = document.body) {
        if (!this.isActive) {
            throw new Error(`${this.siteName} adapter not initialized`);
        }
        
        const startTime = performance.now();
        const detectedEntities = [];
        
        try {
            console.log(`🔍 Starting entity detection for ${this.siteName}`);
            
            // For now, bypass isolation membrane to debug
            const entities = await this.performDetection(rootElement, null);
            
            // Update metrics
            this.updateMetrics(entities, performance.now() - startTime);
            
            return entities;
            
        } catch (error) {
            console.error(`Entity detection failed for ${this.siteName}:`, error);
            return [];
        }
    }

    async performDetection(rootElement, sandbox) {
        const entities = new Map(); // Use Map to deduplicate
        
        // Get candidate elements
        const candidates = this.findCandidateElements(rootElement);
        console.log(`Found ${candidates.length} candidate elements`);
        
        for (const element of candidates) {
            // Skip if already processed
            if (this.processedElements.has(element)) {
                console.log('Element already processed, skipping');
                continue;
            }
            this.processedElements.add(element);
            
            console.log(`Processing element: ${element.tagName}.${element.className} - "${element.textContent.substring(0, 50)}..."`);
            
            // Extract and validate entity
            const entity = await this.extractEntity(element, sandbox);
            
            if (entity) {
                console.log(`Entity extracted: "${entity.text}" - Confidence: ${entity.confidence?.score}`);
                if (entity.confidence.score >= 0.45) { // Minimum threshold
                    const key = `${entity.normalized}_${entity.type}`;
                    
                    // Keep highest confidence version if duplicate
                    if (!entities.has(key) || entities.get(key).confidence.score < entity.confidence.score) {
                        entities.set(key, entity);
                        console.log(`✅ Entity added to results`);
                    }
                } else {
                    console.log(`❌ Entity confidence too low: ${entity.confidence.score}`);
                }
            } else {
                console.log('❌ No entity extracted from element');
            }
        }
        
        console.log(`Total entities found: ${entities.size}`);
        return Array.from(entities.values());
    }

    findCandidateElements(rootElement) {
        // Base implementation - override for site-specific selectors
        const selectors = this.config.selectors || [
            'h1', 'h2', 'h3', 'p', 'span', 'a',
            '[data-symbol]', '[data-ticker]', '.company-name'
        ];
        
        const elements = [];
        
        // Ensure rootElement is valid
        if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
            console.warn('Invalid root element for findCandidateElements:', rootElement);
            return elements;
        }
        
        for (const selector of selectors) {
            try {
                const found = rootElement.querySelectorAll(selector);
                elements.push(...found);
            } catch (error) {
                console.warn(`Invalid selector ${selector}:`, error);
            }
        }
        
        return elements;
    }

    async extractEntity(element, sandbox) {
        try {
            // Check if required components are available
            if (!this.nlpProcessor || !this.domInterpreter || !this.confidenceScorer) {
                console.warn('Required components not available for entity extraction');
                return null;
            }
            
            // Get text content safely
            const text = this.isolationMembrane ? 
                this.isolationMembrane.sanitizeString(element.textContent) : 
                element.textContent.trim();
            if (!text || text.length < 2) return null;
            
            // Parallel extraction
            const [nlpResult, domAnalysis] = await Promise.all([
                this.nlpProcessor.extractEntities(text, { site: this.siteName }),
                this.domInterpreter.analyzeDOMContext(element, this.siteName)
            ]);
            
            // Skip if no entities found
            if (!nlpResult.entities || nlpResult.entities.length === 0) {
                return null;
            }
            
            // Take the highest confidence NLP entity
            const topEntity = nlpResult.entities[0];
            
            // Calculate final confidence score
            const confidenceFactors = {
                patternMatch: topEntity,
                domContext: domAnalysis,
                nlpConfidence: nlpResult,
                entity: topEntity
            };
            
            const confidence = await this.confidenceScorer.calculateScore(
                confidenceFactors,
                { site: this.siteName }
            );
            
            console.log('Confidence calculation result:', confidence);
            
            // Find the most specific element containing the entity text
            const specificElement = this.findMostSpecificElement(element, topEntity.text);
            
            if (specificElement && specificElement !== element) {
                console.log(`Found more specific element for "${topEntity.text}":`, specificElement);
            }
            
            // Build final entity object
            return {
                text: topEntity.text,
                normalized: topEntity.normalized,
                type: topEntity.type,
                element: specificElement || element,
                position: {
                    x: (specificElement || element).offsetLeft,
                    y: (specificElement || element).offsetTop
                },
                context: {
                    dom: domAnalysis,
                    nlp: nlpResult
                },
                confidence: confidence,
                source: this.siteName,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error('Entity extraction error:', error);
            return null;
        }
    }

    findMostSpecificElement(parentElement, entityText) {
        console.log(`🔍 Finding most specific element for: "${entityText}"`);
        
        // If element is already small and specific, use it
        if (parentElement.offsetHeight < 100 && parentElement.textContent.trim() === entityText) {
            console.log('✅ Element is already specific');
            return parentElement;
        }
        
        // Try to find the exact text node containing our entity
        const walker = document.createTreeWalker(
            parentElement,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent.trim();
                    if (text.includes(entityText)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
            const parent = textNode.parentElement;
            
            // Skip if parent is too large (likely a container)
            if (parent.offsetHeight > 200) {
                continue;
            }
            
            // Check if this parent element contains mainly our entity text
            const parentText = parent.textContent.trim();
            const textRatio = entityText.length / parentText.length;
            
            if (textRatio > 0.5) { // Entity is >50% of the parent's text
                console.log(`✅ Found specific element:`, parent.tagName, parent.className);
                return parent;
            }
        }
        
        // Fallback: Look for smallest element containing the text
        const allElements = parentElement.querySelectorAll('*');
        let bestElement = parentElement;
        let bestSize = parentElement.offsetHeight * parentElement.offsetWidth;
        
        for (const el of allElements) {
            if (el.textContent.includes(entityText)) {
                const size = el.offsetHeight * el.offsetWidth;
                if (size < bestSize && size > 0 && el.offsetHeight < 200) {
                    bestElement = el;
                    bestSize = size;
                }
            }
        }
        
        console.log(`📍 Selected element:`, bestElement.tagName, bestElement.className);
        return bestElement;
    }
    
    observeChanges(callback) {
        // Watch for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            const hasRelevantChanges = mutations.some(mutation => {
                return mutation.type === 'childList' && 
                       mutation.addedNodes.length > 0;
            });
            
            if (hasRelevantChanges) {
                // Debounce to avoid excessive processing
                clearTimeout(this.observerTimeout);
                this.observerTimeout = setTimeout(() => {
                    callback(mutations);
                }, 300);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false,
            attributes: false
        });
        
        return observer;
    }

    updateMetrics(entities, processingTime) {
        this.metrics.entitiesDetected += entities.length;
        this.metrics.processingTime = processingTime;
        
        if (entities.length > 0) {
            const totalConfidence = entities.reduce((sum, e) => sum + e.confidence.score, 0);
            this.metrics.averageConfidence = totalConfidence / entities.length;
        }
    }

    highlightEntity(entity) {
        // Visual feedback for detected entities
        if (!entity.element) return;
        
        const element = entity.element;
        const originalStyle = element.style.cssText;
        
        // Apply highlight based on confidence
        const color = entity.confidence.level === 'high' ? '#28a745' :
                     entity.confidence.level === 'medium' ? '#ffc107' : '#dc3545';
        
        element.style.cssText = `${originalStyle}; 
            background-color: ${color}20 !important; 
            border-bottom: 2px solid ${color} !important;
            cursor: pointer !important;`;
        
        // Store original style for restoration
        element.dataset.originalStyle = originalStyle;
    }

    removeHighlight(entity) {
        if (!entity.element) return;
        
        const element = entity.element;
        element.style.cssText = element.dataset.originalStyle || '';
        delete element.dataset.originalStyle;
    }

    getMetrics() {
        return {
            site: this.siteName,
            ...this.metrics,
            isActive: this.isActive
        };
    }

    cleanup() {
        // Clear processed elements to free memory
        this.processedElements = new WeakSet();
        
        // Site-specific cleanup
        this.onCleanup();
        
        this.isActive = false;
        console.log(`${this.siteName} adapter cleaned up`);
    }

    // Override in subclasses for site-specific cleanup
    onCleanup() {
        // Default implementation - no additional cleanup
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BaseSiteAdapter = BaseSiteAdapter;
}

console.log('🔧 Base Site Adapter ready - Foundation for site-specific adapters');