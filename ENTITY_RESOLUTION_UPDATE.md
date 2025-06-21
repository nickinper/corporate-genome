# Corporate Genome - Entity Resolution Enhancement Update

## Overview
This update significantly improves the Corporate Genome extension's ability to detect, normalize, and match company names through advanced entity resolution techniques.

## New Components

### 1. Company Normalizer (`company-normalizer.js`)
Normalizes company names by removing legal suffixes and standardizing formats.

**Features:**
- Removes legal entity suffixes (Inc., Corp., LLC, Ltd., etc.)
- Supports international company formats (GmbH, AG, SA, KK, etc.)
- Identifies company type and country hints
- Expands common abbreviations (IBM → International Business Machines)
- Tracks company name variations

**Usage Example:**
```javascript
const normalizer = new CompanyNormalizer();
normalizer.normalize("Apple Inc."); // Returns: "Apple"
normalizer.getType("Microsoft Corporation"); // Returns: ["corporation"]
normalizer.getCountryHints("Toyota KK"); // Returns: ["JP"]
```

### 2. Fuzzy Matcher (`fuzzy-matcher.js`)
Implements various fuzzy string matching algorithms optimized for company names.

**Features:**
- Levenshtein distance calculation
- Token-based matching (handles word order variations)
- Company-specific stop word filtering
- Multiple matching strategies:
  - Simple ratio
  - Partial ratio
  - Token sort ratio
  - Token set ratio
  - Combined weighted ratio

**Usage Example:**
```javascript
const matcher = new FuzzyMatcher();
matcher.companyNameRatio("JPMorgan Chase", "JP Morgan"); // Returns: 0.89
matcher.isMatch("Microsoft Corp", "Microsoft Corporation"); // Returns: true
```

### 3. Company Knowledge Base (`company-knowledge-base.js`)
Local knowledge base of company entities with fast lookup and fuzzy search.

**Features:**
- Pre-loaded with Fortune 500 companies
- Multiple indexes for fast lookup (name, ticker, aliases)
- Fuzzy search with configurable threshold
- Tracks company relationships (subsidiaries, previous names)
- Import/export functionality

**Usage Example:**
```javascript
const kb = new CompanyKnowledgeBase();
kb.search("Apple", { limit: 3 }); // Returns matches with scores
kb.findByTicker("AAPL"); // Returns Apple Inc. entity
kb.isSameCompany("Meta", "Facebook"); // Returns: true
```

### 4. Enhanced NLP Processor (`nlp-processor-enhanced.js`)
Extends the base NLP processor with entity resolution capabilities.

**Features:**
- Integrates all entity resolution components
- Enhanced entity extraction with normalization
- Knowledge base verification
- Context extraction (industry, financial data, sentiment)
- Variation detection among entities
- Improved confidence scoring

**Usage Example:**
```javascript
const processor = new EnhancedNLPProcessor();
const result = await processor.extractEntities(text);
// Returns enhanced entities with KB matches, variations, and context
```

## Integration with Existing System

### Updated Files:
1. **manifest.json** - Added new modules in correct loading order
2. **base-adapter.js** - Uses EnhancedNLPProcessor when available
3. **forbes-adapter.js** - Leverages enhanced entity data
4. **intelligence-engine-v2.js** - Displays enhanced entity information in tooltips

### Enhanced Tooltip Display:
- Shows normalized company name
- Displays ticker symbol and exchange
- Shows industry classification
- Indicates knowledge base verification
- Enhanced confidence scoring

## Benefits

### 1. Improved Accuracy
- Better handling of company name variations
- Reduced false positives through KB verification
- Context-aware entity detection

### 2. Better User Experience
- More informative tooltips
- Verified entity indicators
- Industry and financial context

### 3. Performance
- Intelligent caching of resolution results
- Fast fuzzy matching algorithms
- Efficient knowledge base lookups

### 4. Extensibility
- Easy to add new companies to KB
- Configurable matching thresholds
- Modular design for easy updates

## Testing

A test page (`test-entity-resolution.html`) is included to verify:
- Company name normalization
- Fuzzy matching between variations
- Knowledge base searches
- Enhanced NLP processing

## Future Enhancements

1. **Dynamic Knowledge Base Updates**
   - API integration for real-time company data
   - Automatic learning from user interactions

2. **Advanced Matching**
   - Machine learning-based entity matching
   - Industry-specific matching rules

3. **Relationship Mapping**
   - Parent/subsidiary relationships
   - Merger and acquisition tracking
   - Corporate hierarchy visualization

4. **Multi-language Support**
   - International company name handling
   - Language-specific normalization rules

## Configuration

The system uses sensible defaults but can be configured:

```javascript
// Fuzzy matching threshold
fuzzyMatchThreshold: 0.75

// Knowledge base search options
{
  limit: 5,
  threshold: 0.7,
  includeAliases: true,
  includeTickers: true
}
```

## Impact on Existing Features

- **Hover detection**: Now shows enhanced entity information
- **Entity highlighting**: More accurate with fewer false positives
- **Confidence scoring**: Improved with KB verification
- **Performance**: Minimal impact due to efficient caching

This enhancement significantly improves the Corporate Genome extension's ability to accurately identify and provide information about companies across different websites.