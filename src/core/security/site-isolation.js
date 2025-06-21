// Corporate Genome: Site Isolation Membrane - Secure Multi-Domain Execution
console.log('Corporate Genome: Site Isolation Membrane initializing...');

// Custom SecurityError class
class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityError';
    }
}

class SiteIsolationMembrane {
    constructor() {
        // Strict origin validation patterns
        this.trustedOrigins = new Map([
            ['forbes', /^https:\/\/(www\.)?forbes\.com/],
            ['yahoo', /^https:\/\/finance\.yahoo\.com/],
            ['bloomberg', /^https:\/\/(www\.)?bloomberg\.com/],
            ['marketwatch', /^https:\/\/(www\.)?marketwatch\.com/]
        ]);
        
        // Isolated execution contexts per site
        this.sandboxes = new Map();
        this.executionLimits = {
            maxExecutionTime: 200, // ms
            maxMemoryUsage: 10 * 1024 * 1024, // 10MB
            maxDOMQueries: 100,
            maxStringLength: 10000
        };
        
        // Security monitoring
        this.violationLog = new Map();
        this.performanceMetrics = new Map();
    }

    validateOrigin(origin) {
        try {
            const url = new URL(origin);
            
            for (const [siteName, pattern] of this.trustedOrigins) {
                if (pattern.test(url.origin)) {
                    return { valid: true, site: siteName };
                }
            }
            
            return { valid: false, site: null };
        } catch (error) {
            console.error('Invalid origin:', error);
            return { valid: false, site: null };
        }
    }

    createIsolatedContext(site, origin) {
        const contextId = `${site}_${Date.now()}`;
        
        // Create isolated execution sandbox
        const sandbox = {
            id: contextId,
            site: site,
            origin: origin,
            startTime: Date.now(),
            resourceUsage: {
                domQueries: 0,
                memoryUsed: 0,
                executionTime: 0
            },
            permissions: this.getSitePermissions(site)
        };
        
        // Wrap in Proxy for access control
        const proxiedSandbox = new Proxy(sandbox, {
            get: (target, prop) => {
                // Check execution time limit
                const elapsed = Date.now() - target.startTime;
                if (elapsed > this.executionLimits.maxExecutionTime) {
                    this.handleViolation(site, 'EXECUTION_TIME_EXCEEDED', elapsed);
                    throw new SecurityError(`Execution time limit exceeded for ${site}`);
                }
                
                // Validate property access
                if (!this.isPermittedOperation(site, prop)) {
                    this.handleViolation(site, 'UNAUTHORIZED_ACCESS', prop);
                    throw new SecurityError(`Operation ${prop} not permitted for ${site}`);
                }
                
                return Reflect.get(target, prop);
            },
            
            set: (target, prop, value) => {
                // Validate memory usage
                if (prop === 'memoryUsed') {
                    if (value > this.executionLimits.maxMemoryUsage) {
                        this.handleViolation(site, 'MEMORY_LIMIT_EXCEEDED', value);
                        throw new SecurityError(`Memory limit exceeded for ${site}`);
                    }
                }
                
                return Reflect.set(target, prop, value);
            }
        });
        
        this.sandboxes.set(contextId, proxiedSandbox);
        return proxiedSandbox;
    }

    getSitePermissions(site) {
        // Site-specific permission profiles
        const permissions = {
            forbes: {
                allowedSelectors: ['article', '.article-text', 'h1', 'h2', 'p', 'a'],
                allowedAPIs: ['textContent', 'getAttribute', 'closest'],
                maxDepth: 5
            },
            yahoo: {
                allowedSelectors: ['[data-symbol]', '.quote-header', '.company-name', 'h1', 'span'],
                allowedAPIs: ['textContent', 'getAttribute', 'dataset', 'closest'],
                maxDepth: 6
            },
            bloomberg: {
                allowedSelectors: ['.article-content', '.headline', '.ticker', 'article', 'h1'],
                allowedAPIs: ['textContent', 'getAttribute', 'closest', 'querySelector'],
                maxDepth: 5
            },
            marketwatch: {
                allowedSelectors: ['.article__body', '.ticker', 'h1', '.company-name', 'a[href*="investing"]'],
                allowedAPIs: ['textContent', 'getAttribute', 'href', 'closest'],
                maxDepth: 5
            }
        };
        
        return permissions[site] || permissions.forbes; // Default to most restrictive
    }

    isPermittedOperation(site, operation) {
        const allowedOps = new Set([
            'detectEntities',
            'extractText', 
            'findElements',
            'getContext',
            'sanitize',
            'id',
            'resourceUsage',
            'performance'
        ]);
        
        return allowedOps.has(operation);
    }

    executeInSandbox(site, origin, callback) {
        const currentOrigin = window.location.origin;
        let isTrusted = false;

        for (const [site, pattern] of this.trustedOrigins) {
            if (pattern.test(currentOrigin)) {
                isTrusted = true;
                break;
            }
        }

        if (!isTrusted) {
            throw new SecurityError(`Untrusted origin: ${currentOrigin}`);
        }
        
        const validation = this.validateOrigin(currentOrigin);
        if (!validation.valid) {
            throw new SecurityError(`Invalid origin validation: ${currentOrigin}`);
        }
        
        const sandbox = this.createIsolatedContext(validation.site, origin);
        const startTime = performance.now();
        
        try {
            // Execute with timeout protection
            const timeoutId = setTimeout(() => {
                throw new SecurityError(`Execution timeout for ${site}`);
            }, this.executionLimits.maxExecutionTime);
            
            const result = callback(sandbox);
            clearTimeout(timeoutId);
            
            // Record performance metrics
            const executionTime = performance.now() - startTime;
            this.recordMetrics(site, {
                executionTime,
                resourceUsage: sandbox.resourceUsage,
                success: true
            });
            
            return result;
            
        } catch (error) {
            this.handleViolation(site, 'EXECUTION_ERROR', error.message);
            throw error;
        } finally {
            // Cleanup sandbox
            this.sandboxes.delete(sandbox.id);
        }
    }

    sanitizeDOMQuery(selector, permissions) {
        // Validate selector against whitelist
        const allowedSelectors = permissions.allowedSelectors;
        
        // Check if selector matches any allowed pattern
        const isAllowed = allowedSelectors.some(allowed => {
            if (selector === allowed) return true;
            if (allowed.includes('*') && selector.includes(allowed.replace('*', ''))) return true;
            return false;
        });
        
        if (!isAllowed) {
            throw new SecurityError(`Selector not allowed: ${selector}`);
        }
        
        // Sanitize selector to prevent injection
        return selector
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .slice(0, 200); // Length limit
    }

    createSafeDOM(element, sandbox) {
        // Create a safe wrapper around DOM elements
        return new Proxy(element, {
            get: (target, prop) => {
                // Track DOM access
                sandbox.resourceUsage.domQueries++;
                
                if (sandbox.resourceUsage.domQueries > this.executionLimits.maxDOMQueries) {
                    throw new SecurityError('DOM query limit exceeded');
                }
                
                // Only allow whitelisted properties/methods
                if (!sandbox.permissions.allowedAPIs.includes(prop)) {
                    throw new SecurityError(`DOM API not allowed: ${prop}`);
                }
                
                const value = target[prop];
                
                // Wrap functions to maintain security context
                if (typeof value === 'function') {
                    return (...args) => {
                        // Validate arguments
                        args = args.map(arg => {
                            if (typeof arg === 'string') {
                                return this.sanitizeString(arg);
                            }
                            return arg;
                        });
                        
                        const result = value.apply(target, args);
                        
                        // Wrap returned elements
                        if (result instanceof Element) {
                            return this.createSafeDOM(result, sandbox);
                        }
                        
                        return result;
                    };
                }
                
                // Sanitize string values
                if (typeof value === 'string') {
                    return this.sanitizeString(value);
                }
                
                return value;
            }
        });
    }

    sanitizeString(str) {
        if (typeof str !== 'string') return str;
        
        return str
            .slice(0, this.executionLimits.maxStringLength)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/\x00-\x1f/g, ''); // Remove control characters
    }

    handleViolation(site, violationType, details) {
        console.warn(`Security violation - Site: ${site}, Type: ${violationType}`, details);
        
        // Track violations
        const violations = this.violationLog.get(site) || [];
        violations.push({
            type: violationType,
            details,
            timestamp: Date.now()
        });
        
        this.violationLog.set(site, violations);
        
        // Escalate if too many violations
        if (violations.length > 10) {
            console.error(`Site ${site} has excessive violations. Blocking execution.`);
            this.trustedOrigins.delete(site);
        }
    }

    recordMetrics(site, metrics) {
        const siteMetrics = this.performanceMetrics.get(site) || {
            totalExecutions: 0,
            averageExecutionTime: 0,
            violations: 0
        };
        
        siteMetrics.totalExecutions++;
        siteMetrics.averageExecutionTime = 
            (siteMetrics.averageExecutionTime * (siteMetrics.totalExecutions - 1) + metrics.executionTime) 
            / siteMetrics.totalExecutions;
        
        if (!metrics.success) {
            siteMetrics.violations++;
        }
        
        this.performanceMetrics.set(site, siteMetrics);
    }

    getSecurityReport() {
        return {
            violations: Object.fromEntries(this.violationLog),
            metrics: Object.fromEntries(this.performanceMetrics),
            activeSandboxes: this.sandboxes.size
        };
    }

    clearViolations() {
        this.violationLog.clear();
        console.log('Security violations cleared');
    }
}

// Create global instance
const siteIsolationMembrane = new SiteIsolationMembrane();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SiteIsolationMembrane = SiteIsolationMembrane;
    window.SecurityError = SecurityError;
    window.siteIsolationMembrane = siteIsolationMembrane;
}

console.log('🛡️ Site Isolation Membrane ready - Secure multi-domain execution enabled');