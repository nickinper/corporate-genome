// Corporate Genome Content Script v0.3.5 - Fixed Constant Assignment Error
console.log('Corporate Genome: Extension loaded with paragraph text detection!');

// Security configuration
const SECURITY_CONFIG = {
    maxDetectionsPerSecond: 15,
    trustedOrigins: new Set([
        'https://www.forbes.com',
        'https://data.sec.gov',
        chrome.runtime.getURL('')
    ]),
    suspiciousMessageThreshold: 50
};

// Security monitoring
class SecurityMonitor {
    constructor() {
        this.messageCount = 0;
        this.detectionCount = 0;
        this.lastReset = Date.now();
        this.suspiciousActivity = false;
    }

    logDetection(companyName) {
        this.detectionCount++;
        const now = Date.now();
        
        if (now - this.lastReset > 1000) {
            if (this.detectionCount > SECURITY_CONFIG.maxDetectionsPerSecond) {
                console.warn('🚨 High detection rate - potential page manipulation');
                this.suspiciousActivity = true;
            }
            this.detectionCount = 0;
            this.lastReset = now;
        }
        
        console.log(`✓ Detected company: ${companyName} (${this.detectionCount}/s)`);
    }

    isSuspicious() {
        return this.suspiciousActivity;
    }

    reset() {
        this.suspiciousActivity = false;
    }
}

const securityMonitor = new SecurityMonitor();

// Track processed elements and create hover card
const processedElements = new WeakSet();
let hoverCard = null;
let currentHoveredElement = null;
let hoverTimeout = null;

// Enhanced company detection patterns
const COMPANY_PATTERNS = {
    exact: [
        'JPMorgan Chase', 'Berkshire Hathaway', 'Saudi Aramco', 'Bank of America',
        'China Construction Bank', 'Agricultural Bank of China', 'Bank of China',
        'Goldman Sachs', 'Morgan Stanley', 'Wells Fargo', 'BlackRock', 'Vanguard',
        'UnitedHealth Group', 'Johnson & Johnson', 'Procter & Gamble',
        'Ping An Insurance', 'Tencent Holdings', 'Taiwan Semiconductor',
        'Samsung Electronics', 'ASML Holding', 'Tesla', 'Meta Platforms',
        'Alphabet', 'Microsoft', 'Apple', 'Amazon',
        'Nvidia', 'Visa', 'Mastercard', 'Walmart', 'Exxon Mobil'
    ],
    suffixes: ['Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co', 'Group', 'plc'],
    types: ['Bank', 'Financial', 'Capital', 'Holdings', 'Insurance', 'Investment', 'Fund', 'Trust', 'Energy', 'Oil']
};

// Mock ownership data
const ownershipData = {
    'berkshire hathaway': {
        owners: [
            { name: 'Warren Buffett', percent: '16.2%', shares: '248,734,628' },
            { name: 'The Vanguard Group', percent: '9.8%', shares: '150,423,891' },
            { name: 'BlackRock Inc', percent: '8.1%', shares: '124,567,234' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    },
    'jpmorgan': {
        owners: [
            { name: 'The Vanguard Group', percent: '7.8%', shares: '235,678,901' },
            { name: 'BlackRock Inc', percent: '6.2%', shares: '187,345,123' },
            { name: 'State Street Corp', percent: '4.9%', shares: '148,234,567' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    },
    'bank of america': {
        owners: [
            { name: 'Berkshire Hathaway', percent: '13.1%', shares: '1,032,852,006' },
            { name: 'The Vanguard Group', percent: '7.4%', shares: '583,456,789' },
            { name: 'BlackRock Inc', percent: '6.8%', shares: '536,789,012' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    },
    'tesla': {
        owners: [
            { name: 'Elon Musk', percent: '20.5%', shares: '411,062,076' },
            { name: 'The Vanguard Group', percent: '7.1%', shares: '142,456,789' },
            { name: 'BlackRock Inc', percent: '5.8%', shares: '116,234,567' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    },
    'apple': {
        owners: [
            { name: 'The Vanguard Group', percent: '7.3%', shares: '1,156,234,567' },
            { name: 'BlackRock Inc', percent: '6.1%', shares: '965,789,012' },
            { name: 'Berkshire Hathaway', percent: '5.8%', shares: '915,560,382' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    },
    default: {
        owners: [
            { name: 'Institutional Investors', percent: '65.3%' },
            { name: 'Individual Investors', percent: '34.7%' }
        ],
        source: 'Mock Data',
        lastUpdated: new Date().toISOString()
    }
};

function getOwnershipData(companyName) {
    const normalized = companyName.toLowerCase();
    for (const [key, data] of Object.entries(ownershipData)) {
        if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
            return data;
        }
    }
    return ownershipData.default;
}

// Create hover card
function createHoverCard() {
    if (hoverCard) return;
    
    hoverCard = document.createElement('div');
    hoverCard.className = 'cg-hover-card';
    hoverCard.style.cssText = `
        position: fixed;
        display: none;
        background: rgba(10, 10, 10, 0.95);
        border: 1px solid rgba(59, 130, 246, 0.5);
        border-radius: 8px;
        padding: 16px;
        min-width: 280px;
        max-width: 400px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e0e0e0;
        font-size: 14px;
        line-height: 1.5;
        backdrop-filter: blur(8px);
        pointer-events: auto;
    `;
    document.body.appendChild(hoverCard);
}

createHoverCard();

// Company name detection
function findCompanyInText(text) {
    const trimmed = text.trim();
    
    // Skip if too short or contains unwanted content
    if (trimmed.length < 3 || trimmed.length > 100) return null;
    if (trimmed.includes('{') || trimmed.includes('<') || trimmed.includes('function')) return null;
    if (trimmed.includes('Corporate Genome') || trimmed.includes('rollbar')) return null;
    
    // Check exact matches first
    for (const company of COMPANY_PATTERNS.exact) {
        if (trimmed.toLowerCase().includes(company.toLowerCase())) {
            return company;
        }
    }
    
    // Check for company suffixes
    const hasSuffix = COMPANY_PATTERNS.suffixes.some(suffix => 
        trimmed.includes(` ${suffix}`) || trimmed.endsWith(suffix)
    );
    
    // Check for company types
    const hasType = COMPANY_PATTERNS.types.some(type => 
        trimmed.toLowerCase().includes(type.toLowerCase())
    );
    
    // If has suffix or type, and looks like a proper name
    if ((hasSuffix || hasType) && /^[A-Z]/.test(trimmed)) {
        const commonWords = ['The', 'This', 'That', 'With', 'From', 'About', 'Contact'];
        if (!commonWords.some(word => trimmed.startsWith(word))) {
            return trimmed;
        }
    }
    
    return null;
}

// Process and wrap company names in text elements
function processTextElement(element) {
    // Skip if already processed or is our hover card
    if (processedElements.has(element)) return;
    if (element.closest && element.closest('.cg-hover-card')) return;
    
    // Skip script, style, and other non-content elements
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) return;
    
    // Get text content
    const text = element.innerText || element.textContent || '';
    if (!text.trim()) return;
    
    // Check if this element contains company names
    const companyName = findCompanyInText(text);
    if (companyName) {
        // Mark as processed
        processedElements.add(element);
        
        // Add data attribute and styling for hover detection
        element.dataset.companyName = companyName;
        element.style.cursor = 'help';
        element.title = `Corporate Genome: ${companyName}`;
        
        // Log detection
        securityMonitor.logDetection(companyName);
        
        console.log(`📈 Enhanced element for: ${companyName}`, element);
        return companyName;
    }
}

// Scan page for company names and enhance elements
function enhancePageElements() {
    // Get all text-containing elements
    const textElements = document.querySelectorAll('p, span, div, td, th, li, h1, h2, h3, h4, h5, h6, a');
    
    let enhancedCount = 0;
    
    textElements.forEach(element => {
        try {
            const companyName = processTextElement(element);
            if (companyName) {
                enhancedCount++;
            }
        } catch (error) {
            // Skip elements that cause errors
        }
    });
    
    console.log(`🔍 Enhanced ${enhancedCount} elements with company detection`);
    return enhancedCount;
}

// Fetch company data
async function fetchCompanyData(companyName) {
    try {
        console.log(`📊 Fetching data for: ${companyName}`);
        
        const mockData = getOwnershipData(companyName);
        updateHoverCard(companyName, mockData);

        // Try SEC data
        try {
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'fetchSECData',
                    companyName: companyName
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Background script communication failed:', chrome.runtime.lastError.message);
                        return;
                    }
                    
                    if (response && response.success && response.data) {
                        console.log('📈 SEC data received, updating card');
                        updateHoverCard(companyName, response.data);
                    }
                });
            }
        } catch (error) {
            console.warn('SEC data fetch failed, using mock data:', error);
        }
    } catch (error) {
        console.error('Error in fetchCompanyData:', error);
        const fallbackData = getOwnershipData(companyName);
        updateHoverCard(companyName, fallbackData);
    }
}

// Update hover card content
function updateHoverCard(companyName, data) {
    if (!hoverCard || hoverCard.style.display === 'none') return;

    const owners = data.owners || [];
    const source = data.source || 'Mock Data';
    
    let ownersHtml = '';
    if (owners.length > 0) {
        ownersHtml = owners.slice(0, 3).map(owner => `
            <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #fff; font-weight: 500; font-size: 13px;">${owner.name}</div>
                <div style="color: #a0a0a0; font-size: 11px;">${owner.percent}${owner.shares ? ` • ${owner.shares} shares` : ''}</div>
            </div>
        `).join('');
    } else {
        ownersHtml = '<div style="color: #a0a0a0;">No ownership data available</div>';
    }

    const isSecure = !securityMonitor.isSuspicious();
    const securityBadge = isSecure ? '🛡️ SECURE' : '⚠️ MONITORING';

    hoverCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <strong style="color: #3b82f6; font-size: 13px;">Corporate Genome</strong>
            <span style="color: ${isSecure ? '#10b981' : '#f59e0b'}; font-size: 9px;">${securityBadge}</span>
        </div>
        <div style="color: #fff; font-weight: 600; margin-bottom: 8px; font-size: 14px;">${companyName}</div>
        <div style="color: #a0a0a0; font-size: 11px; margin-bottom: 8px;">Major Shareholders:</div>
        ${ownersHtml}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #666; font-size: 10px;">Source: ${source}</span>
            <span style="color: #666; font-size: 10px;">${data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : 'N/A'}</span>
        </div>
    `;
}

// Show hover card
function showHoverCard(targetElement, companyName) {
    if (!hoverCard || securityMonitor.isSuspicious()) return;

    if (hoverTimeout) clearTimeout(hoverTimeout);

    hoverCard.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
            <strong style="color: #3b82f6; font-size: 13px;">Corporate Genome</strong>
            <span style="margin-left: auto; color: #10b981; font-size: 9px;">🛡️ SECURE</span>
        </div>
        <div style="color: #a0a0a0; margin-bottom: 8px; font-size: 12px;">Analyzing: ${companyName}</div>
        <div style="color: #666; font-size: 11px;">Fetching ownership data...</div>
    `;

    // Position card
    const rect = targetElement.getBoundingClientRect();
    const cardWidth = 320;
    const cardHeight = 250;
    
    let left = rect.right + 15;
    let top = rect.top;
    
    if (left + cardWidth > window.innerWidth - 20) {
        left = rect.left - cardWidth - 15;
    }
    if (left < 20) {
        left = Math.max(20, window.innerWidth - cardWidth - 20);
        top = rect.bottom + 10;
    }
    if (top + cardHeight > window.innerHeight - 20) {
        top = Math.max(20, window.innerHeight - cardHeight - 20);
    }
    
    hoverCard.style.left = `${left}px`;
    hoverCard.style.top = `${top}px`;
    hoverCard.style.display = 'block';

    // Fetch data
    hoverTimeout = setTimeout(() => {
        fetchCompanyData(companyName);
    }, 100);
}

function hideHoverCard() {
    if (hoverCard) {
        hoverCard.style.display = 'none';
    }
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }
}

// MAIN EVENT LISTENERS - Fixed constant assignment error
document.addEventListener('mouseover', function(event) {
    let hoveredElement = event.target;
    
    // Skip our hover card
    if (hoveredElement.closest && hoveredElement.closest('.cg-hover-card')) return;
    
    // Check if this element or any parent has company data
    let checkElement = hoveredElement;
    let companyName = null;
    let targetElement = hoveredElement;
    
    // Check up to 3 levels up the DOM tree
    for (let i = 0; i < 3 && checkElement; i++) {
        if (checkElement.dataset && checkElement.dataset.companyName) {
            companyName = checkElement.dataset.companyName;
            targetElement = checkElement; // Use the element with the data
            break;
        }
        
        // Also check if current element contains company name
        if (!companyName) {
            const text = checkElement.innerText || checkElement.textContent || '';
            companyName = findCompanyInText(text);
            if (companyName) {
                // Store it for future use
                checkElement.dataset.companyName = companyName;
                checkElement.style.cursor = 'help';
                targetElement = checkElement;
                securityMonitor.logDetection(companyName);
                break;
            }
        }
        
        checkElement = checkElement.parentElement;
    }
    
    if (companyName) {
        currentHoveredElement = targetElement;
        
        setTimeout(() => {
            if (currentHoveredElement === targetElement && !securityMonitor.isSuspicious()) {
                showHoverCard(targetElement, companyName);
            }
        }, 300);
    }
});

document.addEventListener('mouseout', function(event) {
    const element = event.target;
    const movingToCard = event.relatedTarget && 
                        event.relatedTarget.closest && 
                        event.relatedTarget.closest('.cg-hover-card');
    
    if (!movingToCard && currentHoveredElement === element) {
        setTimeout(() => {
            if (!hoverCard?.matches(':hover')) {
                hideHoverCard();
                currentHoveredElement = null;
            }
        }, 150);
    }
});

// Initialize detection
function initializeDetection() {
    console.log('🔍 Scanning page for companies...');
    try {
        const enhancedCount = enhancePageElements();
        console.log(`📊 Enhanced ${enhancedCount} elements for company detection`);
    } catch (error) {
        console.warn('Error during initialization:', error);
    }
}

// Run initial scan
setTimeout(initializeDetection, 1000);

// Re-scan when page content changes
let rescanTimeout = null;
const observer = new MutationObserver((mutations) => {
    if (rescanTimeout) return;
    
    let shouldRescan = false;
    
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    shouldRescan = true;
                    break;
                }
            }
        }
    });
    
    if (shouldRescan) {
        rescanTimeout = setTimeout(() => {
            console.log('🔄 Content changed, re-scanning...');
            enhancePageElements();
            rescanTimeout = null;
        }, 1000);
    }
});

if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Security reset
setInterval(() => {
    securityMonitor.reset();
}, 30000);

// Add CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .cg-hover-card {
        transition: opacity 0.2s ease-in-out;
    }
`;
document.head.appendChild(style);

console.log('🛡️ Corporate Genome content script loaded with fixed variable assignments');