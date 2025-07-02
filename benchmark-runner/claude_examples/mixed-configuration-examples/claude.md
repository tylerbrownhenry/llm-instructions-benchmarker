# Mixed Configuration Precedence

This example demonstrates how Claude Code merges configuration from multiple sources with proper precedence ordering.

## Configuration Precedence Order

```
1. Enterprise Managed Policy (Lowest precedence, cannot be overridden)
2. User Settings (~/.claude/settings.json)
3. Shared Project Settings (.claude/settings.json)
4. Local Project Settings (.claude/settings.local.json)
5. Environment Variables (Highest precedence)
```

## Configuration Sources

### 1. Enterprise Managed Policy (Precedence: 1)
**Location**: `/Library/Application Support/ClaudeCode/managed-settings.json`

```json
{
  "permissions": {
    "allowTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "denyTools": ["WebFetch", "WebSearch"],
    "requireApproval": ["Bash:rm", "Bash:sudo", "Bash:docker"]
  },
  "security": {
    "maxSessionDuration": 7200,
    "auditLogging": true
  }
}
```

**Cannot be overridden by any other configuration**

### 2. User Settings (Precedence: 2)
**Location**: `~/.claude/settings.json`

```json
{
  "preferences": {
    "verbose": true,
    "theme": "dark",
    "notifications": true
  },
  "environment": {
    "CLAUDE_WORKSPACE": "/Users/john/Development",
    "DEFAULT_EDITOR": "code"
  }
}
```

**Applied globally across all projects**

### 3. Shared Project Settings (Precedence: 3)
**Location**: `.claude/settings.json` (committed to git)

```json
{
  "project": {
    "name": "react-ecommerce",
    "type": "frontend"
  },
  "agents": [
    {
      "name": "react-specialist",
      "scope": ["src/components/**", "src/pages/**"]
    }
  ]
}
```

**Shared with team, overrides user settings**

### 4. Local Project Settings (Precedence: 4)
**Location**: `.claude/settings.local.json` (git-ignored)

```json
{
  "personal": {
    "developer": "john.doe@company.com"
  },
  "preferences": {
    "verbose": true,
    "notifications": false
  }
}
```

**Personal overrides, highest file-based precedence**

### 5. Environment Variables (Precedence: 5)
**Location**: `.env`, shell environment, or runtime

```bash
CLAUDE_VERBOSE=true
CLAUDE_DEFAULT_AGENT=react-specialist
LOG_LEVEL=debug
```

**Highest precedence, overrides all file-based settings**

## Effective Configuration Example

Given the configuration sources above, the effective merged configuration would be:

```json
{
  "permissions": {
    "allowTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "denyTools": ["WebFetch", "WebSearch"],
    "requireApproval": ["Bash:rm", "Bash:sudo", "Bash:docker"]
  },
  "project": {
    "name": "react-ecommerce",
    "type": "frontend"
  },
  "preferences": {
    "verbose": true,
    "theme": "dark", 
    "notifications": false
  },
  "environment": {
    "CLAUDE_WORKSPACE": "/Users/john/Development",
    "DEFAULT_EDITOR": "code",
    "LOG_LEVEL": "debug",
    "NODE_ENV": "development"
  },
  "agents": [
    {
      "name": "react-specialist",
      "scope": ["src/components/**", "src/pages/**"],
      "defaultActive": true
    }
  ]
}
```

## Configuration Merging Rules

### Simple Values
```bash
# Enterprise: LOG_LEVEL=warn
# User: LOG_LEVEL=info  
# Project: LOG_LEVEL=debug
# Environment: LOG_LEVEL=trace
# Result: LOG_LEVEL=trace (environment wins)
```

### Arrays (Hooks, Agents)
```json
// Hooks are merged from all sources
"hooks": [
  // Enterprise mandatory hooks (always present)
  {"event": "PreToolUse", "command": "logger ..."},
  
  // User hooks
  {"event": "PostToolUse", "command": "prettier ..."},
  
  // Project hooks  
  {"event": "PostToolUse", "command": "eslint ..."},
  
  // Local hooks
  {"event": "Stop", "command": "echo session ended"}
]
```

### Objects (Environment, Preferences)
```json
// Deep merge with higher precedence overriding
"environment": {
  "CLAUDE_WORKSPACE": "/Users/john/Development",  // User setting
  "DEFAULT_EDITOR": "code",                       // User setting
  "LOG_LEVEL": "debug",                           // Environment override
  "NODE_ENV": "development",                      // Environment setting
  "API_BASE_URL": "http://localhost:3001"        // Project setting
}
```

## Validation and Debugging

### Check Effective Configuration
```bash
# View merged configuration from all sources
claude config show

# Show configuration with source attribution
claude config show --verbose

# Validate configuration hierarchy
claude config validate --all-sources
```

### Debug Configuration Issues
```bash
# Show configuration precedence
claude config precedence

# Test specific setting source
claude config get permissions.allowTools --show-source

# Override for testing
CLAUDE_VERBOSE=false claude config show
```

### Configuration Conflicts
```bash
# Check for conflicts between sources
claude config conflicts

# Show enterprise policy restrictions
claude config enterprise-restrictions

# Validate against enterprise policy
claude config validate --enterprise
```

## Practical Usage Examples

### Development Workflow
```bash
# Personal development with all overrides active
cd ~/Development/react-ecommerce

# Effective configuration includes:
# - Enterprise security policies (cannot override)
# - Personal user preferences (dark theme, verbose)
# - Project-specific React tools and agents
# - Local development environment variables
# - Personal shortcuts and custom commands

claude "Add user authentication component"
```

### Team Collaboration
```bash
# Team member checks out project
git clone repo && cd repo

# Gets shared project configuration automatically:
# - React-specific agents and tools
# - Project environment variables  
# - Shared hooks for code formatting
# - Testing configuration

# But retains personal settings:
# - Individual editor preferences
# - Personal notification settings
# - Custom development shortcuts
```

### CI/CD Environment
```bash
# CI environment with minimal overrides
export CLAUDE_VERBOSE=false
export CLAUDE_LOG_LEVEL=warn
export NODE_ENV=production
export CLAUDE_REQUIRE_APPROVAL=""

# Effective configuration:
# - Enterprise policies still enforced
# - Production environment variables
# - Minimal logging and output
# - Automated approval for CI operations
```

## Best Practices

### Configuration Management
- **Enterprise**: Set immutable security policies
- **User**: Configure personal preferences and global tools
- **Project**: Define project-specific agents and workflows
- **Local**: Override for personal development needs
- **Environment**: Use for runtime-specific overrides

### Security Considerations
- Enterprise policies always take precedence for security
- Sensitive data in environment variables or vault
- Audit all configuration sources
- Validate effective permissions regularly

### Team Collaboration
- Commit shared project settings
- Document required environment variables
- Use local settings for personal preferences
- Avoid committing personal API keys or secrets

### Development Workflow
- Test configuration changes in isolation
- Use environment variables for temporary overrides
- Validate configuration before deploying
- Monitor for configuration drift

## Configuration Examples by Role

### Software Developer
```json
{
  "userSettings": {
    "preferences": {"verbose": true, "theme": "dark"},
    "agents": ["general-dev-assistant"],
    "customCommands": {"quick-test": "npm test"}
  },
  "projectSettings": {
    "agents": ["react-specialist", "testing-specialist"],
    "hooks": ["format-on-save", "test-on-edit"]
  },
  "environmentOverrides": {
    "LOG_LEVEL": "debug",
    "CLAUDE_EXPLAIN_CHANGES": "true"
  }
}
```

### DevOps Engineer
```json
{
  "userSettings": {
    "agents": ["devops-specialist", "security-auditor"],
    "customCommands": {"deploy-staging": "kubectl apply -f k8s/"}
  },
  "projectSettings": {
    "hooks": ["security-scan", "infrastructure-validate"],
    "workflows": ["ci-pipeline", "deployment-workflow"]
  },
  "environmentOverrides": {
    "CLAUDE_INFRASTRUCTURE_MODE": "true",
    "CLAUDE_SECURITY_CHECKS": "strict"
  }
}
```

### Security Analyst
```json
{
  "userSettings": {
    "agents": ["security-auditor"],
    "preferences": {"auditLevel": "maximum"}
  },
  "projectSettings": {
    "hooks": ["mandatory-security-scan", "compliance-check"],
    "restrictedToRoles": ["security-team"]
  },
  "environmentOverrides": {
    "CLAUDE_SECURITY_MODE": "strict",
    "CLAUDE_AUDIT_EVERYTHING": "true"
  }
}
```

## Troubleshooting Configuration Issues

### Common Problems
```bash
# Configuration not taking effect
claude config reload

# Conflicting settings
claude config conflicts --resolve

# Permission denied
claude config check-permissions

# Environment variable issues
claude config env-debug
```

### Reset Configuration
```bash
# Reset to defaults while preserving enterprise policy
claude config reset --keep-enterprise

# Backup current configuration
claude config backup ~/.claude/backup-$(date +%Y%m%d)

# Restore from backup
claude config restore ~/.claude/backup-20240115
```