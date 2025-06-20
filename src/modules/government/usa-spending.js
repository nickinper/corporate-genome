// USAspending.gov Integration - Government Contract Intelligence
console.log('Corporate Genome: USAspending module loaded');

const USASPENDING_CONFIG = {
    baseUrl: 'https://api.usaspending.gov/api/v2',
    noKeyRequired: true,
    timeout: 8000,
    uniqueValue: 'Government contract dependency analysis'
};

// Federal agencies with high spending (for context)
const MAJOR_AGENCIES = {
    'DEPARTMENT OF DEFENSE': { code: 'DOD', riskWeight: 1.2 },
    'DEPARTMENT OF HEALTH AND HUMAN SERVICES': { code: 'HHS', riskWeight: 0.8 },
    'DEPARTMENT OF VETERANS AFFAIRS': { code: 'VA', riskWeight: 0.9 },
    'DEPARTMENT OF ENERGY': { code: 'DOE', riskWeight: 1.1 },
    'NATIONAL AERONAUTICS AND SPACE ADMINISTRATION': { code: 'NASA', riskWeight: 1.0 },
    'DEPARTMENT OF HOMELAND SECURITY': { code: 'DHS', riskWeight: 1.3 }
};

async function getUSASpendingData(companyName) {
    try {
        console.log(`🏛️ Fetching USAspending data for: ${companyName}`);
        
        // Search for awards by recipient name
        const searchEndpoint = `${USASPENDING_CONFIG.baseUrl}/search/spending_by_award/`;
        
        const requestBody = {
            filters: {
                recipient_search_text: [companyName],
                award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
                time_period: [
                    {
                        start_date: getDateYearsAgo(3), // Last 3 years
                        end_date: new Date().toISOString().split('T')[0]
                    }
                ]
            },
            fields: [
                'Award ID',
                'Recipient Name', 
                'Award Amount',
                'Award Type',
                'Awarding Agency',
                'Awarding Sub Agency',
                'Period of Performance Start Date',
                'Period of Performance Current End Date',
                'Description'
            ],
            page: 1,
            limit: 50,
            sort: 'Award Amount',
            order: 'desc'
        };

        const response = await fetch(searchEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Corporate Genome Extension v0.5.0'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`USAspending API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const contracts = data.results.map(result => {
                const contract = {
                    awardId: result['Award ID'],
                    recipientName: result['Recipient Name'],
                    amount: parseFloat(result['Award Amount']) || 0,
                    amountFormatted: formatCurrency(result['Award Amount']),
                    awardType: result['Award Type'],
                    agency: result['Awarding Agency'],
                    subAgency: result['Awarding Sub Agency'],
                    startDate: result['Period of Performance Start Date'],
                    endDate: result['Period of Performance Current End Date'],
                    description: result['Description'] || 'No description available',
                    isClassified: isClassifiedContract(result['Description']),
                    agencyRisk: getAgencyRiskWeight(result['Awarding Agency'])
                };

                // Validate contract ID format
                if (contract.awardId && !/^[A-Z0-9\-_]{8,25}$/i.test(contract.awardId)) {
                    console.warn(`⚠️ Unusual contract ID format: ${contract.awardId}`);
                }

                return contract;
            });

            // Analyze government dependency
            const dependencyAnalysis = analyzeGovernmentDependency(contracts);

            return {
                contracts: contracts.slice(0, 10), // Top 10 contracts
                dependencyAnalysis,
                totalContracts: data.page_metadata?.total || contracts.length,
                source: 'USAspending.gov',
                searchPeriod: '3 years',
                lastUpdated: new Date().toISOString()
            };
        }

        return {
            contracts: [],
            dependencyAnalysis: { riskLevel: 'NONE', totalValue: 0 },
            totalContracts: 0,
            source: 'USAspending.gov',
            message: 'No government contracts found'
        };
        
    } catch (error) {
        console.error('USAspending error:', error);
        return null;
    }
}

function analyzeGovernmentDependency(contracts) {
    if (!contracts || contracts.length === 0) {
        return {
            riskLevel: 'NONE',
            totalValue: 0,
            explanation: 'No government contracts detected'
        };
    }

    const totalValue = contracts.reduce((sum, contract) => sum + contract.amount, 0);
    const agencyDistribution = {};
    const contractTypes = {};
    let classifiedCount = 0;

    contracts.forEach(contract => {
        // Agency distribution
        const agency = contract.agency || 'Unknown';
        agencyDistribution[agency] = (agencyDistribution[agency] || 0) + contract.amount;
        
        // Contract types
        const type = contract.awardType || 'Unknown';
        contractTypes[type] = (contractTypes[type] || 0) + 1;
        
        // Classified contracts
        if (contract.isClassified) {
            classifiedCount++;
        }
    });

    // Calculate risk level
    let riskLevel = 'LOW';
    const riskFactors = [];

    if (totalValue > 100000000) { // >$100M
        riskLevel = 'HIGH';
        riskFactors.push('High total contract value (>$100M)');
    } else if (totalValue > 10000000) { // >$10M
        riskLevel = 'MEDIUM';
        riskFactors.push('Significant contract value (>$10M)');
    }

    // Check for defense/security exposure
    if (agencyDistribution['DEPARTMENT OF DEFENSE'] > totalValue * 0.3) {
        riskLevel = 'HIGH';
        riskFactors.push('High defense dependency (>30%)');
    }

    // Check for classified work
    if (classifiedCount > 0) {
        riskLevel = 'HIGH';
        riskFactors.push('Classified/sensitive contracts detected');
    }

    // Check for agency concentration
    const maxAgencyExposure = Math.max(...Object.values(agencyDistribution)) / totalValue;
    if (maxAgencyExposure > 0.7) {
        riskLevel = 'HIGH';
        riskFactors.push('High agency concentration (>70%)');
    }

    return {
        riskLevel,
        totalValue,
        totalValueFormatted: formatCurrency(totalValue),
        agencyDistribution,
        contractTypes,
        classifiedCount,
        riskFactors,
        explanation: generateDependencyExplanation(riskLevel, totalValue, riskFactors)
    };
}

function isClassifiedContract(description) {
    if (!description) return false;
    
    const classifiedKeywords = [
        'classified', 'secret', 'confidential', 'security clearance',
        'top secret', 'restricted', 'sensitive', 'defense',
        'military', 'intelligence', 'surveillance'
    ];
    
    const desc = description.toLowerCase();
    return classifiedKeywords.some(keyword => desc.includes(keyword));
}

function getAgencyRiskWeight(agency) {
    const agencyData = MAJOR_AGENCIES[agency?.toUpperCase()];
    return agencyData ? agencyData.riskWeight : 1.0;
}

function getDateYearsAgo(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split('T')[0];
}

function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toLocaleString()}`;
}

function generateDependencyExplanation(riskLevel, totalValue, riskFactors) {
    switch (riskLevel) {
        case 'HIGH':
            return `High government dependency detected. Total contracts: ${formatCurrency(totalValue)}. Key risks: ${riskFactors.join(', ')}.`;
        case 'MEDIUM':
            return `Moderate government exposure. Total contracts: ${formatCurrency(totalValue)}. Monitor for revenue concentration.`;
        case 'LOW':
            return `Limited government contracts detected. Low dependency risk.`;
        default:
            return 'No government contract exposure identified.';
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.getUSASpendingData = getUSASpendingData;
}

console.log('🏛️ USAspending integration ready - Government contract intelligence enabled');