# Corporate Genome

Advanced corporate ownership intelligence Chrome extension with multi-source data integration and enterprise-grade security.

## Overview

Corporate Genome is a Chrome extension that provides real-time corporate ownership intelligence by detecting company names on web pages and displaying comprehensive ownership data from multiple authoritative sources.

## Features

- **Intelligent Company Recognition**: Multi-layered pattern recognition system that detects company names with high accuracy
- **Multi-Source Data Integration**: Aggregates data from:
  - Yahoo Finance
  - SEC EDGAR
  - OpenCorporates
  - USA Spending (Government contracts)
  - Federal Reserve Economic Data (FRED)
  - News APIs for sentiment analysis
- **Enterprise Security**: 
  - Input validation and sanitization
  - Rate limiting and abuse prevention
  - Secure API key storage with hardware-bound encryption
  - Data integrity validation to prevent poisoning attacks
- **Fault Tolerance**: Circuit breaker patterns for graceful degradation
- **Privacy-First Design**: Limited permissions, no user tracking

## Architecture

The extension follows a layered security architecture:

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │
├─────────────────────────────────────┤
│   Business Logic Layer              │
│  (Pattern Recognition & Orchestration)│
├─────────────────────────────────────┤
│      Security Layer                 │
│  (Validation, Rate Limiting, Crypto)│
├─────────────────────────────────────┤
│      Data Layer                     │
│    (Multi-Source API Integration)   │
└─────────────────────────────────────┘
```

### Core Components

- **Intelligence Engine**: Pattern recognition and company detection
- **Data Orchestrator**: Multi-source data fetching with resilience
- **Security Module**: Comprehensive protection against attacks
- **Plugin Architecture**: Extensible framework for adding data sources

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## Configuration

1. Set up API keys in the extension options:
   - Yahoo Finance API key
   - OpenCorporates API key
   - USA Spending API key
   - FRED API key
   - News API key

2. Configure security policies in `config/security-policies.json`

## Usage

1. Navigate to Forbes.com (currently the only supported site)
2. Hover over any company name mentioned in articles
3. View comprehensive ownership and financial data in the tooltip

## Security

This extension implements multiple security layers:

- **Input Sanitization**: All user inputs and API responses are sanitized
- **Rate Limiting**: Prevents API abuse and DDoS attacks
- **Data Validation**: Detects and quarantines suspicious data
- **Secure Storage**: API keys are encrypted with hardware-bound keys
- **Anomaly Detection**: Statistical analysis to identify unusual patterns

## Development

### Project Structure

```
corpgenome/
├── manifest.json           # Chrome extension manifest
├── config/                 # Configuration files
├── src/
│   ├── core/              # Core business logic
│   │   ├── intelligence-engine.js
│   │   ├── data-orchestrator.js
│   │   └── security/      # Security modules
│   ├── modules/           # Feature modules
│   │   ├── data/         # Data source integrations
│   │   ├── government/   # Government data sources
│   │   └── sentiment/    # News and sentiment analysis
│   └── utils/            # Utility functions
└── tests/                # Test suites
```

### Adding New Data Sources

1. Create a new module in `src/modules/data/`
2. Implement the plugin interface defined in `plugin-architecture.js`
3. Register the source in `data-orchestrator.js`
4. Add appropriate security validations

## Contributing

Contributions are welcome! Please ensure:
- All data sources are properly validated
- Security best practices are followed
- Tests are included for new features
- Code follows the existing style conventions

## License

[Add your license here]

## Disclaimer

This tool is for informational purposes only. Always verify corporate ownership information through official sources for critical decisions.