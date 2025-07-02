# Security-First Development Environment

This configuration automatically scans code for security vulnerabilities and maintains audit trails for all development activities.

## Security Features

### Automated Vulnerability Scanning
- **SAST Analysis**: Semgrep scans on every file save
- **Dependency Auditing**: NPM audit for package vulnerabilities  
- **Secret Detection**: Alerts on environment file modifications
- **Command Logging**: All bash commands logged for security review

### Hook-Based Security Checks

#### Code Analysis (PostToolUse)
```bash
# Automatic security scanning after file edits
npx semgrep --config=auto [file] --json
npm audit --audit-level=high --json
```

#### Environment Protection
- Monitors `.env*` file changes
- Logs sensitive file modifications
- Alerts on potential secret exposure

#### Command Auditing (PreToolUse)
- All bash commands logged with timestamps
- Security review trail maintained
- Suspicious activity detection

## Security Tools Integration

### Required Dependencies
```json
{
  "devDependencies": {
    "@semgrep/cli": "^1.0.0",
    "audit-ci": "^6.0.0",
    "git-secrets": "^1.3.0"
  }
}
```

### Setup Commands
```bash
# Install security tools
npm install -g @semgrep/cli
pip install bandit safety

# Configure git-secrets
git secrets --register-aws
git secrets --install
```

## Security Workflow Examples

### Secure Code Development
```bash
# User edits authentication.js
claude "Update user authentication with JWT"

# Automatic security checks:
# 1. Semgrep scans for auth vulnerabilities
# 2. Results saved to /tmp/semgrep_results.json
# 3. Security log updated
# 4. Alerts if issues found
```

### Dependency Management
```bash
# User updates package.json
claude "Add new authentication library"

# Automatic security checks:
# 1. NPM audit runs for new dependencies
# 2. High/critical vulnerabilities flagged
# 3. Audit results logged
# 4. Recommendations provided
```

### Environment Security
```bash
# User modifies .env file
claude "Update API keys in environment"

# Security monitoring:
# 1. Environment file change detected
# 2. Warning logged to security.log
# 3. Manual review reminder triggered
```

## Security Scanning Rules

### Semgrep Configuration
```yaml
# .semgrep.yml
rules:
  - id: hardcoded-secrets
    pattern: |
      $KEY = "$SECRET"
    message: Potential hardcoded secret detected
    severity: ERROR
    
  - id: sql-injection
    pattern: |
      db.query($QUERY + $INPUT)
    message: Potential SQL injection vulnerability
    severity: ERROR
    
  - id: xss-vulnerability
    pattern: |
      innerHTML = $INPUT
    message: Potential XSS vulnerability
    severity: WARNING
```

### NPM Audit Levels
- **Low**: Informational, logged only
- **Moderate**: Warning, review recommended
- **High**: Error, immediate attention required
- **Critical**: Blocking, must fix before deployment

## Monitoring and Alerts

### Security Logs
```bash
# View security activity
tail -f .claude/security.log

# Recent vulnerability scans
cat /tmp/semgrep_results.json | jq '.results[] | select(.extra.severity == "ERROR")'

# Audit findings
cat /tmp/audit_results.json | jq '.vulnerabilities[] | select(.severity == "high")'
```

### Alert Configuration
```json
{
  "alerts": {
    "high_vulnerability": "immediate",
    "secret_detected": "immediate", 
    "suspicious_command": "daily_digest",
    "audit_failure": "immediate"
  }
}
```

## Compliance Features

### SOC 2 Compliance
- All code changes logged
- Security scan results archived
- Access controls enforced
- Audit trail maintained

### GDPR Considerations
- PII detection in code comments
- Data processing activity logging
- Privacy impact assessments

### Security Standards
- OWASP Top 10 scanning
- CWE vulnerability detection
- NIST framework alignment

## Best Practices

### Development Workflow
1. **Write Code**: Normal development process
2. **Auto-Scan**: Security checks run automatically
3. **Review Results**: Check scan outputs
4. **Fix Issues**: Address vulnerabilities immediately
5. **Verify Fix**: Re-scan after remediation

### Secret Management
- Use environment variables for secrets
- Never commit `.env` files
- Rotate credentials regularly
- Use secret management services

### Dependency Security
- Regular dependency updates
- Vulnerability database monitoring
- License compliance checking
- Supply chain security

## Emergency Procedures

### High Severity Vulnerability
1. Immediate development freeze
2. Assess impact and exposure
3. Apply patches/workarounds
4. Test fixes thoroughly
5. Deploy emergency update

### Secret Exposure
1. Immediately rotate exposed credentials
2. Review access logs
3. Assess potential breach scope
4. Update security policies
5. Incident response documentation

## Integration Examples

### CI/CD Pipeline
```yaml
# .github/workflows/security.yml
- name: Security Scan
  run: |
    npx semgrep --config=auto --json --output=results.json
    npm audit --audit-level=high
```

### IDE Integration
```json
{
  "editor.codeActionsOnSave": {
    "source.security.scan": true
  }
}
```