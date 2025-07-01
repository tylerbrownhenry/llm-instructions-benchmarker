# Claude Code Benchmarking System

An automated benchmarking system to evaluate how different Claude Code instruction configurations affect development outcomes, code quality, and adherence to various development methodologies.

## Overview

This system runs controlled experiments by:
1. Creating identical React app templates
2. Applying different CLAUDE.md instruction configurations
3. Running automated Claude Code sessions with the same prompt
4. Analyzing and comparing the results across multiple dimensions

## Quick Start

```bash
# Install dependencies
npm install

# Run full benchmark suite
npm run benchmark

# Or use the main script
node benchmark.js
```

## System Architecture

```
benchmark-runner/
├── config/
│   ├── ClaudeMapper.json          # Maps test scenarios to CLAUDE.md files
│   ├── Prompt.md                  # Standard prompt for all tests
│   └── ValidationTests.js         # Post-execution validation
├── templates/
│   └── react-app/                 # Base React app template
├── claude-configs/
│   ├── CLAUDE_NO_TDD.md          # Standard development approach
│   ├── CLAUDE_TDD.md             # Strict test-driven development
│   ├── CLAUDE_EMPTY.md           # Minimal instructions
│   └── CLAUDE_STRICT.md          # Strict coding standards
├── samples/                       # Generated test instances
├── results/                       # Execution results and analysis
├── scripts/
│   ├── setup.js                   # Create sample directories
│   ├── runner.js                  # Execute Claude Code sessions
│   └── analyzer.js                # Compare and analyze results
└── benchmark.js                   # Main orchestration script
```

## Available Scenarios

### 1. No TDD Instructions (`no-tdd`)
- **File**: `CLAUDE_NO_TDD.md`
- **Focus**: Standard development practices without TDD requirements
- **Approach**: Functionality-first development with best practices

### 2. Strict TDD (`tdd-strict`)
- **File**: `CLAUDE_TDD.md`
- **Focus**: Enforces strict test-driven development
- **Approach**: Red-Green-Refactor cycle with comprehensive testing

### 3. Minimal Instructions (`minimal`)
- **File**: `CLAUDE_EMPTY.md`
- **Focus**: Minimal guidance to test baseline behavior
- **Approach**: Basic feature implementation with standard practices

### 4. Strict Standards (`strict-standards`)
- **File**: `CLAUDE_STRICT.md`
- **Focus**: Comprehensive code quality and security requirements
- **Approach**: Enterprise-level standards with extensive validation

## Usage Examples

### Run Full Benchmark Suite
```bash
node benchmark.js
# or
npm run benchmark
```

### Run Specific Scenario
```bash
node benchmark.js scenario tdd-strict
# or
node benchmark.js --scenario=minimal
```

### Setup Only (Create Sample Directories)
```bash
node benchmark.js setup
# or
npm run setup
```

### Analyze Latest Results
```bash
node benchmark.js analyze
# or
npm run analyze
```

### List Available Scenarios
```bash
node benchmark.js list
```

### Check System Status
```bash
node benchmark.js status
```

## Command Options

- `--skip-setup`: Skip sample directory creation
- `--skip-analysis`: Skip result analysis phase
- `--cleanup`: Remove sample directories after completion
- `--scenario=<id>`: Run specific scenario only
- `--prompt=<file>`: Use custom prompt file

## Benchmark Process

### 1. Setup Phase
- Creates sample directories for each scenario
- Copies base React template to each sample
- Installs dependencies in each sample
- Copies appropriate CLAUDE.md configuration

### 2. Execution Phase
- Launches Claude Code sessions for each scenario
- Sends standardized prompt to each session
- Monitors session progress and logs output
- Handles timeouts and error conditions

### 3. Validation Phase
- Runs automated tests on generated code
- Checks for required features implementation
- Validates code quality (linting, tests)
- Measures performance metrics

### 4. Analysis Phase
- Compares results across scenarios
- Generates comprehensive reports
- Identifies patterns and insights
- Creates human-readable summaries

## Validation Metrics

The system evaluates results across multiple dimensions:

### Feature Implementation
- ✅ Todo component created
- ✅ Add/edit/delete functionality
- ✅ Local storage persistence
- ✅ Error handling implemented

### Code Quality
- ✅ Tests written and passing
- ✅ Code passes linting standards
- ✅ Proper error boundaries
- ✅ Performance optimizations

### Quantitative Metrics
- Lines of code added
- Completion time
- Test coverage percentage
- Build success rate

## Output Files

### Results Directory
- `benchmark-results-<timestamp>.json`: Raw session results
- `analysis-report-<timestamp>.json`: Detailed analysis data
- `analysis-summary-<timestamp>.md`: Human-readable summary
- `<scenario>-session.log`: Individual session logs

### Report Contents
- Executive summary with key metrics
- Scenario rankings by different criteria
- Detailed strengths/weaknesses analysis
- Performance comparisons
- Actionable insights and recommendations

## Configuration

### Modify Test Scenarios
Edit `config/ClaudeMapper.json` to add/remove scenarios or change settings:

```json
{
  "scenarios": [
    {
      "id": "custom-scenario",
      "name": "Custom Approach",
      "claudeFile": "CLAUDE_CUSTOM.md",
      "description": "Your custom instruction set"
    }
  ],
  "settings": {
    "parallelExecution": false,
    "timeoutMinutes": 30,
    "cleanupAfterRun": false
  }
}
```

### Customize Test Prompt
Edit `config/Prompt.md` to change the benchmark task:

```markdown
# Custom Benchmark Prompt

Implement a different feature to test various aspects...
```

### Add New Instruction Sets
Create new `CLAUDE_*.md` files in `claude-configs/` with your instruction variations.

## Extending the System

### Add New Validation Tests
Modify `config/ValidationTests.js`:

```javascript
const validationTests = {
  // Add your custom validation
  customCheck: (projectPath) => {
    // Your validation logic
    return true/false;
  }
};
```

### Modify Base Template
Update files in `templates/react-app/` to change the starting point for all scenarios.

## Requirements

- Node.js 14.0.0 or higher
- Claude Code CLI installed and accessible
- Sufficient disk space for multiple project copies
- Network access for npm package installation

## Troubleshooting

### Common Issues

**"No sample directories found"**
- Run `node benchmark.js setup` first

**"Session timeout"**
- Increase `timeoutMinutes` in ClaudeMapper.json
- Check if Claude Code is properly installed

**"Dependencies failed to install"**
- Ensure npm/node are properly configured
- Check network connectivity
- Verify package.json in template is valid

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=1 node benchmark.js
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Test your changes thoroughly
4. Submit pull request with detailed description

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or feature requests:
1. Check existing issues in the repository
2. Create new issue with detailed description
3. Include system information and error logs