// FRED (Federal Reserve Economic Data) Integration - Economic Context Engine
console.log('Corporate Genome: FRED Economic Context module loaded');

const FRED_CONFIG = {
    baseUrl: 'https://api.stlouisfed.org/fred',
    apiKey: null, // Will be loaded from storage
    rateLimit: 120000, // requests per day (very generous)
    timeout: 10000,
    uniqueValue: 'Macro economic context for ownership analysis'
};

// Key economic indicators for different sectors
const SECTOR_INDICATORS = {
    'Financial': [
        'FEDFUNDS', // Federal Funds Rate
        'TB3MS',    // 3-Month Treasury Rate
        'AAA',      // AAA Corporate Bond Yield
        'MORTGAGE30US' // 30-Year Fixed Rate Mortgage
    ],
    'Technology': [
        'NASDAQCOM', // NASDAQ Composite Index
        'PAYEMS',    // Total Nonfarm Payrolls
        'CPILFESL',  // Core CPI
        'GDPC1'      // Real GDP
    ],
    'Healthcare': [
        'HLTHSCPCHCSA', // Health Care CPI
        'GDPC1',        // Real GDP
        'PAYEMS',       // Employment
        'CPILFESL'      // Core CPI
    ],
    'Energy': [
        'DCOILWTICO', // Crude Oil Prices
        'DHHNGSP',    // Natural Gas Prices
        'GDPC1',      // Real GDP
        'CPILFESL'    // Core CPI
    ],
    'Default': [
        'GDPC1',     // Real GDP
        'UNRATE',    // Unemployment Rate
        'CPILFESL',  // Core CPI
        'FEDFUNDS'   // Federal Funds Rate
    ]
};

// Load API key from storage
chrome.storage.sync.get(['fredApiKey'], (result) => {
    FRED_CONFIG.apiKey = result.fredApiKey;
});

async function getFredEconomicContext(companyName, sector = 'Default') {
    if (!FRED_CONFIG.apiKey) {
        console.warn('FRED API key not configured');
        return {
            indicators: {},
            analysis: { context: 'FRED API key required for economic context' },
            source: 'FRED (API key required)'
        };
    }

    try {
        console.log(`📊 Fetching FRED economic context for sector: ${sector}`);
        
        const indicators = SECTOR_INDICATORS[sector] || SECTOR_INDICATORS['Default'];
        const economicData = {};
        
        // Fetch each indicator
        const dataPromises = indicators.map(async (seriesId) => {
            try {
                const data = await fetchFredSeries(seriesId);
                return { seriesId, data };
            } catch (error) {
                console.warn(`Failed to fetch FRED series ${seriesId}:`, error);
                return { seriesId, data: null };
            }
        });

        const results = await Promise.allSettled(dataPromises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.data) {
                const { seriesId, data } = result.value;
                economicData[seriesId] = data;
            }
        });

        // Analyze economic context
        const analysis = analyzeEconomicContext(economicData, sector);

        return {
            indicators: economicData,
            analysis,
            sector,
            source: 'Federal Reserve Economic Data (FRED)',
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('FRED integration error:', error);
        return null;
    }
}

async function fetchFredSeries(seriesId, limit = 12) {
    const endpoint = `${FRED_CONFIG.baseUrl}/series/observations`;
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: FRED_CONFIG.apiKey,
        file_type: 'json',
        limit: limit.toString(),
        sort_order: 'desc'
    });

    const response = await fetch(`${endpoint}?${params}`);
    
    if (!response.ok) {
        throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.observations && data.observations.length > 0) {
        // Process and clean data
        const observations = data.observations
            .filter(obs => obs.value !== '.')
            .map(obs => ({
                date: obs.date,
                value: parseFloat(obs.value),
                seriesId: seriesId
            }))
            .slice(0, 6); // Last 6 observations

        return {
            seriesId,
            current: observations[0]?.value,
            trend: calculateTrend(observations),
            observations: observations
        };
    }

    return null;
}

function calculateTrend(observations) {
    if (observations.length < 2) return 'INSUFFICIENT_DATA';
    
    const recent = observations[0].value;
    const previous = observations[1].value;
    
    const change = ((recent - previous) / previous) * 100;
    
    if (Math.abs(change) < 0.1) return 'STABLE';
    return change > 0 ? 'RISING' : 'FALLING';
}

function analyzeEconomicContext(economicData, sector) {
    const analysis = {
        context: '',
        ownershipImplications: [],
        riskFactors: [],
        opportunities: []
    };

    // General economic health assessment
    const gdp = economicData['GDPC1'];
    const unemployment = economicData['UNRATE'];
    const inflation = economicData['CPILFESL'];
    const rates = economicData['FEDFUNDS'] || economicData['TB3MS'];

    // GDP Analysis
    if (gdp) {
        if (gdp.trend === 'RISING') {
            analysis.opportunities.push('GDP growth may drive institutional investment');
        } else if (gdp.trend === 'FALLING') {
            analysis.riskFactors.push('GDP decline may trigger portfolio rebalancing');
        }
    }

    // Interest Rate Analysis
    if (rates) {
        if (rates.trend === 'RISING') {
            analysis.ownershipImplications.push('Rising rates may shift institutional preferences');
            if (sector === 'Financial') {
                analysis.opportunities.push('Rising rates typically benefit financial sector');
            }
        } else if (rates.trend === 'FALLING') {
            analysis.ownershipImplications.push('Lower rates may increase growth stock appetite');
        }
    }

    // Sector-specific analysis
    switch (sector) {
        case 'Financial':
            analyzeFinnancialSectorContext(economicData, analysis);
            break;
        case 'Technology':
            analyzeTechnologySectorContext(economicData, analysis);
            break;
        case 'Energy':
            analyzeEnergySectorContext(economicData, analysis);
            break;
        case 'Healthcare':
            analyzeHealthcareSectorContext(economicData, analysis);
            break;
    }

    // Generate summary context
    analysis.context = generateContextSummary(analysis, sector);

    return analysis;
}

function analyzeFinnancialSectorContext(data, analysis) {
    const fedFunds = data['FEDFUNDS'];
    const mortgageRates = data['MORTGAGE30US'];
    
    if (fedFunds && fedFunds.trend === 'RISING') {
        analysis.opportunities.push('Rising Fed rates improve net interest margins');
    }
    
    if (mortgageRates && mortgageRates.trend === 'RISING') {
        analysis.riskFactors.push('Rising mortgage rates may slow lending volume');
    }
}

function analyzeTechnologySectorContext(data, analysis) {
    const nasdaq = data['NASDAQCOM'];
    const employment = data['PAYEMS'];
    
    if (nasdaq && nasdaq.trend === 'FALLING') {
        analysis.riskFactors.push('Tech market decline may trigger institutional selling');
    }
    
    if (employment && employment.trend === 'RISING') {
        analysis.opportunities.push('Strong employment supports tech demand');
    }
}

function analyzeEnergySectorContext(data, analysis) {
    const oil = data['DCOILWTICO'];
    const gas = data['DHHNGSP'];
    
    if (oil && oil.trend === 'RISING') {
        analysis.opportunities.push('Rising oil prices benefit energy sector margins');
    }
    
    if (gas && gas.trend === 'VOLATILE') {
        analysis.riskFactors.push('Natural gas volatility creates uncertainty');
    }
}

function analyzeHealthcareSectorContext(data, analysis) {
    const healthCPI = data['HLTHSCPCHCSA'];
    
    if (healthCPI && healthCPI.trend === 'RISING') {
        analysis.opportunities.push('Healthcare inflation may drive sector investment');
    }
}

function generateContextSummary(analysis, sector) {
    let summary = `Economic context for ${sector} sector: `;
    
    if (analysis.opportunities.length > 0) {
        summary += `Opportunities include ${analysis.opportunities[0].toLowerCase()}. `;
    }
    
    if (analysis.riskFactors.length > 0) {
        summary += `Key risks: ${analysis.riskFactors[0].toLowerCase()}. `;
    }
    
    if (analysis.ownershipImplications.length > 0) {
        summary += `Ownership impact: ${analysis.ownershipImplications[0].toLowerCase()}.`;
    }
    
    return summary.trim();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.getFredEconomicContext = getFredEconomicContext;
}

console.log('📊 FRED Economic Context integration ready');