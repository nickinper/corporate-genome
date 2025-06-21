// Corporate Genome: Enhanced Tooltip Manager
// Handles tooltip creation, positioning, and lifecycle with Shadow DOM isolation

console.log('Corporate Genome: Enhanced Tooltip Manager initializing...');

class EnhancedTooltipManager {
    constructor() {
        // Configuration
        this.config = {
            showDelay: 200,
            hideDelay: 100,
            maxTooltips: 3,
            zIndex: 2147483647,
            enableShadowDOM: true,
            enableDebugMode: false
        };
        
        // State management
        this.activeTooltips = new Map();
        this.tooltipPool = [];
        this.showTimeout = null;
        this.hideTimeout = null;
        this.isMouseInTooltip = false;
        
        // Event handling
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleResize = this.handleResize.bind(this);
        
        // Initialize global event listeners
        this.initializeGlobalListeners();
        
        // Create shared shadow DOM if supported
        this.shadowHost = null;
        this.shadowRoot = null;
        this.initializeShadowDOM();
        
        console.log('✅ Enhanced Tooltip Manager initialized');
    }
    
    initializeShadowDOM() {
        if (!this.config.enableShadowDOM || !document.createElement('div').attachShadow) {
            console.log('Shadow DOM not available or disabled, using regular DOM');
            return;
        }
        
        try {
            // Create shadow host
            this.shadowHost = document.createElement('div');
            this.shadowHost.id = 'genome-tooltip-shadow-host';
            this.shadowHost.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 0 !important;
                height: 0 !important;
                pointer-events: none !important;
                z-index: ${this.config.zIndex} !important;
            `;
            
            // Attach shadow root
            this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });
            
            // Add base styles to shadow DOM
            const baseStyles = document.createElement('style');
            baseStyles.textContent = this.getBaseTooltipStyles();
            this.shadowRoot.appendChild(baseStyles);
            
            // Add to document
            document.documentElement.appendChild(this.shadowHost);
            
            console.log('✅ Shadow DOM initialized for tooltips');
            
        } catch (error) {
            console.warn('Failed to initialize Shadow DOM:', error);
            this.shadowHost = null;
            this.shadowRoot = null;
        }
    }
    
    getBaseTooltipStyles() {
        return `
            .genome-tooltip {
                position: fixed;
                background: white;
                border: 2px solid #3b82f6;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                padding: 16px;
                min-width: 280px;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                font-size: 14px;
                color: #333;
                pointer-events: auto;
                z-index: 999999;
                opacity: 0;
                transform: translateY(-10px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                word-wrap: break-word;
                line-height: 1.4;
            }
            
            .genome-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            .genome-tooltip-header {
                font-weight: bold;
                color: #3b82f6;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .genome-tooltip-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 4px;
                color: #1a1a1a;
            }
            
            .genome-tooltip-subtitle {
                color: #666;
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .genome-tooltip-meta {
                color: #666;
                font-size: 12px;
                margin-bottom: 8px;
            }
            
            .genome-tooltip-content {
                color: #333;
                font-size: 13px;
                line-height: 1.5;
            }
            
            .genome-tooltip-loading {
                color: #999;
                font-size: 12px;
                font-style: italic;
            }
            
            .genome-tooltip-verified {
                color: #10b981;
                font-weight: 600;
            }
            
            .genome-tooltip-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
            }
            
            .genome-tooltip-arrow.top {
                top: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 8px solid #3b82f6;
            }
            
            .genome-tooltip-arrow.bottom {
                bottom: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid #3b82f6;
            }
            
            .genome-tooltip:hover {
                pointer-events: auto;
            }
            
            ${this.config.enableDebugMode ? `
            .genome-tooltip-debug {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px;
                font-size: 11px;
                border-radius: 4px;
                font-family: monospace;
                z-index: 999998;
                max-width: 300px;
                word-break: break-all;
            }
            ` : ''}
        `;
    }
    
    initializeGlobalListeners() {
        // Handle page scrolling and resizing
        window.addEventListener('scroll', this.boundHandleScroll, { passive: true });
        window.addEventListener('resize', this.boundHandleResize, { passive: true });
        document.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
        
        // Handle page navigation
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    showTooltip(entity, targetElement) {
        if (!entity || !targetElement) {
            console.warn('Invalid entity or target element for tooltip');
            return null;
        }
        
        // Clear any pending hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Generate unique ID for this tooltip
        const tooltipId = `genome-tooltip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create tooltip with delay
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        
        this.showTimeout = setTimeout(() => {
            this.createTooltip(tooltipId, entity, targetElement);
        }, this.config.showDelay);
        
        return tooltipId;
    }
    
    createTooltip(tooltipId, entity, targetElement) {
        try {
            // Check if target element is still valid
            if (!document.contains(targetElement)) {
                console.log('Target element no longer in DOM, skipping tooltip');
                return;
            }
            
            // Hide existing tooltips if we've reached the limit
            if (this.activeTooltips.size >= this.config.maxTooltips) {
                const oldestTooltip = this.activeTooltips.keys().next().value;
                this.hideTooltip(oldestTooltip);
            }
            
            // Get or create tooltip element
            const tooltip = this.getTooltipElement();
            tooltip.id = tooltipId;
            
            // Build tooltip content
            const content = this.buildTooltipContent(entity);
            tooltip.innerHTML = content;
            
            // Add to appropriate container
            const container = this.shadowRoot || document.body;
            container.appendChild(tooltip);
            
            // Position tooltip
            this.positionTooltip(tooltip, targetElement);
            
            // Add to active tooltips
            this.activeTooltips.set(tooltipId, {
                element: tooltip,
                entity: entity,
                targetElement: targetElement,
                created: Date.now()
            });
            
            // Show with animation
            requestAnimationFrame(() => {
                tooltip.classList.add('visible');
            });
            
            // Add debug info if enabled
            if (this.config.enableDebugMode) {
                this.addDebugInfo(tooltipId, entity, targetElement);
            }
            
            // Set up tooltip event handlers
            this.setupTooltipEventHandlers(tooltip);
            
            console.log(`✅ Tooltip created: ${tooltipId}`);
            
            // Load additional data asynchronously
            this.loadTooltipData(tooltipId, entity);
            
        } catch (error) {
            console.error('Failed to create tooltip:', error);
        }
    }
    
    getTooltipElement() {
        // Try to reuse from pool
        if (this.tooltipPool.length > 0) {
            const tooltip = this.tooltipPool.pop();
            tooltip.className = 'genome-tooltip';
            return tooltip;
        }
        
        // Create new tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'genome-tooltip';
        return tooltip;
    }
    
    buildTooltipContent(entity) {
        const confidenceValue = entity.confidence?.score || entity.confidence || 0;
        const confidencePercent = Math.round(confidenceValue * 100);
        
        let content = `
            <div class="genome-tooltip-header">
                <span>🧬</span>
                <span>Corporate Genome</span>
            </div>
            <div class="genome-tooltip-title">${this.escapeHtml(entity.text)}</div>
        `;
        
        // Add normalized/base name if different
        if (entity.baseName && entity.baseName !== entity.text) {
            content += `<div class="genome-tooltip-subtitle">Base: ${this.escapeHtml(entity.baseName)}</div>`;
        }
        
        // Add knowledge base info if available
        if (entity.knowledgeBase && entity.knowledgeBase.company) {
            const kb = entity.knowledgeBase.company;
            const kbInfo = [];
            if (kb.ticker) kbInfo.push(`${kb.ticker}${kb.exchange ? ` (${kb.exchange})` : ''}`);
            if (kb.industry) kbInfo.push(kb.industry);
            
            if (kbInfo.length > 0) {
                content += `<div class="genome-tooltip-subtitle">${kbInfo.join(' | ')}</div>`;
            }
        }
        
        // Confidence and verification
        content += `
            <div class="genome-tooltip-meta">
                Confidence: ${confidencePercent}%
                ${entity.knowledgeBase ? '<span class="genome-tooltip-verified"> ✓ Verified</span>' : ''}
            </div>
            <div class="genome-tooltip-loading">Loading ownership data...</div>
        `;
        
        return content;
    }
    
    positionTooltip(tooltip, targetElement) {
        try {
            // Get target element bounds
            const targetRect = targetElement.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Calculate available space
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            let top, left;
            let arrowClass = 'top';
            
            // Determine vertical position
            const spaceBelow = viewportHeight - targetRect.bottom;
            const spaceAbove = targetRect.top;
            
            if (spaceBelow >= tooltipRect.height + 20 || spaceBelow > spaceAbove) {
                // Position below target
                top = targetRect.bottom + 10;
                arrowClass = 'top';
            } else {
                // Position above target
                top = targetRect.top - tooltipRect.height - 10;
                arrowClass = 'bottom';
            }
            
            // Determine horizontal position
            left = targetRect.left;
            
            // Keep tooltip within viewport bounds
            if (left + tooltipRect.width > viewportWidth) {
                left = viewportWidth - tooltipRect.width - 10;
            }
            if (left < 10) {
                left = 10;
            }
            
            // Ensure tooltip doesn't go off-screen vertically
            if (top + tooltipRect.height > viewportHeight) {
                top = viewportHeight - tooltipRect.height - 10;
            }
            if (top < 10) {
                top = 10;
            }
            
            // Apply positioning
            if (this.shadowRoot) {
                // Shadow DOM positioning (relative to viewport)
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            } else {
                // Regular DOM positioning (absolute to document)
                tooltip.style.position = 'absolute';
                tooltip.style.top = `${top + scrollY}px`;
                tooltip.style.left = `${left + scrollX}px`;
            }
            
            // Add arrow
            this.addArrow(tooltip, arrowClass, targetRect, left);
            
        } catch (error) {
            console.error('Error positioning tooltip:', error);
            // Fallback positioning
            tooltip.style.position = 'fixed';
            tooltip.style.top = '100px';
            tooltip.style.left = '100px';
        }
    }
    
    addArrow(tooltip, arrowClass, targetRect, tooltipLeft) {
        // Remove existing arrow
        const existingArrow = tooltip.querySelector('.genome-tooltip-arrow');
        if (existingArrow) {
            existingArrow.remove();
        }
        
        // Create new arrow
        const arrow = document.createElement('div');
        arrow.className = `genome-tooltip-arrow ${arrowClass}`;
        
        // Position arrow relative to target element
        const arrowLeft = Math.max(8, Math.min(targetRect.left - tooltipLeft + targetRect.width / 2 - 8, tooltip.offsetWidth - 24));
        arrow.style.left = `${arrowLeft}px`;
        
        tooltip.appendChild(arrow);
    }
    
    setupTooltipEventHandlers(tooltip) {
        // Prevent tooltip from hiding when mouse is over it
        tooltip.addEventListener('mouseenter', () => {
            this.isMouseInTooltip = true;
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        });
        
        tooltip.addEventListener('mouseleave', () => {
            this.isMouseInTooltip = false;
            this.scheduleHide();
        });
    }
    
    async loadTooltipData(tooltipId, entity) {
        try {
            // Simulate loading ownership data
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const tooltipData = this.activeTooltips.get(tooltipId);
            if (!tooltipData) return; // Tooltip was removed
            
            const tooltip = tooltipData.element;
            const loadingElement = tooltip.querySelector('.genome-tooltip-loading');
            
            if (loadingElement) {
                // Replace loading text with mock data
                loadingElement.outerHTML = `
                    <div class="genome-tooltip-content">
                        <div style="font-weight: 600; margin-bottom: 4px;">Major Shareholders:</div>
                        <div>• Vanguard Group - 9.7%</div>
                        <div>• BlackRock Inc. - 7.2%</div>
                        <div>• State Street - 4.8%</div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Failed to load tooltip data:', error);
        }
    }
    
    hideTooltip(tooltipId) {
        const tooltipData = this.activeTooltips.get(tooltipId);
        if (!tooltipData) return;
        
        const tooltip = tooltipData.element;
        
        // Animate out
        tooltip.classList.remove('visible');
        
        // Remove after animation
        setTimeout(() => {
            if (tooltip.parentElement) {
                tooltip.parentElement.removeChild(tooltip);
            }
            
            // Return to pool for reuse
            tooltip.innerHTML = '';
            tooltip.className = 'genome-tooltip';
            this.tooltipPool.push(tooltip);
            
            // Remove from active tooltips
            this.activeTooltips.delete(tooltipId);
            
            console.log(`🗑️ Tooltip removed: ${tooltipId}`);
        }, 200);
    }
    
    hideAllTooltips() {
        const tooltipIds = Array.from(this.activeTooltips.keys());
        tooltipIds.forEach(id => this.hideTooltip(id));
    }
    
    scheduleHide() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        this.hideTimeout = setTimeout(() => {
            if (!this.isMouseInTooltip) {
                this.hideAllTooltips();
            }
        }, this.config.hideDelay);
    }
    
    handleMouseMove(event) {
        // Update mouse position for potential fallback positioning
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
        
        // Check if mouse is over any tooltip
        let overTooltip = false;
        this.activeTooltips.forEach((data, id) => {
            const rect = data.element.getBoundingClientRect();
            if (event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom) {
                overTooltip = true;
            }
        });
        
        this.isMouseInTooltip = overTooltip;
    }
    
    handleScroll() {
        // Reposition all active tooltips
        this.activeTooltips.forEach((data, id) => {
            if (document.contains(data.targetElement)) {
                this.positionTooltip(data.element, data.targetElement);
            } else {
                this.hideTooltip(id);
            }
        });
    }
    
    handleResize() {
        // Hide all tooltips on resize to avoid positioning issues
        this.hideAllTooltips();
    }
    
    addDebugInfo(tooltipId, entity, targetElement) {
        const debugInfo = document.createElement('div');
        debugInfo.className = 'genome-tooltip-debug';
        debugInfo.textContent = `
            ID: ${tooltipId}
            Entity: ${entity.text}
            Confidence: ${entity.confidence?.score || 0}
            Element: ${targetElement.tagName}.${targetElement.className}
            Shadow DOM: ${!!this.shadowRoot}
        `;
        
        const container = this.shadowRoot || document.body;
        container.appendChild(debugInfo);
        
        setTimeout(() => {
            if (debugInfo.parentElement) {
                debugInfo.parentElement.removeChild(debugInfo);
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    cleanup() {
        // Clear timeouts
        if (this.showTimeout) clearTimeout(this.showTimeout);
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        
        // Remove event listeners
        window.removeEventListener('scroll', this.boundHandleScroll);
        window.removeEventListener('resize', this.boundHandleResize);
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        
        // Hide all tooltips
        this.hideAllTooltips();
        
        // Remove shadow DOM
        if (this.shadowHost && this.shadowHost.parentElement) {
            this.shadowHost.parentElement.removeChild(this.shadowHost);
        }
        
        console.log('🧹 Tooltip Manager cleaned up');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedTooltipManager = EnhancedTooltipManager;
}

console.log('✅ Enhanced Tooltip Manager ready');