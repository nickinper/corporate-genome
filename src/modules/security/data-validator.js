// /src/security/data-validator.js
class DataValidator {
    constructor() {
        this.schemas = new Map();
        this.suspiciousPatterns = new Set();
    }
    
    validateInternationalEntity(data) {
        // Critical: Validate jurisdiction codes
        const validJurisdictions = new Set(['us', 'gb', 'ch', 'ky', 'bm']);
        
        if (!validJurisdictions.has(data.jurisdiction_code)) {
            this.flagSuspicious('invalid_jurisdiction', data);
        }
        
        // Validate company numbers format per jurisdiction
        return this.validateCompanyNumber(data);
    }
    
    validateGovernmentContract(data) {
        // Ensure contract IDs match federal format
        const contractPattern = /^[A-Z0-9]{13,17}$/;
        
        if (!contractPattern.test(data.award_id)) {
            throw new SecurityError('Invalid contract format');
        }
    }
}