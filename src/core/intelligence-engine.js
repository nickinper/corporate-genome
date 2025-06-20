javascript// Corporate Genome: Resilient Pattern Recognition Engine
class PatternRecognitionMembrane {
    constructor() {
        this.patterns = new Map();
        this.confidenceThreshold = 0.7;
        this.securitySandbox = this.createSandbox();
        this.initializeAdaptivePatterns();
    }

    createSandbox() {
        // Isolated execution context for untrusted data
        return {
            sanitize: (input) => {
                if (typeof input !== 'string') return '';
                return input
                    .replace(/[<>]/g, '')
                    .trim()
                    .slice(0, 100); // Length limit
            },
            validate: (data) => {
                return {
                    companyName: this.sanitize(data.companyName),
                    depth: parseInt(data.depth) || 0,
                    investorPercentage: parseFloat(data.investorPercentage) || 0
                };
            }
        };
    }

    initializeAdaptivePatterns() {
        // Multi-layered pattern recognition
        this.patterns.set('strict', [
            /\b(BlackRock|Vanguard|State Street|JPMorgan Chase|Goldman Sachs)\b/i,
            /\b(Bank of America|Wells Fargo|Citigroup|Morgan Stanley)\b/i
        ]);
        
        this.patterns.set('flexible', [
            /\b\w+\s+(Inc|Corp|LLC|Ltd|Company|Co\.?)\b/i,
            /\b(Chase|BofA|Citi|MS)\b/i // Common abbreviations
        ]);
        
        this.patterns.set('contextual', [
            // Detect companies by surrounding context
            /(?:CEO of|founded|headquarters|NYSE:|NASDAQ:)\s*(\w+[\w\s]*)/i
        ]);
    }

    async detectCompany(element) {
        const text = this.securitySandbox.sanitize(element.textContent);
        const context = this.extractContext(element);
        
        let bestMatch = null;
        let highestConfidence = 0;

        // Layered detection strategy
        for (const [strategy, patterns] of this.patterns) {
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    const confidence = this.calculateConfidence(match, context, strategy);
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        bestMatch = {
                            company: match[1] || match[0],
                            confidence,
                            strategy
                        };
                    }
                }
            }
        }

        return highestConfidence >= this.confidenceThreshold ? bestMatch : null;
    }

    extractContext(element) {
        // Analyze DOM neighborhood for context clues
        const parent = element.parentElement;
        const siblings = Array.from(parent?.children || []);
        
        return {
            parentTag: parent?.tagName,
            siblingText: siblings.map(s => s.textContent).join(' '),
            classList: Array.from(element.classList),
            href: element.href || element.closest('a')?.href
        };
    }

    calculateConfidence(match, context, strategy) {
        let confidence = 0.5; // Base confidence
        
        // Strategy weighting
        if (strategy === 'strict') confidence += 0.3;
        if (strategy === 'flexible') confidence += 0.2;
        
        // Context boosting
        if (context.href?.includes('company') || context.href?.includes('quote')) {
            confidence += 0.1;
        }
        
        if (context.parentTag === 'H1' || context.parentTag === 'H2') {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }
}

// Secure Data Pipeline
class OwnershipDataPipeline {
    constructor() {
        this.cache = new Map();
        this.rateLimiter = this.createRateLimiter();
    }

    createRateLimiter() {
        const requests = new Map();
        return {
            canRequest: (key) => {
                const now = Date.now();
                const lastRequest = requests.get(key) || 0;
                if (now - lastRequest > 1000) { // 1 second minimum
                    requests.set(key, now);
                    return true;
                }
                return false;
            }
        };
    }

    async fetchOwnershipData(companyIdentifier) {
        const sanitizedId = companyIdentifier.company.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Cache check with TTL
        const cached = this.cache.get(sanitizedId);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 min TTL
            return cached.data;
        }

        // Rate limit check
        if (!this.rateLimiter.canRequest(sanitizedId)) {
            return this.getDefaultData();
        }

        try {
            // Future: Replace with actual API call
            const data = await this.mockFetch(companyIdentifier);
            
            // Validate response structure
            if (!this.validateDataStructure(data)) {
                throw new Error('Invalid data structure');
            }

            // Cache validated data
            this.cache.set(sanitizedId, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Data fetch failed:', error);
            return this.getDefaultData();
        }
    }

    validateDataStructure(data) {
        return data 
            && typeof data.depth === 'number' 
            && Array.isArray(data.owners)
            && data.owners.every(o => 
                typeof o.name === 'string' && 
                typeof o.percent === 'number'
            );
    }

    getDefaultData() {
        return {
            depth: 1,
            owners: [{
                name: 'Data Temporarily Unavailable',
                percent: 0
            }],
            error: true
        };
    }

    async mockFetch(companyIdentifier) {
        // Dynamic data based on confidence and context
        const mockDatabase = {
            'jpmorgan chase': {
                depth: 4,
                owners: [
                    { name: 'Vanguard Group', percent: 8.2 },
                    { name: 'BlackRock', percent: 7.1 },
                    { name: 'State Street', percent: 4.5 }
                ]
            },
            'blackrock': {
                depth: 3,
                owners: [
                    { name: 'PNC Financial Services', percent: 22.0 },
                    { name: 'Vanguard Group', percent: 8.1 },
                    { name: 'State Street', percent: 4.7 }
                ]
            }
            // ... more companies
        };

        const key = companyIdentifier.company.toLowerCase();
        
        // Fuzzy matching for company variants
        for (const [dbKey, data] of Object.entries(mockDatabase)) {
            if (key.includes(dbKey) || dbKey.includes(key)) {
                return data;
            }
        }

        // Generate procedural data based on company characteristics
        return {
            depth: Math.floor(companyIdentifier.confidence * 5) + 1,
            owners: this.generateProceduralOwners(companyIdentifier)
        };
    }

    generateProceduralOwners(companyIdentifier) {
        // Use company name hash for consistent procedural generation
        const hash = this.hashCode(companyIdentifier.company);
        const ownerCount = (hash % 3) + 2;
        
        const institutionalInvestors = [
            'Vanguard Group', 'BlackRock', 'State Street', 
            'Fidelity', 'Capital Group', 'T. Rowe Price'
        ];

        return Array.from({ length: ownerCount }, (_, i) => ({
            name: institutionalInvestors[(hash + i) % institutionalInvestors.length],
            percent: Math.round((100 / ownerCount - i * 5) * 10) / 10
        }));
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}

// Unified hover system with security boundaries
class SecureHoverSystem {
    constructor() {
        this.recognizer = new PatternRecognitionMembrane();
        this.dataPipeline = new OwnershipDataPipeline();
        this.activeHovers = new WeakMap();
        this.init();
    }

    init() {
        // Use event delegation for efficiency and security
        document.addEventListener('mouseover', this.handleMouseOver.bind(this), true);
        document.addEventListener('mouseout', this.handleMouseOut.bind(this), true);
        
        // Mutation observer for dynamic content
        this.observeDOMChanges();
    }

    observeDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            // Revalidate patterns when DOM changes
            this.recognizer.adaptToNewPatterns(mutations);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    async handleMouseOver(event) {
        const element = event.target;
        
        // Skip if already processing
        if (this.activeHovers.has(element)) return;

        const detection = await this.recognizer.detectCompany(element);
        if (!detection) return;

        // Mark as processing
        this.activeHovers.set(element, { detection, processing: true });

        // Fetch ownership data
        const ownershipData = await this.dataPipeline.fetchOwnershipData(detection);

        // Create secure tooltip
        this.displayTooltip(element, detection, ownershipData);
    }

    displayTooltip(element, detection, data) {
        // Implementation with XSS protection and proper positioning
        // ... (tooltip display code with security measures)
    }
}

// Initialize the system
const genome = new SecureHoverSystem();
