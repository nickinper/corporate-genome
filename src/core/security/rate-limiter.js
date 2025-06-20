// Global Rate Limiter - Advanced Attack Prevention
console.log('Corporate Genome: Global Rate Limiter initializing...');

class GlobalRateLimiter {
    constructor() {
        this.globalWindow = new Map(); // Track ALL requests per requester
        this.suspiciousPatterns = new Map();
        this.blacklist = new Set();
        this.greylist = new Map(); // Temporary restrictions
        this.whitelistedOrigins = new Set([
            'chrome-extension://', // Our own extension
            'https://www.forbes.com'
        ]);
        
        // Rate limiting configuration
        this.limits = {
            global: { requests: 50, window: 60000 }, // 50 requests per minute globally
            burst: { requests: 10, window: 1000 },   // No more than 10 requests per second
            hourly: { requests: 200, window: 3600000 }, // 200 requests per hour
            daily: { requests: 1000, window: 86400000 }  // 1000 requests per day
        };
        
        // Pattern detection thresholds
        this.anomalyThresholds = {
            burstDetection: 8,        // 8+ requests in 1 second = suspicious
            rapidFire: 15,            // 15+ requests in 5 seconds = attack
            distributedAttack: 100,   // 100+ requests from single source = DDoS attempt
            timePatternAnomaly: 0.9   // Confidence threshold for timing attacks
        };
        
        // Cleanup old data every 5 minutes
        setInterval(() => this.cleanup(), 300000);
    }

    async enforceGlobalLimit(requesterId, action, origin = null) {
        const now = Date.now();
        const requestKey = this.generateRequestKey(requesterId, origin);
        
        console.log(`🔍 Rate limiting check for ${requestKey} - action: ${action}`);
        
        // Security checks first
        await this.performSecurityChecks(requestKey, now, origin);
        
        // Enforce all rate limits
        await this.enforceAllLimits(requestKey, now, action);
        
        // Log successful request
        this.logRequest(requestKey, now, action);
        
        return true;
    }

    generateRequestKey(requesterId, origin) {
        // Create composite key for tracking
        const sanitizedOrigin = this.sanitizeOrigin(origin);
        return `${requesterId}_${sanitizedOrigin}`;
    }

    sanitizeOrigin(origin) {
        if (!origin) return 'unknown';
        
        try {
            const url = new URL(origin);
            return url.hostname;
        } catch {
            return 'invalid';
        }
    }

    async performSecurityChecks(requestKey, now, origin) {
        // Check blacklist
        if (this.blacklist.has(requestKey)) {
            throw new SecurityError('Requester permanently blacklisted for malicious activity');
        }
        
        // Check greylist (temporary restrictions)
        const greylistEntry = this.greylist.get(requestKey);
        if (greylistEntry && now < greylistEntry.until) {
            const remaining = Math.ceil((greylistEntry.until - now) / 1000);
            throw new SecurityError(`Requester temporarily restricted for ${remaining} seconds - ${greylistEntry.reason}`);
        }
        
        // Origin validation
        if (origin && !this.isOriginTrusted(origin)) {
            await this.enforceStricterLimits(requestKey, now);
        }
        
        // Check for suspicious patterns
        await this.detectSuspiciousActivity(requestKey, now);
    }

    isOriginTrusted(origin) {
        return Array.from(this.whitelistedOrigins).some(trusted => 
            origin.startsWith(trusted)
        );
    }

    async enforceAllLimits(requestKey, now, action) {
        const requests = this.getRequestHistory(requestKey);
        
        // Burst protection (1 second window)
        const burstRequests = requests.filter(t => now - t < this.limits.burst.window);
        if (burstRequests.length >= this.limits.burst.requests) {
            await this.handleViolation(requestKey, 'BURST_LIMIT', now);
            throw new RateLimitError('Burst rate limit exceeded - please slow down');
        }
        
        // Global rate limit (1 minute window)
        const globalRequests = requests.filter(t => now - t < this.limits.global.window);
        if (globalRequests.length >= this.limits.global.requests) {
            await this.handleViolation(requestKey, 'GLOBAL_LIMIT', now);
            throw new RateLimitError('Global rate limit exceeded');
        }
        
        // Hourly limit
        const hourlyRequests = requests.filter(t => now - t < this.limits.hourly.window);
        if (hourlyRequests.length >= this.limits.hourly.requests) {
            await this.handleViolation(requestKey, 'HOURLY_LIMIT', now);
            throw new RateLimitError('Hourly rate limit exceeded');
        }
        
        // Daily limit
        const dailyRequests = requests.filter(t => now - t < this.limits.daily.window);
        if (dailyRequests.length >= this.limits.daily.requests) {
            await this.handleViolation(requestKey, 'DAILY_LIMIT', now);
            throw new RateLimitError('Daily rate limit exceeded');
        }
    }

    getRequestHistory(requestKey) {
        return this.globalWindow.get(requestKey) || [];
    }

    logRequest(requestKey, timestamp, action) {
        const requests = this.getRequestHistory(requestKey);
        requests.push(timestamp);
        
        // Keep only recent requests to prevent memory bloat
        const cutoff = timestamp - this.limits.daily.window;
        const filtered = requests.filter(t => t > cutoff);
        
        this.globalWindow.set(requestKey, filtered);
    }

    async detectSuspiciousActivity(requestKey, now) {
        const requests = this.getRequestHistory(requestKey);
        
        // Pattern 1: Burst detection
        const recentBurst = requests.filter(t => now - t < 1000);
        if (recentBurst.length >= this.anomalyThresholds.burstDetection) {
            await this.flagSuspiciousActivity(requestKey, 'BURST_PATTERN', now);
        }
        
        // Pattern 2: Rapid fire detection
        const rapidFire = requests.filter(t => now - t < 5000);
        if (rapidFire.length >= this.anomalyThresholds.rapidFire) {
            await this.flagSuspiciousActivity(requestKey, 'RAPID_FIRE', now);
        }
        
        // Pattern 3: Timing analysis for automated requests
        if (requests.length > 10) {
            const timingAnomaly = this.detectTimingPatterns(requests);
            if (timingAnomaly > this.anomalyThresholds.timePatternAnomaly) {
                await this.flagSuspiciousActivity(requestKey, 'TIMING_ANOMALY', now);
            }
        }
        
        // Pattern 4: Distributed attack detection
        const hourlyRequests = requests.filter(t => now - t < 3600000);
        if (hourlyRequests.length >= this.anomalyThresholds.distributedAttack) {
            await this.flagSuspiciousActivity(requestKey, 'DISTRIBUTED_ATTACK', now);
        }
    }

    detectTimingPatterns(requests) {
        if (requests.length < 5) return 0;
        
        // Calculate intervals between requests
        const intervals = [];
        for (let i = 1; i < requests.length; i++) {
            intervals.push(requests[i] - requests[i-1]);
        }
        
        // Check for suspiciously regular timing (bot behavior)
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Low variance in timing suggests automated requests
        const coefficientOfVariation = standardDeviation / mean;
        
        // Return anomaly score (lower = more suspicious for timing)
        return coefficientOfVariation < 0.1 ? 0.95 : 0;
    }

    async flagSuspiciousActivity(requestKey, activityType, timestamp) {
        console.warn(`🚨 Suspicious activity detected: ${activityType} from ${requestKey}`);
        
        // Track suspicious patterns
        const patterns = this.suspiciousPatterns.get(requestKey) || [];
        patterns.push({ type: activityType, timestamp });
        this.suspiciousPatterns.set(requestKey, patterns);
        
        // Escalate based on pattern severity and frequency
        await this.escalateThreat(requestKey, activityType, patterns);
    }

    async escalateThreat(requestKey, activityType, patterns) {
        const recentPatterns = patterns.filter(p => Date.now() - p.timestamp < 300000); // 5 minutes
        
        switch (activityType) {
            case 'BURST_PATTERN':
                if (recentPatterns.length >= 2) {
                    await this.applyGreylist(requestKey, 60000, 'Repeated burst patterns detected');
                }
                break;
                
            case 'RAPID_FIRE':
                await this.applyGreylist(requestKey, 300000, 'Rapid fire attack detected');
                break;
                
            case 'TIMING_ANOMALY':
                if (recentPatterns.length >= 3) {
                    await this.applyGreylist(requestKey, 600000, 'Automated request pattern detected');
                }
                break;
                
            case 'DISTRIBUTED_ATTACK':
                this.blacklist.add(requestKey);
                console.error(`🔥 BLACKLISTED: ${requestKey} for distributed attack`);
                break;
        }
    }

    async applyGreylist(requestKey, duration, reason) {
        const until = Date.now() + duration;
        this.greylist.set(requestKey, { until, reason });
        
        console.warn(`⚠️ GREYLISTED: ${requestKey} for ${duration/1000}s - ${reason}`);
    }

    async handleViolation(requestKey, violationType, timestamp) {
        console.warn(`📊 Rate limit violation: ${violationType} from ${requestKey}`);
        
        // Apply progressive penalties
        switch (violationType) {
            case 'BURST_LIMIT':
                await this.applyGreylist(requestKey, 10000, 'Burst limit exceeded');
                break;
            case 'GLOBAL_LIMIT':
                await this.applyGreylist(requestKey, 60000, 'Global rate limit exceeded');
                break;
            case 'HOURLY_LIMIT':
                await this.applyGreylist(requestKey, 300000, 'Hourly limit exceeded');
                break;
            case 'DAILY_LIMIT':
                await this.applyGreylist(requestKey, 3600000, 'Daily limit exceeded');
                break;
        }
    }

    cleanup() {
        const now = Date.now();
        const cutoff = now - this.limits.daily.window;
        
        // Clean up old request data
        for (const [key, requests] of this.globalWindow.entries()) {
            const filtered = requests.filter(t => t > cutoff);
            if (filtered.length === 0) {
                this.globalWindow.delete(key);
            } else {
                this.globalWindow.set(key, filtered);
            }
        }
        
        // Clean up old greylist entries
        for (const [key, entry] of this.greylist.entries()) {
            if (now > entry.until) {
                this.greylist.delete(key);
            }
        }
        
        // Clean up old suspicious patterns
        for (const [key, patterns] of this.suspiciousPatterns.entries()) {
            const filtered = patterns.filter(p => now - p.timestamp < 3600000); // Keep 1 hour
            if (filtered.length === 0) {
                this.suspiciousPatterns.delete(key);
            } else {
                this.suspiciousPatterns.set(key, filtered);
            }
        }
        
        console.log('🧹 Rate limiter cleanup completed');
    }

    // Admin/debug methods
    getStats() {
        return {
            activeRequesters: this.globalWindow.size,
            blacklistedCount: this.blacklist.size,
            greylistedCount: this.greylist.size,
            suspiciousPatterns: this.suspiciousPatterns.size
        };
    }

    clearBlacklist() {
        this.blacklist.clear();
        console.log('🔓 Blacklist cleared');
    }

    clearGreylist() {
        this.greylist.clear();
        console.log('🔓 Greylist cleared');
    }
}

// Custom error classes
class RateLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RateLimitError';
    }
}

class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityError';
    }
}

// Global rate limiter instance
const globalRateLimiter = new GlobalRateLimiter();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GlobalRateLimiter = GlobalRateLimiter;
    window.globalRateLimiter = globalRateLimiter;
    window.RateLimitError = RateLimitError;
    window.SecurityError = SecurityError;
}

console.log('🚨 Global Rate Limiter ready - Advanced attack prevention enabled');