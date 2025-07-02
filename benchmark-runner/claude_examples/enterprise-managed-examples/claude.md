# Enterprise Managed Configuration

This example demonstrates enterprise-level Claude Code configuration with comprehensive security policies, compliance controls, and centralized management.

## Managed Settings Location

```bash
# macOS Enterprise Managed Settings
/Library/Application Support/ClaudeCode/managed-settings.json

# Linux/Windows Enterprise Managed Settings  
/etc/claude-code/managed-settings.json
```

## Enterprise Security Framework

### Comprehensive Permission Management
```json
{
  "permissions": {
    "allowTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "denyTools": ["WebFetch", "WebSearch"],
    "requireApproval": [
      "Bash:rm -rf", "Bash:sudo", "Bash:curl", "Bash:wget",
      "Bash:docker", "Bash:kubectl"
    ],
    "blockedCommands": ["ssh", "scp", "rsync", "nc", "telnet"]
  }
}
```

### Security Controls
```json
{
  "security": {
    "requireApiKeyFromVault": true,
    "vaultPath": "/secret/claude-code/api-keys",
    "maxSessionDuration": 7200,
    "forceReauthentication": 3600,
    "encryptTranscripts": true
  }
}
```

## Compliance and Governance

### Regulatory Compliance
```json
{
  "compliance": {
    "standards": ["SOX", "GDPR", "HIPAA"],
    "dataClassification": "confidential",
    "geographicRestrictions": ["US", "EU"],
    "allowedNetworks": ["10.0.0.0/8", "172.16.0.0/12"],
    "blockedDomains": ["pastebin.com", "github.gist.com"]
  }
}
```

### Audit and Retention
```json
{
  "security": {
    "auditLogging": {
      "enabled": true,
      "logLevel": "detailed",
      "destinations": [
        "syslog://security-logs.company.com:514",
        "file:///var/log/claude-code/audit.log"
      ]
    },
    "retentionPolicy": {
      "transcripts": 90,
      "auditLogs": 2555
    }
  }
}
```

## Enterprise Agent Management

### Approved Agents Only
```json
{
  "agents": {
    "allowCustomAgents": false,
    "approvedAgents": [
      {
        "name": "enterprise-dev",
        "description": "Enterprise development assistant",
        "instructions": "Follow company coding standards. Never expose sensitive data.",
        "maxConcurrency": 2,
        "auditLevel": "high"
      },
      {
        "name": "security-auditor", 
        "description": "Security compliance assistant",
        "instructions": "Focus on security compliance and vulnerability assessment.",
        "restrictedToRoles": ["security-team", "compliance-officer"],
        "auditLevel": "maximum"
      }
    ]
  }
}
```

## Mandatory Security Hooks

### Comprehensive Audit Trail
```json
{
  "hooks": {
    "mandatory": [
      {
        "event": "PreToolUse",
        "matcher": "*",
        "command": "logger -t claude-code \"User $USER executing: $CLAUDE_TOOL_INPUT_COMMAND\""
      },
      {
        "event": "PostToolUse",
        "matcher": "Write|Edit", 
        "command": "/opt/company/bin/security-scan \"$CLAUDE_TOOL_INPUT_FILE_PATH\""
      },
      {
        "event": "Stop",
        "matcher": "*",
        "command": "/opt/company/bin/session-audit $USER $SESSION_ID"
      }
    ],
    "disallowOverride": true
  }
}
```

## Enterprise Integrations

### Single Sign-On (SSO)
```json
{
  "integration": {
    "sso": {
      "provider": "okta",
      "domain": "company.okta.com", 
      "requiredGroups": ["claude-code-users"],
      "mfaRequired": true
    }
  }
}
```

### Vault Integration
```json
{
  "integration": {
    "vault": {
      "provider": "hashicorp-vault",
      "endpoint": "https://vault.company.com",
      "authMethod": "ldap"
    }
  }
}
```

### SIEM Integration
```json
{
  "integration": {
    "logging": {
      "splunk": {
        "endpoint": "https://splunk.company.com:8088",
        "index": "claude-code-activity"
      }
    }
  }
}
```

## Monitoring and Resource Management

### Comprehensive Monitoring
```json
{
  "monitoring": {
    "telemetryLevel": "full",
    "metricsEndpoint": "https://metrics.company.com/claude-code",
    "alerting": {
      "securityViolations": "immediate",
      "policyViolations": "immediate", 
      "unusualActivity": "hourly"
    }
  }
}
```

### Resource Limits
```json
{
  "monitoring": {
    "resourceLimits": {
      "maxMemoryMB": 2048,
      "maxCpuPercent": 50,
      "maxDiskSpaceMB": 1024,
      "maxNetworkBandwidthMbps": 10
    }
  }
}
```

## Environment Controls

### Mandatory Environment Variables
```json
{
  "environment": {
    "allowEnvironmentOverrides": false,
    "mandatoryVariables": {
      "COMPANY_PROXY": "http://proxy.company.com:8080",
      "COMPANY_PKI_CERT": "/etc/ssl/company-ca.crt",
      "SIEM_ENDPOINT": "https://siem.company.com/events"
    },
    "blockedVariables": [
      "ANTHROPIC_API_KEY",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY"
    ]
  }
}
```

## Update Management

### Controlled Updates
```json
{
  "updates": {
    "autoUpdate": false,
    "approvedVersions": ["1.2.0", "1.2.1"],
    "updateSource": "https://releases.company.com/claude-code",
    "verifySignatures": true
  }
}
```

## Deployment Scenarios

### Corporate Workstation Deployment
```bash
#!/bin/bash
# deploy-enterprise-settings.sh

# Deploy managed settings to all workstations
MANAGED_SETTINGS_PATH="/Library/Application Support/ClaudeCode"
sudo mkdir -p "$MANAGED_SETTINGS_PATH"

# Copy enterprise configuration
sudo cp managed-settings.json "$MANAGED_SETTINGS_PATH/"
sudo chown root:admin "$MANAGED_SETTINGS_PATH/managed-settings.json"
sudo chmod 644 "$MANAGED_SETTINGS_PATH/managed-settings.json"

# Configure system-wide proxy
sudo defaults write /Library/Preferences/com.anthropic.claude-code HTTPProxy "proxy.company.com:8080"

# Install company CA certificate
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain company-ca.crt

echo "Enterprise Claude Code configuration deployed"
```

### Group Policy Deployment (Windows)
```powershell
# Deploy via Group Policy
$ManagedPath = "C:\ProgramData\ClaudeCode"
New-Item -Path $ManagedPath -ItemType Directory -Force

Copy-Item "managed-settings.json" -Destination "$ManagedPath\" -Force

# Set appropriate permissions
$Acl = Get-Acl $ManagedPath
$Acl.SetAccessRuleProtection($true, $false)
$AdminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$UsersRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$Acl.SetAccessRule($AdminRule)
$Acl.SetAccessRule($UsersRule)
Set-Acl -Path $ManagedPath -AclObject $Acl
```

### Docker Enterprise Deployment
```dockerfile
# Enterprise Docker image
FROM node:18-alpine

# Add company CA certificates
COPY company-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Install Claude Code with managed settings
RUN npm install -g @anthropic/claude-code

# Copy enterprise configuration
COPY managed-settings.json /etc/claude-code/

# Set mandatory environment variables
ENV COMPANY_PROXY=http://proxy.company.com:8080
ENV COMPANY_PKI_CERT=/usr/local/share/ca-certificates/company-ca.crt

# Configure non-root user
RUN adduser -D -s /bin/sh claude-user
USER claude-user

WORKDIR /workspace
CMD ["claude"]
```

## Compliance Workflows

### Security Audit Workflow
```bash
# Enterprise security audit
claude --agent security-auditor "Perform security audit of codebase"

# Automated compliance checks:
# 1. Scans for hardcoded secrets
# 2. Validates security headers
# 3. Checks for SQL injection vulnerabilities
# 4. Verifies input validation
# 5. Generates compliance report
```

### Code Review Compliance
```bash
# Mandatory enterprise code review
claude --agent enterprise-dev "Review code for compliance standards"

# Compliance validation:
# 1. Checks coding standards adherence
# 2. Validates approved library usage
# 3. Ensures proper error handling
# 4. Verifies logging requirements
# 5. Documents review findings
```

## Monitoring Dashboard

### Enterprise Metrics
```json
{
  "metrics": {
    "activeUsers": 245,
    "sessionsToday": 1420,
    "policyViolations": 3,
    "securityAlerts": 0,
    "complianceScore": 98.5,
    "resourceUtilization": {
      "cpu": "12%",
      "memory": "1.2GB", 
      "network": "2.1Mbps"
    }
  }
}
```

### Alert Definitions
```json
{
  "alerts": [
    {
      "name": "Security Violation",
      "condition": "security_event.severity >= HIGH",
      "action": "immediate_notification",
      "recipients": ["security-team@company.com"]
    },
    {
      "name": "Resource Limit Exceeded",
      "condition": "resource_usage > policy_limit",
      "action": "throttle_user",
      "notification": "user_notification"
    },
    {
      "name": "Unusual Activity Pattern",
      "condition": "activity_deviation > threshold",
      "action": "enhanced_monitoring",
      "duration": "24h"
    }
  ]
}
```

## Best Practices

### Enterprise Security
- Centralized policy management
- Regular security audits
- Principle of least privilege
- Comprehensive audit logging
- Automated compliance monitoring

### Change Management
- Version-controlled policy changes
- Staged rollout procedures
- Rollback capabilities
- Impact assessment
- Stakeholder approval process

### User Support
- Self-service documentation
- Escalation procedures
- Training programs
- Feedback mechanisms
- Regular policy reviews

### Technical Implementation
- Immutable configuration files
- Signature verification
- Encrypted communications
- Resource monitoring
- Performance optimization

## Troubleshooting

### Common Enterprise Issues
```bash
# Policy validation
claude config validate-enterprise

# Check SSO authentication
claude auth test-sso

# Verify vault connectivity
claude vault test-connection

# Review audit logs
tail -f /var/log/claude-code/audit.log | jq .

# Resource usage monitoring
claude system status --enterprise
```

### Support Escalation
```json
{
  "support": {
    "helpdesk": "it-help@company.com",
    "documentation": "https://wiki.company.com/claude-code",
    "escalation": {
      "security": "security-team@company.com",
      "compliance": "compliance@company.com",
      "technical": "claude-admins@company.com"
    }
  }
}
```