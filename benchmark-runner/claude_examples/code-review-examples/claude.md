# Automated Code Review with Claude Code

This configuration implements comprehensive automated code review processes with quality gates and GitHub integration.

## Automated Review Checks

### Real-Time Quality Monitoring
- **Lint Analysis**: ESLint runs on every file modification
- **Test Execution**: Relevant tests run automatically
- **Coverage Tracking**: Test coverage monitored continuously
- **Complexity Analysis**: Code complexity checked on changes

### Review Queue Management
```bash
# Files automatically added to review queue
.claude/review-queue.txt

# Example output:
Modified: src/components/Button.tsx
Modified: src/utils/validation.ts
Modified: tests/validation.test.ts
```

## Quality Gates

### Coverage Requirements
```json
{
  "quality_gates": {
    "min_test_coverage": 80,     // Minimum 80% coverage
    "max_complexity": 10,        // Maximum cyclomatic complexity
    "no_lint_errors": true,      // Zero lint errors allowed
    "require_tests": true        // Tests required for new code
  }
}
```

### Automated Checks
- **Security Scanning**: SAST analysis on code changes
- **Performance Impact**: Bundle size and runtime analysis
- **Maintainability**: Code smell detection
- **Documentation**: Comment coverage validation

## GitHub Integration

### Pull Request Automation
```yaml
# .github/workflows/review.yml
name: Automated Review
on: [pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Review Checks
        run: |
          npm run lint
          npm run test:coverage
          npm run security:scan
          npm run complexity:check
```

### Status Checks
Required checks before merge:
- ✅ **Lint**: No ESLint errors
- ✅ **Tests**: All tests passing
- ✅ **Coverage**: Minimum 80% coverage
- ✅ **Security**: No high-severity issues
- ✅ **Complexity**: Under complexity threshold

### Branch Protection
```json
{
  "github_integration": {
    "block_merge": {
      "failing_tests": true,
      "lint_errors": true, 
      "security_issues": true,
      "low_coverage": true
    }
  }
}
```

## Review Workflows

### Pre-Commit Review
```bash
claude --workflow pre-commit-review

# Execution:
# 1. Runs ESLint across codebase
# 2. Executes test suite with coverage
# 3. Performs security scan
# 4. Checks code complexity
# 5. Generates review summary
```

### PR Creation with Checklist
```bash
claude --workflow create-review-pr "Add user authentication"

# Automated process:
# 1. Stages all changes
# 2. Creates descriptive commit
# 3. Opens PR with review template
# 4. Assigns reviewers based on code ownership
```

## Review Templates

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization checked

## Performance
- [ ] No performance regressions
- [ ] Bundle size impact assessed
- [ ] Database queries optimized

## Code Quality
- [ ] Code follows style guidelines
- [ ] Self-documenting code written
- [ ] Comments added where necessary
- [ ] No code duplication introduced
```

### Review Checklist
```markdown
## Review Checklist

### Functionality ✅
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling implemented

### Code Quality ✅
- [ ] Clean, readable code
- [ ] Appropriate abstractions
- [ ] No code smells

### Testing ✅
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] No flaky tests

### Security ✅
- [ ] No security vulnerabilities
- [ ] Input sanitization
- [ ] Secure coding practices

### Performance ✅
- [ ] No performance issues
- [ ] Efficient algorithms
- [ ] Resource usage optimized
```

## Automated Analysis Tools

### Code Quality Tools
```json
{
  "devDependencies": {
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "sonarjs": "^0.19.0",
    "complexity-report": "^2.0.0",
    "@typescript-eslint/parser": "^5.0.0"
  }
}
```

### Configuration Files
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:security/recommended'
  ],
  rules: {
    'complexity': ['error', { max: 10 }],
    'max-lines-per-function': ['error', { max: 50 }],
    'max-depth': ['error', { max: 4 }]
  }
};
```

## Review Metrics

### Quality Metrics Dashboard
```bash
# Generate review metrics
npm run metrics:generate

# Example output:
Code Coverage: 85%
Cyclomatic Complexity: 7.2 avg
ESLint Issues: 0
Security Issues: 0
Review Time: 2.3 days avg
```

### Tracking
- **Review Velocity**: Time from PR to merge
- **Defect Rate**: Issues found post-merge
- **Coverage Trends**: Test coverage over time
- **Complexity Growth**: Code complexity evolution

## Advanced Review Features

### AI-Powered Analysis
```bash
# Semantic code analysis
claude "Review this component for React best practices"

# Automated feedback:
# - Component structure analysis
# - Hook usage validation
# - Performance optimization suggestions
# - Accessibility compliance check
```

### Context-Aware Reviews
```bash
# Smart review based on file types
claude "Review authentication changes"

# Security-focused analysis:
# - Authentication flow validation
# - Session management review
# - Input sanitization check
# - Authorization verification
```

## Integration Examples

### IDE Integration
```json
{
  "editor.codeActionsOnSave": {
    "source.review.quick": true,
    "source.fixAll.eslint": true
  },
  "editor.rulers": [80, 120],
  "editor.formatOnSave": true
}
```

### CLI Commands
```bash
# Quick review commands
npm run review:quick        # Fast quality check
npm run review:full         # Comprehensive analysis
npm run review:security     # Security-focused review
npm run review:performance  # Performance analysis
```

## Best Practices

### Review Guidelines
1. **Small PRs**: Keep changes focused and reviewable
2. **Clear Descriptions**: Explain what and why, not how
3. **Test Coverage**: Include tests with every change
4. **Documentation**: Update docs for public APIs
5. **Security First**: Always consider security implications

### Reviewer Guidelines
1. **Constructive Feedback**: Focus on improvement, not criticism
2. **Code Style**: Use automated tools, not manual comments
3. **Logic Review**: Focus on business logic and edge cases
4. **Performance**: Consider scalability and efficiency
5. **Maintainability**: Ensure code is sustainable long-term

### Automation Benefits
- **Consistency**: Standardized review criteria
- **Speed**: Faster feedback cycles
- **Quality**: Comprehensive automated checks
- **Learning**: Educational feedback for developers
- **Compliance**: Audit trail for regulatory requirements