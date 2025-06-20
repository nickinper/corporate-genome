// Corporate Genome Content Script v0.5.0 - Enhanced with Security
console.log('🧬 Corporate Genome: Enhanced Content Script loaded');

// Use the global secure vault (already initialized by key-vault.js)
// Don't redeclare secureVault here

let corporateGenomeInitialized = false;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCorporateGenome);
} else {
    initializeCorporateGenome();
}

function initializeCorporateGenome() {
    if (corporateGenomeInitialized) return;
    
    console.log('🎯 Initializing Corporate Genome...');
    
    // Check if we're on a Forbes company page
    if (!isForbesCompanyPage()) {
        console.log('Not a Forbes company page, skipping...');
        return;
    }
    
    // Extract company name
    const companyName = extractCompanyName();
    if (!companyName) {
        console.log('Could not extract company name');
        return;
    }
    
    console.log(`🏢 Detected company: ${companyName}`);
    
    // Create and inject the widget
    createOwnershipWidget(companyName);
    
    // Fetch and display data
    fetchAndDisplayData(companyName);
    
    corporateGenomeInitialized = true;
}

function isForbesCompanyPage() {
    // Check multiple patterns for Forbes company pages
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    console.log('🔍 Checking URL:', url);
    console.log('🔍 Checking pathname:', pathname);
    
    // Multiple patterns to catch different Forbes company page formats
    const patterns = [
        /\/companies\/[^\/]+\/?$/,           // /companies/apple/
        /\/company\/[^\/]+\/?$/,             // /company/apple/
        /\/lists\/.*\/companies\/[^\/]+/,    // /lists/global2000/companies/apple/
        /\/profile\/[^\/]+\/?$/,             // /profile/apple/
        /global2000.*companies/,             // Global 2000 company pages
    ];
    
    // Check if any pattern matches
    const isCompanyPage = patterns.some(pattern => pattern.test(pathname)) ||
                         url.includes('/companies/') ||
                         url.includes('/company/') ||
                         url.includes('/profile/');
    
    console.log('🔍 Is company page?', isCompanyPage);
    
    return isCompanyPage;
}

function extractCompanyName() {
    console.log('🔍 Extracting company name...');
    
    // Method 1: Extract from URL patterns
    const pathname = window.location.pathname.toLowerCase();
    
    // Try different URL patterns
    const urlPatterns = [
        /\/companies\/([^\/\?]+)/,
        /\/company\/([^\/\?]+)/,
        /\/profile\/([^\/\?]+)/,
        /\/lists\/[^\/]*\/companies\/([^\/\?]+)/
    ];
    
    for (const pattern of urlPatterns) {
        const match = pathname.match(pattern);
        if (match) {
            const companyName = match[1].replace(/-/g, ' ').trim();
            console.log('🏢 Company from URL:', companyName);
            return companyName;
        }
    }
    
    // Method 2: Extract from page title
    const title = document.title;
    console.log('🔍 Page title:', title);
    
    // Try to extract company name from title
    const titlePatterns = [
        /^([^|]+)\s*\|/,                    // "Apple | Stock Price..."
        /^([^-]+)\s*-/,                     // "Apple - Company Overview"
        /^(.+?)\s*Stock Price/i,            // "Apple Stock Price"
        /^(.+?)\s*Company Overview/i,       // "Apple Company Overview"
    ];
    
    for (const pattern of titlePatterns) {
        const match = title.match(pattern);
        if (match) {
            const companyName = match[1].trim();
            console.log('🏢 Company from title:', companyName);
            return companyName;
        }
    }
    
    // Method 3: Look for company name in page content
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
        const text = h1.textContent.trim();
        if (text && text.length > 2 && text.length < 50) {
            console.log('🏢 Company from H1:', text);
            return text;
        }
    }
    
    console.log('❌ Could not extract company name');
    return null;
}

function createOwnershipWidget(companyName) {
    // Remove existing widget if it exists
    const existingWidget = document.getElementById('corporate-genome-widget');
    if (existingWidget) {
        existingWidget.remove();
    }
    
    // Create the widget container
    const widget = document.createElement('div');
    widget.id = 'corporate-genome-widget';
    widget.innerHTML = `
        <div class="cg-header">
            <h3>🧬 Corporate Genome</h3>
            <div class="cg-loading">Loading ownership data...</div>
        </div>
        <div class="cg-content" id="cg-content">
            <!-- Data will be populated here -->
        </div>
    `;
    
    // Add basic styles
    widget.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        max-height: 600px;
        background: white;
        border: 2px solid #0066cc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        overflow-y: auto;
        padding: 15px;
    `;
    
    // Inject into page
    document.body.appendChild(widget);
    
    console.log('✅ Corporate Genome widget created');
}

async function fetchAndDisplayData(companyName) {
    try {
        console.log(`🎯 Fetching enhanced data for: ${companyName}`);
        
        // Show loading state
        const loadingDiv = document.querySelector('.cg-loading');
        if (loadingDiv) {
            loadingDiv.textContent = 'Fetching data from multiple sources...';
        }
        
        // Request enhanced data from background script
        const response = await chrome.runtime.sendMessage({
            action: 'fetchEnhancedData',
            companyName: companyName,
            includeInternational: true,
            includeGovernment: true,
            includeContext: false
        });
        
        if (response.success) {
            console.log('✅ Data fetched successfully:', response.data);
            displayEnhancedOwnershipData(response.data);
        } else {
            console.error('❌ Data fetch failed:', response.error);
            displayError(response.error);
        }
        
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        displayError('Failed to fetch ownership data: ' + error.message);
    }
}

function displayEnhancedOwnershipData(data) {
    const contentDiv = document.getElementById('cg-content');
    const loadingDiv = document.querySelector('.cg-loading');
    
    if (!contentDiv) return;
    
    // Hide loading indicator
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
    
    let html = '<div class="cg-enhanced-data">';
    
    // Yahoo Finance data (traditional ownership)
    if (data.yahoo?.owners?.length > 0) {
        html += '<div class="cg-section">';
        html += '<h4>🏢 Major Shareholders</h4>';
        data.yahoo.owners.slice(0, 5).forEach(owner => {
            html += `<div class="cg-owner">
                <strong>${owner.name}</strong>: ${owner.percent}
                ${owner.shares ? `<br><small>${Number(owner.shares).toLocaleString()} shares</small>` : ''}
            </div>`;
        });
        html += '</div>';
    }
    
    // International entities
    if (data.international?.entities?.length > 0) {
        html += '<div class="cg-section">';
        html += '<h4>🌍 International Entities</h4>';
        data.international.entities.slice(0, 3).forEach(entity => {
            html += `<div class="cg-entity">
                📍 <strong>${entity.name}</strong><br>
                <small>${entity.jurisdiction} • ${entity.status}</small>
            </div>`;
        });
        html += '</div>';
    }
    
    // Government contracts
    if (data.government?.contracts?.length > 0) {
        html += '<div class="cg-section">';
        html += '<h4>🏛️ Government Contracts</h4>';
        data.government.contracts.slice(0, 3).forEach(contract => {
            const amount = contract.amount ? `$${contract.amount.toLocaleString()}` : 'Amount not disclosed';
            html += `<div class="cg-contract">
                💰 <strong>${contract.agency}</strong><br>
                <small>${amount}</small>
            </div>`;
        });
        html += '</div>';
    }
    
    // Add timestamp
    if (data.timestamp) {
        html += `<div class="cg-timestamp">
            <small>Updated: ${new Date(data.timestamp).toLocaleTimeString()}</small>
        </div>`;
    }
    
    html += '</div>';
    
    // Add styles for the content
    html += `<style>
        .cg-section { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .cg-section h4 { margin: 0 0 10px 0; color: #0066cc; }
        .cg-owner, .cg-entity, .cg-contract { margin: 8px 0; padding: 5px; background: white; border-radius: 3px; }
        .cg-timestamp { text-align: center; margin-top: 15px; color: #666; }
        .cg-enhanced-data { max-height: 500px; overflow-y: auto; }
    </style>`;
    
    contentDiv.innerHTML = html;
    
    console.log('✅ Enhanced ownership data displayed');
}

function displayError(message) {
    const contentDiv = document.getElementById('cg-content');
    const loadingDiv = document.querySelector('.cg-loading');
    
    if (!contentDiv) return;
    
    // Hide loading indicator
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
    
    contentDiv.innerHTML = `
        <div class="cg-error">
            <h4>⚠️ Error</h4>
            <p>${message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>
        <style>
            .cg-error { 
                padding: 15px; 
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                border-radius: 5px; 
                text-align: center; 
            }
            .cg-error button { 
                padding: 8px 15px; 
                background: #0066cc; 
                color: white; 
                border: none; 
                border-radius: 3px; 
                cursor: pointer; 
                margin-top: 10px;
            }
        </style>
    `;
}

console.log('🎯 Enhanced Corporate Genome content script ready!');