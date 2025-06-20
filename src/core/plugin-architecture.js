// /src/core/plugin-architecture.js
class DataSourcePlugin {
    constructor(config) {
        this.validateConfig(config);
        this.setupRateLimiting();
        this.initializeCircuitBreaker();
    }
    
    // Standardized interface for all data sources
    async fetch(query) {
        return this.rateLimiter.execute(() => 
            this.circuitBreaker.fire(() => 
                this.implementation.fetch(query)
            )
        );
    }
}

// Easy to add new sources without breaking existing code
const openCorporatesPlugin = new DataSourcePlugin({
    name: 'opencorporates',
    rateLimit: { requests: 500, window: '24h' },
    circuitBreaker: { threshold: 5, timeout: 60000 },
    implementation: new OpenCorporatesAdapter()
});