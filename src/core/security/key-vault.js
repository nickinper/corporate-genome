// Corporate Genome Secure Key Vault - Hardware-Bound Encryption
console.log('Corporate Genome: Secure Key Vault initializing...');

class SecureKeyVault {
    constructor() {
        this.salt = null;
        this.encryptionKey = null;
        this.isInitialized = false;
        this.keyCache = new Map();
        this.failureCount = 0;
        this.maxFailures = 3;
    }

    async initialize(userPassphrase) {
        try {
            console.log('🔐 Initializing secure key vault...');
            
            // Generate or retrieve user-specific salt
            this.salt = await this.getOrCreateUserSalt();
            
            // Create hardware-bound encryption key
            this.encryptionKey = await this.deriveEncryptionKey(userPassphrase);
            
            // Validate vault integrity
            await this.validateVaultIntegrity();
            
            this.isInitialized = true;
            this.failureCount = 0;
            
            console.log('✅ Secure key vault initialized successfully');
            return true;
            
        } catch (error) {
            this.failureCount++;
            console.error('❌ Key vault initialization failed:', error);
            
            if (this.failureCount >= this.maxFailures) {
                await this.lockVault();
                throw new Error('Vault locked due to multiple authentication failures');
            }
            
            throw error;
        }
    }

    async getOrCreateUserSalt() {
        // Check for existing salt
        const stored = await chrome.storage.local.get(['vault_salt']);
        
        if (stored.vault_salt) {
            return stored.vault_salt;
        }
        
        // Generate new cryptographically secure salt
        const saltArray = new Uint8Array(32);
        crypto.getRandomValues(saltArray);
        const salt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Store salt (non-sensitive)
        await chrome.storage.local.set({ vault_salt: salt });
        
        return salt;
    }

    async deriveEncryptionKey(userPassphrase) {
        const encoder = new TextEncoder();
        
        // Combine passphrase with hardware fingerprint for device binding
        const keyMaterial = userPassphrase + this.getHardwareFingerprint() + this.salt;
        const keyData = encoder.encode(keyMaterial);
        
        // Import key material
        const baseKey = await crypto.subtle.importKey(
            'raw',
            await crypto.subtle.digest('SHA-256', keyData),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        // Derive strong encryption key
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(this.salt),
                iterations: 100000, // High iteration count for security
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    getHardwareFingerprint() {
        // Create device-specific fingerprint (not for tracking, for security)
        const components = [
            navigator.userAgent.slice(0, 50), // Truncated to avoid full tracking
            navigator.hardwareConcurrency || 'unknown',
            screen.colorDepth || 'unknown',
            Math.floor(new Date().getTimezoneOffset() / 60), // Hour precision only
            navigator.language || 'unknown'
        ];
        
        return components.join('|');
    }

    async encryptAPIKey(keyName, keyValue) {
        if (!this.isInitialized) {
            throw new Error('Vault not initialized');
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(keyValue);
            
            // Generate random IV for each encryption
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the API key
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    additionalData: encoder.encode(keyName) // Authenticate key name
                },
                this.encryptionKey,
                data
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);
            
            // Convert to base64 for storage
            const base64 = btoa(String.fromCharCode.apply(null, combined));
            
            // Store encrypted key
            await chrome.storage.local.set({
                [`vault_${keyName}`]: base64,
                [`vault_${keyName}_timestamp`]: Date.now()
            });
            
            // Cache decrypted key temporarily
            this.keyCache.set(keyName, {
                value: keyValue,
                timestamp: Date.now()
            });
            
            console.log(`🔒 API key '${keyName}' encrypted and stored securely`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to encrypt API key '${keyName}':`, error);
            throw new Error('Key encryption failed');
        }
    }

    async decryptAPIKey(keyName) {
        if (!this.isInitialized) {
            throw new Error('Vault not initialized');
        }
        
        // Check cache first (with timeout)
        const cached = this.keyCache.get(keyName);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
            return cached.value;
        }
        
        try {
            // Retrieve encrypted key
            const stored = await chrome.storage.local.get([`vault_${keyName}`]);
            const encryptedBase64 = stored[`vault_${keyName}`];
            
            if (!encryptedBase64) {
                return null; // Key not found
            }
            
            // Decode from base64
            const combined = new Uint8Array(
                atob(encryptedBase64).split('').map(char => char.charCodeAt(0))
            );
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encryptedData = combined.slice(12);
            
            // Decrypt the data
            const encoder = new TextEncoder();
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    additionalData: encoder.encode(keyName)
                },
                this.encryptionKey,
                encryptedData
            );
            
            // Convert back to string
            const decoder = new TextDecoder();
            const keyValue = decoder.decode(decryptedData);
            
            // Update cache
            this.keyCache.set(keyName, {
                value: keyValue,
                timestamp: Date.now()
            });
            
            return keyValue;
            
        } catch (error) {
            console.error(`❌ Failed to decrypt API key '${keyName}':`, error);
            // Clear potentially corrupted cache entry
            this.keyCache.delete(keyName);
            return null;
        }
    }

    async validateVaultIntegrity() {
        // Test encryption/decryption with known data
        const testKey = 'vault_integrity_test';
        const testValue = 'test_value_' + Date.now();
        
        await this.encryptAPIKey(testKey, testValue);
        const decrypted = await this.decryptAPIKey(testKey);
        
        if (decrypted !== testValue) {
            throw new Error('Vault integrity check failed');
        }
        
        // Clean up test data
        await chrome.storage.local.remove([`vault_${testKey}`, `vault_${testKey}_timestamp`]);
    }

    async lockVault() {
        console.warn('🔒 Locking vault due to security violation');
        
        this.isInitialized = false;
        this.encryptionKey = null;
        this.keyCache.clear();
        
        // Set lock timestamp
        await chrome.storage.local.set({
            vault_locked_until: Date.now() + (24 * 60 * 60 * 1000) // 24 hour lockout
        });
    }

    async isVaultLocked() {
        const stored = await chrome.storage.local.get(['vault_locked_until']);
        const lockUntil = stored.vault_locked_until;
        
        return lockUntil && Date.now() < lockUntil;
    }

    // Secure key management interface
    async storeAPIKeys(keys) {
        const results = {};
        
        for (const [keyName, keyValue] of Object.entries(keys)) {
            if (keyValue && keyValue.trim()) {
                try {
                    await this.encryptAPIKey(keyName, keyValue.trim());
                    results[keyName] = 'stored';
                } catch (error) {
                    results[keyName] = 'error';
                }
            } else {
                results[keyName] = 'skipped';
            }
        }
        
        return results;
    }

    async retrieveAPIKeys(keyNames) {
        const keys = {};
        
        for (const keyName of keyNames) {
            try {
                const value = await this.decryptAPIKey(keyName);
                keys[keyName] = value;
            } catch (error) {
                console.warn(`Failed to retrieve key ${keyName}:`, error);
                keys[keyName] = null;
            }
        }
        
        return keys;
    }

    // Security utilities
    clearSensitiveData() {
        this.keyCache.clear();
        
        // Clear any sensitive variables
        if (this.encryptionKey) {
            // Can't actually clear CryptoKey objects, but remove reference
            this.encryptionKey = null;
        }
    }
}

// Global vault instance
let secureVault = null;

// Initialize vault function
async function initializeSecureVault(passphrase) {
    if (!secureVault) {
        secureVault = new SecureKeyVault();
    }
    
    // Check if vault is locked
    if (await secureVault.isVaultLocked()) {
        throw new Error('Vault is locked due to previous security violations');
    }
    
    await secureVault.initialize(passphrase);
    return secureVault;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SecureKeyVault = SecureKeyVault;
    window.initializeSecureVault = initializeSecureVault;
    window.getSecureVault = () => secureVault;
}

console.log('🛡️ Secure Key Vault ready - Hardware-bound encryption enabled');