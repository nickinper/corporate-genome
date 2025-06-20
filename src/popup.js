// Corporate Genome Popup v0.5.0 - WITH SECURITY SETTINGS
console.log('Corporate Genome: Enhanced Popup loaded');

document.addEventListener('DOMContentLoaded', () => {
    // Your existing popup code...
    setupExistingFeatures();
    
    // NEW: Add security settings
    setupSecuritySettings();
});

function setupExistingFeatures() {
    // ... your existing popup code ...
}

// NEW: Security settings panel
function setupSecuritySettings() {
    const securityPanel = document.getElementById('security-panel');
    if (!securityPanel) return;
    
    // Load current API key status
    loadAPIKeyStatus();
    
    // Setup API key form
    const apiKeyForm = document.getElementById('api-key-form');
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', handleAPIKeySubmit);
    }
    
    // Setup vault reset
    const resetButton = document.getElementById('reset-vault');
    if (resetButton) {
        resetButton.addEventListener('click', handleVaultReset);
    }
}

async function loadAPIKeyStatus() {
    try {
        const vault = window.getSecureVault();
        if (!vault) {
            document.getElementById('vault-status').textContent = 'Vault not initialized';
            return;
        }
        
        const keys = await vault.retrieveAPIKeys([
            'newsApi', 'fredApi', 'opencorporates'
        ]);
        
        // Update UI to show which keys are configured
        Object.entries(keys).forEach(([keyName, keyValue]) => {
            const indicator = document.getElementById(`${keyName}-indicator`);
            if (indicator) {
                indicator.textContent = keyValue ? '✅ Configured' : '❌ Not set';
                indicator.className = keyValue ? 'key-configured' : 'key-missing';
            }
        });
        
    } catch (error) {
        console.error('Failed to load API key status:', error);
    }
}

async function handleAPIKeySubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const vault = window.getSecureVault();
        
        if (!vault) {
            alert('Vault not initialized. Please refresh and enter your passphrase.');
            return;
        }
        
        const keys = {};
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                keys[key] = value.trim();
            }
        }
        
        const results = await vault.storeAPIKeys(keys);
        
        // Show results
        let message = 'API Keys updated:\n';
        Object.entries(results).forEach(([key, status]) => {
            message += `${key}: ${status}\n`;
        });
        
        alert(message);
        loadAPIKeyStatus(); // Refresh status display
        
    } catch (error) {
        console.error('Failed to store API keys:', error);
        alert('Failed to store API keys: ' + error.message);
    }
}

async function handleVaultReset() {
    if (!confirm('Are you sure you want to reset the secure vault? This will delete all stored API keys.')) {
        return;
    }
    
    try {
        await chrome.storage.local.clear();
        alert('Vault reset successfully. Please refresh the page.');
        window.location.reload();
    } catch (error) {
        console.error('Failed to reset vault:', error);
        alert('Failed to reset vault: ' + error.message);
    }
}

console.log('🔧 Enhanced Corporate Genome popup ready!');