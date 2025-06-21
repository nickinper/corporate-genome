// Corporate Genome: Enhanced Hover Handler
// Manages hover events with proper debouncing and entity detection

console.log('Corporate Genome: Enhanced Hover Handler initializing...');

class EnhancedHoverHandler {
    constructor(adapter, tooltipManager) {
        this.adapter = adapter;
        this.tooltipManager = tooltipManager;
        
        // Configuration
        this.config = {
            debounceDelay: 150,
            maxProcessingTime: 500,
            enableEventDelegation: true,
            trackMousePath: true,
            maxRetries: 2
        };
        
        // State management
        this.isActive = false;
        this.currentHoveredElement = null;
        this.currentTooltipId = null;
        this.debounceTimer = null;
        this.processedElements = new WeakSet();
        this.entityCache = new Map();
        this.mousePath = [];
        
        // Event handlers (bound once)
        this.boundHandleMouseEnter = this.handleMouseEnter.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        
        console.log('✅ Enhanced Hover Handler initialized');
    }
    
    initialize() {
        if (this.isActive) {
            console.log('Hover handler already active');
            return;
        }
        
        // Use event delegation on document for better performance
        if (this.config.enableEventDelegation) {
            document.addEventListener('mouseenter', this.boundHandleMouseEnter, true);
            document.addEventListener('mouseleave', this.boundHandleMouseLeave, true);
        }
        
        // Track mouse movement for debugging and positioning
        if (this.config.trackMousePath) {
            document.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
        }
        
        this.isActive = true;
        console.log('✅ Hover handler activated');
    }
    
    handleMouseEnter(event) {
        const element = event.target;
        
        // Skip if we're hovering over a tooltip
        if (element.closest('.genome-tooltip')) {
            return;
        }
        
        // Skip if this is not a potential entity element
        if (!this.shouldProcessElement(element)) {
            return;
        }
        
        // Clear any existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Store current element
        this.currentHoveredElement = element;
        
        // Debounce the processing
        this.debounceTimer = setTimeout(() => {
            this.processHoverElement(element);
        }, this.config.debounceDelay);
    }
    
    handleMouseLeave(event) {
        const element = event.target;
        
        // If we're leaving an element that has an active tooltip
        if (element === this.currentHoveredElement) {
            this.currentHoveredElement = null;
            
            // Don't hide immediately - let tooltip manager handle the delay
            if (this.currentTooltipId) {
                // The tooltip manager will handle hiding based on mouse position
            }
        }
        
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
    
    handleMouseMove(event) {
        // Track mouse path for debugging
        if (this.config.trackMousePath) {
            this.mousePath.push({
                x: event.clientX,
                y: event.clientY,
                timestamp: Date.now(),
                target: event.target.tagName + (event.target.className ? '.' + event.target.className : '')
            });
            
            // Keep only last 10 positions
            if (this.mousePath.length > 10) {
                this.mousePath.shift();
            }
        }
    }
    
    shouldProcessElement(element) {
        // Skip script, style, and other non-content elements
        const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED']);
        if (skipTags.has(element.tagName)) {
            return false;
        }
        
        // Skip if element is too large (likely a container)
        if (element.offsetHeight > 300 || element.offsetWidth > 800) {
            return false;
        }
        
        // Skip if element has no text content
        const text = element.textContent?.trim();
        if (!text || text.length < 2) {
            return false;
        }
        
        // Skip if text is too long (likely a paragraph or article)
        if (text.length > 200) {
            return false;
        }
        
        // Prefer elements that look like they might contain company names
        const likelyCompanyElements = [
            'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            'A', 'SPAN', 'STRONG', 'B', 'EM'
        ];
        
        const hasGoodTag = likelyCompanyElements.includes(element.tagName);
        const hasGoodClass = /company|name|title|brand|corp|inc|ltd/i.test(element.className);
        const hasGoodContent = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*(?:\s+(?:Inc|Corp|LLC|Ltd)\.?)?\b/.test(text);
        
        return hasGoodTag || hasGoodClass || hasGoodContent;
    }
    
    async processHoverElement(element) {
        if (!element || !document.contains(element)) {
            return;
        }
        
        try {
            // Check if we already have entity data for this element
            let entity = this.getEntityFromElement(element);
            
            if (!entity) {
                // Check cache first
                const cacheKey = this.generateCacheKey(element);
                entity = this.entityCache.get(cacheKey);
                
                if (!entity) {
                    // Detect entity with timeout
                    entity = await this.detectEntityWithTimeout(element);
                    
                    if (entity) {
                        // Cache the result
                        this.entityCache.set(cacheKey, entity);
                        this.markElementWithEntity(element, entity);
                    }
                }
            }
            
            // Show tooltip if entity found
            if (entity && this.shouldShowTooltip(entity)) {
                this.showTooltipForEntity(entity, element);
            }
            
        } catch (error) {
            console.error('Error processing hover element:', error);
        }
    }
    
    getEntityFromElement(element) {
        // Check if element is already marked with entity data
        const entityId = element.dataset.genomeEntityId;
        if (entityId) {
            // Try to get from adapter's detected entities
            if (this.adapter && this.adapter.detectedEntities) {
                return this.adapter.detectedEntities.get(entityId);
            }
        }
        
        // Check parent elements
        let current = element.parentElement;
        let attempts = 0;
        
        while (current && attempts < 3) {
            const parentEntityId = current.dataset.genomeEntityId;
            if (parentEntityId && this.adapter && this.adapter.detectedEntities) {
                const parentEntity = this.adapter.detectedEntities.get(parentEntityId);
                if (parentEntity && this.elementContainsEntity(element, parentEntity)) {
                    return parentEntity;
                }
            }
            current = current.parentElement;
            attempts++;
        }
        
        return null;
    }
    
    elementContainsEntity(element, entity) {
        const elementText = element.textContent?.trim().toLowerCase();
        const entityText = entity.text?.toLowerCase();
        const entityNormalized = entity.normalized?.toLowerCase();
        
        return elementText && (
            elementText.includes(entityText) ||
            (entityNormalized && elementText.includes(entityNormalized))
        );
    }
    
    async detectEntityWithTimeout(element) {
        if (!this.adapter || !this.adapter.detectEntities) {
            return null;
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Entity detection timeout')), this.config.maxProcessingTime);
        });
        
        // Race between detection and timeout
        try {
            const entities = await Promise.race([
                this.adapter.detectEntities(element),
                timeoutPromise
            ]);
            
            if (entities && entities.length > 0) {
                // Find the best entity for this element
                return this.findBestEntityForElement(element, entities);
            }
            
        } catch (error) {
            if (error.message !== 'Entity detection timeout') {
                console.error('Entity detection error:', error);
            }
        }
        
        return null;
    }
    
    findBestEntityForElement(element, entities) {
        const elementText = element.textContent?.trim();
        if (!elementText) return null;
        
        // Score entities based on relevance to this element
        const scoredEntities = entities.map(entity => {
            let score = entity.confidence?.score || 0;
            
            // Boost score if entity text is contained in element
            if (elementText.includes(entity.text)) {
                score += 0.2;
            }
            
            // Boost score if element is the exact entity element
            if (entity.element === element) {
                score += 0.3;
            }
            
            // Penalize if entity text is much larger than element text
            const textRatio = entity.text.length / elementText.length;
            if (textRatio > 0.8) {
                score += 0.1;
            } else if (textRatio < 0.2) {
                score -= 0.1;
            }
            
            return { entity, score };
        });
        
        // Sort by score and return the best
        scoredEntities.sort((a, b) => b.score - a.score);
        
        const best = scoredEntities[0];
        return best && best.score >= 0.5 ? best.entity : null;
    }
    
    shouldShowTooltip(entity) {
        // Check confidence threshold
        const confidence = entity.confidence?.score || entity.confidence || 0;
        if (confidence < 0.4) {
            return false;
        }
        
        // Check if we've already shown a tooltip for this entity recently
        const now = Date.now();
        const lastShown = entity.lastTooltipShown || 0;
        if (now - lastShown < 2000) { // 2 second cooldown
            return false;
        }
        
        return true;
    }
    
    showTooltipForEntity(entity, element) {
        // Hide any existing tooltip first
        if (this.currentTooltipId) {
            this.tooltipManager.hideTooltip(this.currentTooltipId);
        }
        
        // Show new tooltip
        this.currentTooltipId = this.tooltipManager.showTooltip(entity, element);
        
        // Mark entity as recently shown
        entity.lastTooltipShown = Date.now();
        
        console.log(`🎯 Showing tooltip for: "${entity.text}" (confidence: ${entity.confidence?.score || 0})`);
    }
    
    markElementWithEntity(element, entity) {
        if (!element || !entity) return;
        
        // Generate unique ID for this entity
        const entityId = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Mark element
        element.dataset.genomeEntityId = entityId;
        element.dataset.genomeProcessed = 'true';
        
        // Add visual indicators
        element.style.cursor = 'pointer';
        element.title = `Corporate Genome: ${entity.text} (${Math.round((entity.confidence?.score || 0) * 100)}% confidence)`;
        
        // Store in adapter if available
        if (this.adapter && this.adapter.detectedEntities) {
            this.adapter.detectedEntities.set(entityId, entity);
        }
    }
    
    generateCacheKey(element) {
        // Create a cache key based on element content and position
        const text = element.textContent?.trim() || '';
        const tag = element.tagName;
        const className = element.className || '';
        
        // Simple hash function
        let hash = 0;
        const str = `${tag}-${className}-${text}`.substring(0, 100);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return `hover-${Math.abs(hash)}`;
    }
    
    getDebugInfo() {
        return {
            isActive: this.isActive,
            currentElement: this.currentHoveredElement?.tagName + (this.currentHoveredElement?.className ? '.' + this.currentHoveredElement.className : ''),
            currentTooltip: this.currentTooltipId,
            cacheSize: this.entityCache.size,
            mousePathLength: this.mousePath.length,
            lastMousePosition: this.mousePath[this.mousePath.length - 1]
        };
    }
    
    clearCache() {
        this.entityCache.clear();
        console.log('🧹 Hover handler cache cleared');
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        // Remove event listeners
        document.removeEventListener('mouseenter', this.boundHandleMouseEnter, true);
        document.removeEventListener('mouseleave', this.boundHandleMouseLeave, true);
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        
        // Clear timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        // Clear state
        this.currentHoveredElement = null;
        this.currentTooltipId = null;
        this.clearCache();
        
        this.isActive = false;
        console.log('🔴 Hover handler deactivated');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedHoverHandler = EnhancedHoverHandler;
}

console.log('✅ Enhanced Hover Handler ready');