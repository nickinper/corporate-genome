// News Context Engine - Market Intelligence & Ownership Change Detection
console.log('Corporate Genome: News Context module loaded');

const NEWS_CONFIG = {
    baseUrl: 'https://newsapi.org/v2',
    apiKey: null, // Will be loaded from storage
    freeLimit: 100, // requests per day
    timeout: 8000,
    criticalUse: 'Ownership change triggers & market sentiment'
};

// Load API key from storage
chrome.storage.sync.get(['newsApiKey'], (result) => {
    NEWS_CONFIG.apiKey = result.newsApiKey;
});

// Keywords that indicate ownership/investment changes
const OWNERSHIP_KEYWORDS = [
    'stake', 'shares', 'investment', 'acquisition', 'merger',
    'holdings', 'portfolio', 'institutional', 'hedge fund',
    'activist investor', 'buyout', 'takeover', 'proxy fight',
    'shareholder', 'board', 'dividend', 'spin-off'
];

// High-impact news sources for corporate news
const TIER1_SOURCES = [
    'reuters', 'bloomberg', 'wsj', 'ft', 'cnbc',
    'marketwatch', 'seeking-alpha', 'barrons'
];

async function getNewsContext(companyName, days = 30) {
    if (!NEWS_CONFIG.apiKey) {
        console.warn('News API key not configured');
        return {
            articles: [],
            sentiment: { overall: 'UNKNOWN', reason: 'API key required' },
            ownershipTriggers: [],
            source: 'NewsAPI (key required)'
        };
    }

    try {
        console.log(`📰 Fetching news context for: ${companyName}`);
        
        // Calculate date range
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const toDate = new Date();

        // Search for company-related news
        const endpoint = `${NEWS_CONFIG.baseUrl}/everything`;
        const params = new URLSearchParams({
            q: `"${companyName}" AND (${OWNERSHIP_KEYWORDS.slice(0, 5).join(' OR ')})`,
            sources: TIER1_SOURCES.join(','),
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            sortBy: 'relevancy',
            pageSize: '20',
            apiKey: NEWS_CONFIG.apiKey
        });

        const response = await fetch(`${endpoint}?${params}`);
        
        if (!response.ok) {
            throw new Error(`NewsAPI error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.articles && data.articles.length > 0) {
            // Process and analyze articles
            const processedArticles = data.articles.map(article => {
                const processed = {
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    source: article.source.name,
                    publishedAt: article.publishedAt,
                    ownershipRelevance: calculateOwnershipRelevance(article),
                    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
                    keyIndicators: extractKeyIndicators(article)
                };

                return processed;
            });

            // Filter for ownership-relevant articles
            const ownershipArticles = processedArticles.filter(
                article => article.ownershipRelevance > 0.3
            );

            // Analyze for ownership change triggers
            const ownershipTriggers = detectOwnershipTriggers(ownershipArticles);

            // Calculate overall sentiment
            const overallSentiment = calculateOverallSentiment(processedArticles);

            return {
                articles: processedArticles.slice(0, 8), // Top 8 articles
                ownershipArticles: ownershipArticles.slice(0, 5),
                sentiment: overallSentiment,
                ownershipTriggers,
                totalArticles: data.totalResults,
                searchPeriod: `${days} days`,
                source: 'NewsAPI',
                lastUpdated: new Date().toISOString()
            };
        }

        return {
            articles: [],
            sentiment: { overall: 'NEUTRAL', reason: 'No recent news found' },
            ownershipTriggers: [],
            source: 'NewsAPI',
            message: 'No relevant news found'
        };
        
    } catch (error) {
        console.error('NewsAPI error:', error);
        return null;
    }
}

function calculateOwnershipRelevance(article) {
    const text = (article.title + ' ' + (article.description || '')).toLowerCase();
    let relevanceScore = 0;

    // Check for ownership keywords
    OWNERSHIP_KEYWORDS.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
            relevanceScore += 0.2;
        }
    });

    // Boost for high-impact sources
    if (TIER1_SOURCES.includes(article.source.id)) {
        relevanceScore += 0.1;
    }

    // Check for specific ownership patterns
    const ownershipPatterns = [
        /(\d+)%?\s*(stake|shares|holding)/i,
        /(increased|decreased|acquired|sold)\s*\d+/i,
        /(institutional|hedge fund|activist)\s*(investor|investment)/i,
        /(board|proxy|takeover|merger)/i
    ];

    ownershipPatterns.forEach(pattern => {
        if (pattern.test(text)) {
            relevanceScore += 0.15;
        }
    });

    return Math.min(1.0, relevanceScore);
}

function analyzeSentiment(text) {
    const positiveWords = [
        'growth', 'increase', 'profit', 'gain', 'success', 'strong',
        'beat', 'exceed', 'upgrade', 'buy', 'bullish', 'optimistic'
    ];

    const negativeWords = [
        'decline', 'loss', 'fall', 'weak', 'miss', 'downgrade',
        'sell', 'bearish', 'concern', 'risk', 'problem', 'challenge'
    ];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
}

function extractKeyIndicators(article) {
    const text = (article.title + ' ' + (article.description || '')).toLowerCase();
    const indicators = [];

    // Extract percentage mentions
    const percentageMatches = text.match(/(\d+(?:\.\d+)?)%/g);
    if (percentageMatches) {
        indicators.push(...percentageMatches.map(match => `Percentage: ${match}`));
    }

    // Extract dollar amounts
    const dollarMatches = text.match(/\$(\d+(?:\.\d+)?)\s*(billion|million|b|m)/gi);
    if (dollarMatches) {
        indicators.push(...dollarMatches.map(match => `Amount: ${match}`));
    }

    // Extract specific investor types
    const investorTypes = ['hedge fund', 'pension fund', 'mutual fund', 'etf', 'institutional'];
    investorTypes.forEach(type => {
        if (text.includes(type)) {
            indicators.push(`Investor Type: ${type}`);
        }
    });

    return indicators.slice(0, 3); // Top 3 indicators
}

function detectOwnershipTriggers(articles) {
    const triggers = [];

    articles.forEach(article => {
        const text = (article.title + ' ' + (article.description || '')).toLowerCase();

        // Detect specific trigger events
        if (text.includes('activist') || text.includes('proxy')) {
            triggers.push({
                type: 'ACTIVIST_ACTIVITY',
                article: article.title,
                date: article.publishedAt,
                confidence: 0.8
            });
        }

        if (text.includes('acquisition') || text.includes('merger')) {
            triggers.push({
                type: 'M&A_ACTIVITY',
                article: article.title,
                date: article.publishedAt,
                confidence: 0.9
            });
        }

        if (text.includes('increased') && text.includes('stake')) {
            triggers.push({
                type: 'STAKE_INCREASE',
                article: article.title,
                date: article.publishedAt,
                confidence: 0.7
            });
        }

        if (text.includes('sold') || text.includes('reduced')) {
            triggers.push({
                type: 'POSITION_REDUCTION',
                article: article.title,
                date: article.publishedAt,
                confidence: 0.6
            });
        }
    });

    // Sort by confidence and date
    return triggers
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
}

function calculateOverallSentiment(articles) {
    if (articles.length === 0) {
        return { overall: 'NEUTRAL', reason: 'No articles to analyze' };
    }

    const sentimentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
    
    articles.forEach(article => {
        sentimentCounts[article.sentiment]++;
    });

    const total = articles.length;
    const positiveRatio = sentimentCounts.POSITIVE / total;
    const negativeRatio = sentimentCounts.NEGATIVE / total;

    let overall = 'NEUTRAL';
    let reason = 'Mixed sentiment signals';

    if (positiveRatio > 0.6) {
        overall = 'POSITIVE';
        reason = `${Math.round(positiveRatio * 100)}% positive coverage`;
    } else if (negativeRatio > 0.6) {
        overall = 'NEGATIVE';
        reason = `${Math.round(negativeRatio * 100)}% negative coverage`;
    } else if (positiveRatio > negativeRatio) {
        overall = 'SLIGHTLY_POSITIVE';
        reason = 'Moderately positive sentiment';
    } else if (negativeRatio > positiveRatio) {
        overall = 'SLIGHTLY_NEGATIVE';
        reason = 'Moderately negative sentiment';
    }

    return {
        overall,
        reason,
        breakdown: {
            positive: Math.round(positiveRatio * 100),
            negative: Math.round(negativeRatio * 100),
            neutral: Math.round((sentimentCounts.NEUTRAL / total) * 100)
        }
    };
}

// Export for global access
if (typeof window !== 'undefined') {
    window.getNewsContext = getNewsContext;
}

console.log('📰 News Context integration ready - Market intelligence enabled');