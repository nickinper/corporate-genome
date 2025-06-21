// Test suite for Corporate Genome Pattern Recognition Engine
const { JSDOM } = require('jsdom');

// Mock the intelligence engine module
let PatternRecognitionMembrane, OwnershipDataPipeline;

beforeAll(() => {
    // Create a mock DOM environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    
    // Load the intelligence engine code
    const intelligenceEngineCode = require('fs').readFileSync(
        require('path').join(__dirname, '../../src/core/intelligence-engine.js'), 
        'utf8'
    );
    
    // Execute in global context to make classes available
    eval(intelligenceEngineCode);
    
    // Assign to local variables
    PatternRecognitionMembrane = global.PatternRecognitionMembrane;
    OwnershipDataPipeline = global.OwnershipDataPipeline;
});

describe('PatternRecognitionMembrane', () => {
    let recognizer;
    
    beforeEach(() => {
        recognizer = new PatternRecognitionMembrane();
    });
    
    describe('Strict Pattern Matching', () => {
        test('should detect major financial institutions', async () => {
            const testCases = [
                { text: 'BlackRock manages trillions', expected: 'BlackRock' },
                { text: 'Vanguard Group leads the industry', expected: 'Vanguard' },
                { text: 'State Street Corporation', expected: 'State Street' },
                { text: 'JPMorgan Chase & Co.', expected: 'JPMorgan Chase' },
                { text: 'Goldman Sachs analysis', expected: 'Goldman Sachs' }
            ];
            
            for (const testCase of testCases) {
                const element = document.createElement('div');
                element.textContent = testCase.text;
                
                const result = await recognizer.detectCompany(element);
                
                expect(result).not.toBeNull();
                expect(result.company).toContain(testCase.expected);
                expect(result.strategy).toBe('strict');
                expect(result.confidence).toBeGreaterThanOrEqual(0.7);
            }
        });
        
        test('should handle case variations', async () => {
            const element = document.createElement('div');
            element.textContent = 'BLACKROCK is a major investor';
            
            const result = await recognizer.detectCompany(element);
            
            expect(result).not.toBeNull();
            expect(result.company.toLowerCase()).toContain('blackrock');
        });
    });
    
    describe('Flexible Pattern Matching', () => {
        test('should detect companies with common suffixes', async () => {
            const testCases = [
                'Acme Inc',
                'TechCorp LLC',
                'Global Industries Ltd',
                'Innovative Solutions Company',
                'StartupCo.'
            ];
            
            for (const text of testCases) {
                const element = document.createElement('div');
                element.textContent = text;
                
                const result = await recognizer.detectCompany(element);
                
                expect(result).not.toBeNull();
                expect(result.strategy).toBe('flexible');
            }
        });
        
        test('should detect common abbreviations', async () => {
            const testCases = [
                { text: 'Chase bank statement', expected: 'Chase' },
                { text: 'BofA quarterly results', expected: 'BofA' },
                { text: 'Citi announces new CEO', expected: 'Citi' }
            ];
            
            for (const testCase of testCases) {
                const element = document.createElement('div');
                element.textContent = testCase.text;
                
                const result = await recognizer.detectCompany(element);
                
                expect(result).not.toBeNull();
                expect(result.company).toContain(testCase.expected);
            }
        });
    });
    
    describe('Contextual Pattern Detection', () => {
        test('should detect companies by context clues', async () => {
            const testCases = [
                { text: 'CEO of Apple announced', expected: 'Apple' },
                { text: 'Microsoft was founded in 1975', expected: 'Microsoft' },
                { text: 'headquarters of Amazon', expected: 'Amazon' },
                { text: 'NYSE: TSLA trading high', expected: 'TSLA' },
                { text: 'NASDAQ: GOOGL report', expected: 'GOOGL' }
            ];
            
            for (const testCase of testCases) {
                const element = document.createElement('div');
                element.textContent = testCase.text;
                
                const result = await recognizer.detectCompany(element);
                
                expect(result).not.toBeNull();
                expect(result.company).toBe(testCase.expected);
                expect(result.strategy).toBe('contextual');
            }
        });
    });
    
    describe('Confidence Scoring', () => {
        test('should boost confidence for links with company keywords', async () => {
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com/company/blackrock';
            anchor.textContent = 'BlackRock';
            
            const result = await recognizer.detectCompany(anchor);
            
            expect(result.confidence).toBeGreaterThan(0.8);
        });
        
        test('should boost confidence for header elements', async () => {
            const h1 = document.createElement('h1');
            h1.textContent = 'Vanguard Group Overview';
            
            const result = await recognizer.detectCompany(h1);
            
            expect(result.confidence).toBeGreaterThan(0.8);
        });
        
        test('should not exceed maximum confidence of 1.0', async () => {
            const h1 = document.createElement('h1');
            const anchor = document.createElement('a');
            anchor.href = 'https://quote.com/company/blackrock';
            anchor.textContent = 'BlackRock';
            h1.appendChild(anchor);
            
            const result = await recognizer.detectCompany(anchor);
            
            expect(result.confidence).toBeLessThanOrEqual(1.0);
        });
    });
    
    describe('Security and Edge Cases', () => {
        test('should sanitize XSS attempts', async () => {
            const element = document.createElement('div');
            element.textContent = '<script>alert("xss")</script>BlackRock';
            
            const result = await recognizer.detectCompany(element);
            
            expect(result).not.toBeNull();
            expect(result.company).not.toContain('<script>');
            expect(result.company).toContain('BlackRock');
        });
        
        test('should handle empty elements', async () => {
            const element = document.createElement('div');
            element.textContent = '';
            
            const result = await recognizer.detectCompany(element);
            
            expect(result).toBeNull();
        });
        
        test('should handle very long text by truncating', async () => {
            const element = document.createElement('div');
            element.textContent = 'BlackRock ' + 'x'.repeat(200);
            
            const result = await recognizer.detectCompany(element);
            
            expect(result).not.toBeNull();
            expect(result.company.length).toBeLessThanOrEqual(100);
        });
        
        test('should handle non-string inputs safely', async () => {
            const element = document.createElement('div');
            element.textContent = null;
            
            const result = await recognizer.detectCompany(element);
            
            expect(result).toBeNull();
        });
    });
    
    describe('Context Extraction', () => {
        test('should extract parent and sibling context', () => {
            const parent = document.createElement('article');
            const element = document.createElement('span');
            const sibling = document.createElement('p');
            
            sibling.textContent = 'Financial Report';
            element.textContent = 'BlackRock';
            
            parent.appendChild(sibling);
            parent.appendChild(element);
            
            const context = recognizer.extractContext(element);
            
            expect(context.parentTag).toBe('ARTICLE');
            expect(context.siblingText).toContain('Financial Report');
        });
    });
});

describe('OwnershipDataPipeline', () => {
    let pipeline;
    
    beforeEach(() => {
        pipeline = new OwnershipDataPipeline();
    });
    
    describe('Data Fetching', () => {
        test('should fetch mock data for known companies', async () => {
            const data = await pipeline.fetchOwnershipData({
                company: 'JPMorgan Chase',
                confidence: 0.9
            });
            
            expect(data).toHaveProperty('depth');
            expect(data).toHaveProperty('owners');
            expect(Array.isArray(data.owners)).toBe(true);
            expect(data.owners.length).toBeGreaterThan(0);
        });
        
        test('should generate procedural data for unknown companies', async () => {
            const data = await pipeline.fetchOwnershipData({
                company: 'Unknown Corp XYZ',
                confidence: 0.8
            });
            
            expect(data).toHaveProperty('owners');
            expect(data.owners.length).toBeGreaterThanOrEqual(2);
        });
    });
    
    describe('Rate Limiting', () => {
        test('should enforce rate limits', async () => {
            const company = { company: 'TestCorp', confidence: 0.8 };
            
            // First request should succeed
            const data1 = await pipeline.fetchOwnershipData(company);
            expect(data1.error).not.toBe(true);
            
            // Immediate second request should be rate limited
            const data2 = await pipeline.fetchOwnershipData(company);
            expect(data2.error).toBe(true);
            expect(data2.owners[0].name).toBe('Data Temporarily Unavailable');
        });
    });
    
    describe('Data Validation', () => {
        test('should validate data structure', () => {
            const validData = {
                depth: 3,
                owners: [
                    { name: 'Investor A', percent: 10.5 },
                    { name: 'Investor B', percent: 8.2 }
                ]
            };
            
            expect(pipeline.validateDataStructure(validData)).toBe(true);
        });
        
        test('should reject invalid data structures', () => {
            const invalidCases = [
                null,
                { depth: 'not a number', owners: [] },
                { depth: 3, owners: 'not an array' },
                { depth: 3, owners: [{ name: 'Test' }] }, // missing percent
                { depth: 3, owners: [{ percent: 10 }] } // missing name
            ];
            
            for (const invalidData of invalidCases) {
                expect(pipeline.validateDataStructure(invalidData)).toBe(false);
            }
        });
    });
    
    describe('Caching', () => {
        test('should cache fetched data', async () => {
            const company = { company: 'CacheTest Inc', confidence: 0.8 };
            
            // First fetch
            const data1 = await pipeline.fetchOwnershipData(company);
            
            // Wait a bit but less than cache TTL
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Second fetch should return cached data
            const data2 = await pipeline.fetchOwnershipData(company);
            
            expect(data2).toEqual(data1);
        });
    });
});

// Integration test
describe('Entity Resolution Integration', () => {
    test('should detect company and fetch ownership data', async () => {
        const recognizer = new PatternRecognitionMembrane();
        const pipeline = new OwnershipDataPipeline();
        
        // Create test element
        const element = document.createElement('div');
        element.textContent = 'BlackRock is the largest asset manager';
        
        // Detect company
        const detection = await recognizer.detectCompany(element);
        expect(detection).not.toBeNull();
        
        // Fetch ownership data
        const ownershipData = await pipeline.fetchOwnershipData(detection);
        expect(ownershipData).toHaveProperty('owners');
        expect(ownershipData.owners.length).toBeGreaterThan(0);
    });
});