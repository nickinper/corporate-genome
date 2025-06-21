// Corporate Genome: Fuzzy Matcher for Company Names
// Implements various fuzzy string matching algorithms for company name matching

console.log('Corporate Genome: Fuzzy Matcher initializing...');

class FuzzyMatcher {
    constructor() {
        // Configuration
        this.config = {
            defaultThreshold: 0.8, // 80% similarity threshold
            tokenSetThreshold: 0.85, // Higher threshold for token set matching
            abbreviationBonus: 0.1, // Bonus for matching known abbreviations
            exactMatchScore: 1.0
        };
        
        // Company-specific stop words to ignore in token matching
        this.stopWords = new Set([
            'the', 'and', 'of', 'in', 'for', 'a', 'an', '&',
            'company', 'corporation', 'incorporated', 'limited',
            'corp', 'inc', 'ltd', 'llc', 'co'
        ]);
    }
    
    // Levenshtein distance calculation
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        
        // Create a 2D array for dynamic programming
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize first row and column
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill the dp table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // deletion
                        dp[i][j - 1],     // insertion
                        dp[i - 1][j - 1]  // substitution
                    );
                }
            }
        }
        
        return dp[m][n];
    }
    
    // Calculate similarity ratio (0-1) based on Levenshtein distance
    ratio(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1;
        
        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0) return 1;
        
        const distance = this.levenshteinDistance(s1, s2);
        return 1 - (distance / maxLen);
    }
    
    // Partial ratio - finds the best matching substring
    partialRatio(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1;
        
        // Ensure s1 is the shorter string
        const [shorter, longer] = s1.length <= s2.length ? [s1, s2] : [s2, s1];
        
        let bestRatio = 0;
        
        // Slide the shorter string across the longer string
        for (let i = 0; i <= longer.length - shorter.length; i++) {
            const substring = longer.substring(i, i + shorter.length);
            const currentRatio = this.ratio(shorter, substring);
            bestRatio = Math.max(bestRatio, currentRatio);
        }
        
        return bestRatio;
    }
    
    // Token sort ratio - sorts tokens before comparing
    tokenSortRatio(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const tokens1 = this.tokenize(str1).sort();
        const tokens2 = this.tokenize(str2).sort();
        
        const sorted1 = tokens1.join(' ');
        const sorted2 = tokens2.join(' ');
        
        return this.ratio(sorted1, sorted2);
    }
    
    // Token set ratio - compares sets of tokens
    tokenSetRatio(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const tokens1 = new Set(this.tokenize(str1));
        const tokens2 = new Set(this.tokenize(str2));
        
        // Remove stop words
        const filtered1 = new Set([...tokens1].filter(t => !this.stopWords.has(t)));
        const filtered2 = new Set([...tokens2].filter(t => !this.stopWords.has(t)));
        
        // If all tokens were stop words, use original sets
        const set1 = filtered1.size > 0 ? filtered1 : tokens1;
        const set2 = filtered2.size > 0 ? filtered2 : tokens2;
        
        // Calculate Jaccard similarity
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        if (union.size === 0) return 1;
        
        return intersection.size / union.size;
    }
    
    // Tokenize string into words
    tokenize(str) {
        return str.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Replace non-word chars with spaces
            .split(/\s+/) // Split on whitespace
            .filter(token => token.length > 0); // Remove empty tokens
    }
    
    // Combined weighted ratio for company name matching
    companyNameRatio(str1, str2, weights = {}) {
        const defaultWeights = {
            ratio: 0.2,
            partial: 0.2,
            tokenSort: 0.3,
            tokenSet: 0.3
        };
        
        const w = { ...defaultWeights, ...weights };
        
        // Calculate individual scores
        const scores = {
            ratio: this.ratio(str1, str2),
            partial: this.partialRatio(str1, str2),
            tokenSort: this.tokenSortRatio(str1, str2),
            tokenSet: this.tokenSetRatio(str1, str2)
        };
        
        // Calculate weighted average
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [key, weight] of Object.entries(w)) {
            if (scores[key] !== undefined) {
                weightedSum += scores[key] * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    // Find best matches from a list of candidates
    extractBest(query, choices, limit = 5, scorer = null) {
        if (!query || !choices || choices.length === 0) return [];
        
        const scorerFunc = scorer || ((q, c) => this.companyNameRatio(q, c));
        
        // Calculate scores for all choices
        const scored = choices.map(choice => ({
            choice: choice,
            score: scorerFunc(query, choice)
        }));
        
        // Sort by score (descending) and return top matches
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                match: item.choice,
                score: item.score,
                confidence: this.scoreToConfidence(item.score)
            }));
    }
    
    // Extract single best match
    extractOne(query, choices, scorer = null) {
        const results = this.extractBest(query, choices, 1, scorer);
        return results.length > 0 ? results[0] : null;
    }
    
    // Convert score to confidence level
    scoreToConfidence(score) {
        if (score >= 0.95) return 'very_high';
        if (score >= 0.85) return 'high';
        if (score >= 0.75) return 'medium';
        if (score >= 0.65) return 'low';
        return 'very_low';
    }
    
    // Check if two company names are likely the same
    isMatch(str1, str2, threshold = null) {
        const score = this.companyNameRatio(str1, str2);
        const minThreshold = threshold || this.config.defaultThreshold;
        return score >= minThreshold;
    }
    
    // Special handling for common company abbreviations and variations
    handleSpecialCases(str1, str2) {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        // Common abbreviation patterns
        const abbreviationPairs = [
            ['intl', 'international'],
            ['corp', 'corporation'],
            ['inc', 'incorporated'],
            ['ltd', 'limited'],
            ['co', 'company'],
            ['assoc', 'associates'],
            ['mgmt', 'management'],
            ['svcs', 'services'],
            ['tech', 'technologies'],
            ['pharm', 'pharmaceutical'],
            ['mfg', 'manufacturing']
        ];
        
        // Check for abbreviation matches
        for (const [abbr, full] of abbreviationPairs) {
            if ((s1.includes(abbr) && s2.includes(full)) ||
                (s1.includes(full) && s2.includes(abbr))) {
                return this.config.abbreviationBonus;
            }
        }
        
        return 0;
    }
    
    // Enhanced company name ratio with special case handling
    enhancedCompanyRatio(str1, str2) {
        const baseScore = this.companyNameRatio(str1, str2);
        const specialBonus = this.handleSpecialCases(str1, str2);
        
        return Math.min(1.0, baseScore + specialBonus);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FuzzyMatcher = FuzzyMatcher;
}

console.log('✅ Fuzzy Matcher ready');