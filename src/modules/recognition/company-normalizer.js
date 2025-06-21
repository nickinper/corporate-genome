// Corporate Genome: Company Name Normalizer
// Normalizes company names by removing legal suffixes and standardizing formats

console.log('Corporate Genome: Company Name Normalizer initializing...');

class CompanyNormalizer {
    constructor() {
        // Common company suffixes organized by type and country
        this.suffixes = {
            // US suffixes
            us: [
                'Inc', 'Inc.', 'Incorporated',
                'Corp', 'Corp.', 'Corporation',
                'Co', 'Co.', 'Company',
                'LLC', 'L.L.C.', 'Limited Liability Company',
                'LP', 'L.P.', 'Limited Partnership',
                'LLP', 'L.L.P.', 'Limited Liability Partnership',
                'Ltd', 'Ltd.', 'Limited',
                'PC', 'P.C.', 'Professional Corporation',
                'PA', 'P.A.', 'Professional Association',
                'PLLC', 'P.L.L.C.', 'Professional Limited Liability Company'
            ],
            // UK suffixes
            uk: [
                'Ltd', 'Ltd.', 'Limited',
                'PLC', 'P.L.C.', 'Public Limited Company',
                'LLP', 'L.L.P.', 'Limited Liability Partnership'
            ],
            // European suffixes
            europe: [
                'AG', 'A.G.', 'Aktiengesellschaft', // Germany/Switzerland
                'GmbH', 'G.m.b.H.', 'Gesellschaft mit beschränkter Haftung', // Germany
                'SA', 'S.A.', 'Société Anonyme', // France/Belgium
                'SARL', 'S.A.R.L.', 'Société à responsabilité limitée', // France
                'BV', 'B.V.', 'Besloten Vennootschap', // Netherlands
                'NV', 'N.V.', 'Naamloze Vennootschap', // Netherlands/Belgium
                'SpA', 'S.p.A.', 'Società per Azioni', // Italy
                'AB', 'A.B.', 'Aktiebolag', // Sweden
                'AS', 'A.S.', 'Aksjeselskap', // Norway
                'Oy', 'Oyj' // Finland
            ],
            // Asian suffixes
            asia: [
                'KK', 'K.K.', 'Kabushiki Kaisha', '株式会社', // Japan
                'YK', 'Y.K.', 'Yugen Kaisha', '有限会社', // Japan
                'Pte Ltd', 'Pte. Ltd.', 'Private Limited', // Singapore
                'Sdn Bhd', 'Sdn. Bhd.', 'Sendirian Berhad', // Malaysia
                'Co., Ltd.', // Common in Asia
                '有限公司', '股份有限公司' // China/Taiwan
            ],
            // Other common terms
            other: [
                'Group', 'Groups',
                'Holdings', 'Holding',
                'International', 'Intl', 'Intl.',
                'Global',
                'Worldwide',
                'Partners',
                'Associates',
                'Enterprises',
                'Ventures',
                'Technologies', 'Tech',
                'Solutions',
                'Services',
                'Systems',
                'Industries'
            ]
        };
        
        // Build regex patterns for efficient matching
        this.buildPatterns();
        
        // Common abbreviations and their expansions
        this.abbreviations = new Map([
            ['IBM', 'International Business Machines'],
            ['GM', 'General Motors'],
            ['GE', 'General Electric'],
            ['P&G', 'Procter & Gamble'],
            ['J&J', 'Johnson & Johnson'],
            ['AT&T', 'American Telephone & Telegraph'],
            ['UPS', 'United Parcel Service'],
            ['FedEx', 'Federal Express'],
            ['BMW', 'Bayerische Motoren Werke'],
            ['HSBC', 'Hongkong and Shanghai Banking Corporation'],
            ['KPMG', 'Klynveld Peat Marwick Goerdeler'],
            ['PwC', 'PricewaterhouseCoopers'],
            ['EY', 'Ernst & Young'],
            ['CVS', 'Consumer Value Stores'],
            ['IKEA', 'Ingvar Kamprad Elmtaryd Agunnaryd']
        ]);
        
        // Company name variations
        this.variations = new Map([
            ['alphabet', ['google', 'alphabet inc']],
            ['meta', ['facebook', 'meta platforms']],
            ['x', ['twitter', 'x corp']],
            ['salesforce', ['salesforce.com']],
            ['walmart', ['wal-mart']],
            ['exxonmobil', ['exxon mobil', 'exxon', 'mobil']],
            ['jpmorgan', ['jp morgan', 'jpmorgan chase', 'chase']],
            ['berkshire hathaway', ['berkshire']],
            ['procter gamble', ['p&g', 'procter and gamble']],
            ['johnson johnson', ['j&j', 'johnson and johnson']]
        ]);
    }
    
    buildPatterns() {
        // Combine all suffixes
        const allSuffixes = [
            ...this.suffixes.us,
            ...this.suffixes.uk,
            ...this.suffixes.europe,
            ...this.suffixes.asia,
            ...this.suffixes.other
        ];
        
        // Sort by length (longest first) to match greedily
        const sortedSuffixes = allSuffixes.sort((a, b) => b.length - a.length);
        
        // Escape special regex characters
        const escapedSuffixes = sortedSuffixes.map(suffix => 
            suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        
        // Build pattern that matches suffixes at word boundaries
        const pattern = `\\b(${escapedSuffixes.join('|')})\\b`;
        this.suffixPattern = new RegExp(pattern, 'gi');
        
        // Pattern for cleaning extra spaces and punctuation
        this.cleanPattern = /\s+/g;
        this.punctuationPattern = /[,;]/g;
    }
    
    normalize(companyName) {
        if (!companyName || typeof companyName !== 'string') {
            return '';
        }
        
        let normalized = companyName;
        
        // Remove common punctuation
        normalized = normalized.replace(this.punctuationPattern, '');
        
        // Remove suffixes
        normalized = normalized.replace(this.suffixPattern, '');
        
        // Clean up extra spaces
        normalized = normalized.replace(this.cleanPattern, ' ').trim();
        
        // Convert to lowercase for comparison
        const lowerNormalized = normalized.toLowerCase();
        
        // Check if it's an abbreviation
        for (const [abbr, full] of this.abbreviations) {
            if (lowerNormalized === abbr.toLowerCase()) {
                return full;
            }
        }
        
        return normalized;
    }
    
    getBaseName(companyName) {
        // Get the base name without any suffixes
        return this.normalize(companyName);
    }
    
    getSuffixes(companyName) {
        // Extract all suffixes found in the company name
        if (!companyName || typeof companyName !== 'string') {
            return [];
        }
        
        const matches = companyName.match(this.suffixPattern);
        return matches || [];
    }
    
    getType(companyName) {
        // Determine the type of company based on suffixes
        const suffixes = this.getSuffixes(companyName);
        const types = new Set();
        
        suffixes.forEach(suffix => {
            const lowerSuffix = suffix.toLowerCase();
            
            if (['inc', 'inc.', 'incorporated', 'corp', 'corp.', 'corporation'].includes(lowerSuffix)) {
                types.add('corporation');
            } else if (['llc', 'l.l.c.', 'limited liability company'].includes(lowerSuffix)) {
                types.add('limited_liability_company');
            } else if (['ltd', 'ltd.', 'limited'].includes(lowerSuffix)) {
                types.add('limited_company');
            } else if (['plc', 'p.l.c.', 'public limited company'].includes(lowerSuffix)) {
                types.add('public_limited_company');
            } else if (['lp', 'l.p.', 'limited partnership'].includes(lowerSuffix)) {
                types.add('limited_partnership');
            } else if (['llp', 'l.l.p.', 'limited liability partnership'].includes(lowerSuffix)) {
                types.add('limited_liability_partnership');
            }
        });
        
        return Array.from(types);
    }
    
    getCountryHints(companyName) {
        // Suggest possible countries based on suffixes
        const suffixes = this.getSuffixes(companyName);
        const countries = new Set();
        
        suffixes.forEach(suffix => {
            const lowerSuffix = suffix.toLowerCase();
            
            // Check US suffixes
            if (this.suffixes.us.some(s => s.toLowerCase() === lowerSuffix)) {
                countries.add('US');
            }
            
            // Check UK suffixes
            if (this.suffixes.uk.some(s => s.toLowerCase() === lowerSuffix)) {
                countries.add('UK');
            }
            
            // Check European suffixes
            if (['ag', 'a.g.', 'gmbh', 'g.m.b.h.'].includes(lowerSuffix)) {
                countries.add('DE'); // Germany
                if (['ag', 'a.g.'].includes(lowerSuffix)) {
                    countries.add('CH'); // Switzerland
                }
            }
            if (['sa', 's.a.', 'sarl', 's.a.r.l.'].includes(lowerSuffix)) {
                countries.add('FR'); // France
            }
            if (['bv', 'b.v.', 'nv', 'n.v.'].includes(lowerSuffix)) {
                countries.add('NL'); // Netherlands
            }
            if (['spa', 's.p.a.'].includes(lowerSuffix)) {
                countries.add('IT'); // Italy
            }
            if (['ab', 'a.b.'].includes(lowerSuffix)) {
                countries.add('SE'); // Sweden
            }
            if (['as', 'a.s.'].includes(lowerSuffix)) {
                countries.add('NO'); // Norway
            }
            if (['oy', 'oyj'].includes(lowerSuffix)) {
                countries.add('FI'); // Finland
            }
            
            // Check Asian suffixes
            if (['kk', 'k.k.', 'yk', 'y.k.'].includes(lowerSuffix)) {
                countries.add('JP'); // Japan
            }
            if (['pte ltd', 'pte. ltd.'].includes(lowerSuffix)) {
                countries.add('SG'); // Singapore
            }
            if (['sdn bhd', 'sdn. bhd.'].includes(lowerSuffix)) {
                countries.add('MY'); // Malaysia
            }
        });
        
        return Array.from(countries);
    }
    
    isVariation(name1, name2) {
        // Check if two names are variations of the same company
        const norm1 = this.normalize(name1).toLowerCase();
        const norm2 = this.normalize(name2).toLowerCase();
        
        // Direct match
        if (norm1 === norm2) return true;
        
        // Check variations map
        for (const [key, variations] of this.variations) {
            const allNames = [key, ...variations];
            if (allNames.includes(norm1) && allNames.includes(norm2)) {
                return true;
            }
        }
        
        return false;
    }
    
    expandAbbreviation(text) {
        // Expand known abbreviations in text
        let expanded = text;
        
        for (const [abbr, full] of this.abbreviations) {
            const pattern = new RegExp(`\\b${abbr}\\b`, 'gi');
            expanded = expanded.replace(pattern, full);
        }
        
        return expanded;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CompanyNormalizer = CompanyNormalizer;
}

console.log('✅ Company Name Normalizer ready');