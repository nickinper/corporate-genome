// Corporate Genome Content Script v2 - Multi-Site Entity Resolution
console.log('🧬 Corporate Genome v2: Multi-site content script loaded');

// Load site-specific adapters
const loadSiteAdapter = async () => {
    const hostname = window.location.hostname;
    
    // Dynamically inject the appropriate adapter
    const adapterMap = {
        'finance.yahoo.com': 'yahoo-finance.js',
        'www.bloomberg.com': 'bloomberg.js',
        'www.marketwatch.com': 'marketwatch.js'
    };
    
    const adapterFile = adapterMap[hostname];
    if (adapterFile) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(`src/modules/recognition/site-adapters/${adapterFile}`);
        script.onload = () => console.log(`✅ Loaded ${adapterFile} adapter`);
        document.head.appendChild(script);
    }
};

// Initialize when DOM is ready
const initializeEnhancedGenome = async () => {
    console.log('🎯 Initializing Enhanced Corporate Genome...');
    
    try {
        // Load required modules (already injected by manifest)
        // The modules are available globally
        
        // Import intelligence engine v2
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/core/intelligence-engine-v2.js');
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        // Load site adapter if needed
        await loadSiteAdapter();
        
        // Wait for engine factory to be available
        let attempts = 0;
        while (!window.createEnhancedGenome && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.createEnhancedGenome) {
            throw new Error('Enhanced genome engine factory not available');
        }
        
        // Create and initialize the engine
        const enhancedGenome = window.createEnhancedGenome();
        const initialized = await enhancedGenome.initialize();
        
        if (initialized) {
            console.log('✅ Enhanced Corporate Genome initialized successfully');
            
            // Add visual indicator
            addStatusIndicator('active');
            
            // Listen for messages from popup/background
            chrome.runtime.onMessage.addListener(handleMessage);
        } else {
            console.log('❌ Site not supported or initialization failed');
            addStatusIndicator('unsupported');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Enhanced Corporate Genome:', error);
        addStatusIndicator('error');
    }
};

// Add visual status indicator
const addStatusIndicator = (status) => {
    const indicator = document.createElement('div');
    indicator.id = 'genome-status-indicator';
    
    const statusConfig = {
        active: { color: '#28a745', text: '🧬', title: 'Corporate Genome Active' },
        unsupported: { color: '#6c757d', text: '🧬', title: 'Site Not Supported' },
        error: { color: '#dc3545', text: '⚠️', title: 'Error Initializing' }
    };
    
    const config = statusConfig[status];
    
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: ${config.color};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    indicator.textContent = config.text;
    indicator.title = config.title;
    
    // Add hover effect
    indicator.addEventListener('mouseenter', () => {
        indicator.style.transform = 'scale(1.1)';
    });
    
    indicator.addEventListener('mouseleave', () => {
        indicator.style.transform = 'scale(1)';
    });
    
    // Click to show metrics
    indicator.addEventListener('click', () => {
        if (window.enhancedGenome) {
            showMetrics();
        }
    });
    
    document.body.appendChild(indicator);
};

// Show performance metrics
const showMetrics = () => {
    const metrics = window.enhancedGenome.getMetrics();
    
    // Remove existing metrics display
    const existingMetrics = document.getElementById('genome-metrics');
    if (existingMetrics) {
        existingMetrics.remove();
        return;
    }
    
    const metricsDiv = document.createElement('div');
    metricsDiv.id = 'genome-metrics';
    
    metricsDiv.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">
            🧬 Corporate Genome Metrics
        </div>
        <div>Current Site: <strong>${metrics.currentSite || 'Unknown'}</strong></div>
        <div>Entities Detected: <strong>${metrics.entitiesDetected}</strong></div>
        <div>Total Detections: <strong>${metrics.totalDetections}</strong></div>
        <div>Average Confidence: <strong>${(metrics.averageConfidence * 100).toFixed(1)}%</strong></div>
        <hr style="margin: 10px 0;">
        <div style="font-size: 12px;">
            <div>Site-Specific Metrics:</div>
            ${Array.from(metrics.siteMetrics || []).map(([site, data]) => `
                <div style="margin-left: 10px;">
                    ${site}: ${data.detections} detections, 
                    ${(data.avgConfidence * 100).toFixed(1)}% avg confidence
                </div>
            `).join('')}
        </div>
        <hr style="margin: 10px 0;">
        <div style="text-align: center;">
            <button id="genome-close-metrics" style="
                padding: 5px 15px;
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            ">Close</button>
        </div>
    `;
    
    metricsDiv.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        width: 300px;
        background: white;
        border: 2px solid #0066cc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;
    
    document.body.appendChild(metricsDiv);
    
    // Add close handler
    document.getElementById('genome-close-metrics').addEventListener('click', () => {
        metricsDiv.remove();
    });
};

// Handle messages from popup/background
const handleMessage = (request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    switch (request.action) {
        case 'getDetectedEntities':
            const entities = Array.from(window.enhancedGenome.detectedEntities.values());
            sendResponse({ entities });
            break;
            
        case 'getMetrics':
            const metrics = window.enhancedGenome.getMetrics();
            sendResponse({ metrics });
            break;
            
        case 'highlightEntity':
            const entity = window.enhancedGenome.detectedEntities.get(request.entityId);
            if (entity && window.enhancedGenome.currentAdapter) {
                window.enhancedGenome.currentAdapter.highlightEntity(entity);
            }
            sendResponse({ success: true });
            break;
            
        case 'rescan':
            // Trigger a rescan of the page
            if (window.enhancedGenome && window.enhancedGenome.currentAdapter) {
                window.enhancedGenome.currentAdapter.detectEntities()
                    .then(entities => sendResponse({ success: true, count: entities.length }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Async response
            }
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
};

// Add custom styles for enhanced features
const addCustomStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Corporate Genome Enhanced Styles */
        .genome-tooltip {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
        }
        
        .genome-highlighted {
            transition: all 0.3s ease;
        }
        
        #genome-status-indicator:hover {
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        
        #genome-metrics {
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    document.head.appendChild(style);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        addCustomStyles();
        initializeEnhancedGenome();
    });
} else {
    addCustomStyles();
    initializeEnhancedGenome();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.enhancedGenome) {
        window.enhancedGenome.cleanup();
    }
});

console.log('🎯 Enhanced Corporate Genome content script ready!');