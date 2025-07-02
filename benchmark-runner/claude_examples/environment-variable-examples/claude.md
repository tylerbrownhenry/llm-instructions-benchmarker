# Environment Variable Configuration

This example demonstrates configuring Claude Code entirely through environment variables, providing flexibility for different deployment scenarios and CI/CD pipelines.

## Environment Variable Categories

### API Configuration
```bash
# API credentials and endpoints
export ANTHROPIC_API_KEY="your-api-key-here"
export CLAUDE_CODE_USE_BEDROCK="false"
export CLAUDE_CODE_BEDROCK_REGION="us-west-2"
export CLAUDE_CODE_API_URL="https://api.anthropic.com"
```

### Agent Configuration
```bash
# Agent behavior and management
export CLAUDE_DEFAULT_AGENT="full-stack-dev"
export CLAUDE_ENABLE_CONCURRENT_AGENTS="true"
export CLAUDE_MAX_CONCURRENT_AGENTS="4"

# Complex agent configuration via JSON
export CLAUDE_AGENTS_CONFIG='[
  {
    "name": "full-stack-dev",
    "description": "Full-stack development assistant",
    "instructions": "Expert in React, Node.js, and PostgreSQL",
    "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  }
]'
```

### Hook Configuration
```bash
# Hook system settings
export CLAUDE_ENABLE_HOOKS="true"
export CLAUDE_HOOK_TIMEOUT="30000"
export CLAUDE_HOOK_LOG_LEVEL="info"

# Hooks defined as JSON
export CLAUDE_HOOKS_CONFIG='[
  {
    "event": "PostToolUse",
    "matcher": "Edit|Write", 
    "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\""
  }
]'
```

## Setup Methods

### 1. Direct Environment Variables
```bash
# Set variables directly
export CLAUDE_WORKSPACE="/Users/$USER/Development"
export CLAUDE_LOG_LEVEL="debug"
export CLAUDE_VERBOSE="true"

# Run Claude with environment configuration
claude "Create a new React component"
```

### 2. Environment Files
```bash
# Load from .env file
source .env.claude

# Or use with dotenv
npm install -g dotenv-cli
dotenv -e .env.claude claude "Start development"
```

### 3. Setup Script
```bash
# Make executable and run
chmod +x setup-env.sh
source setup-env.sh

# Now use configured aliases
claude-dev "Build user authentication"
claude-ops "Set up Docker containers"
```

## Environment-Specific Configurations

### Development Environment
```bash
#!/bin/bash
export NODE_ENV="development"
export CLAUDE_LOG_LEVEL="debug"
export CLAUDE_VERBOSE="true"
export CLAUDE_RUN_TESTS_ON_EDIT="true"
export CLAUDE_REQUIRE_APPROVAL=""
export DATABASE_URL="postgresql://localhost:5432/dev_db"
```

### Staging Environment
```bash
#!/bin/bash
export NODE_ENV="staging"
export CLAUDE_LOG_LEVEL="info"
export CLAUDE_VERBOSE="false"
export CLAUDE_REQUIRE_COMMIT_APPROVAL="true"
export CLAUDE_SANDBOX_MODE="false"
export DATABASE_URL="postgresql://staging-db:5432/app_staging"
```

### Production Environment
```bash
#!/bin/bash
export NODE_ENV="production"
export CLAUDE_LOG_LEVEL="warn"
export CLAUDE_VERBOSE="false"
export CLAUDE_SANDBOX_MODE="true"
export CLAUDE_REQUIRE_APPROVAL="Bash:*"
export DATABASE_URL="$PRODUCTION_DATABASE_URL"
```

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/claude-ci.yml
name: Claude CI Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      CLAUDE_DEFAULT_AGENT: "ci-specialist"
      CLAUDE_LOG_LEVEL: "info"
      CLAUDE_REQUIRE_APPROVAL: ""
      NODE_ENV: "test"
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Claude Environment
        run: |
          export CLAUDE_ENABLE_HOOKS="true"
          export CLAUDE_RUN_TESTS_ON_EDIT="false"
          source setup-env.sh
      
      - name: Run Claude CI Pipeline
        run: claude --workflow ci-pipeline
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

# Claude environment variables
ENV CLAUDE_WORKSPACE=/app
ENV CLAUDE_LOG_LEVEL=info
ENV CLAUDE_VERBOSE=false
ENV CLAUDE_ENABLE_HOOKS=true
ENV CLAUDE_DEFAULT_AGENT=production-assistant

# Application environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

WORKDIR /app
COPY . .

RUN npm install
RUN source setup-env.sh && claude --workflow build-production

CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: claude-secrets
              key: api-key
        - name: CLAUDE_DEFAULT_AGENT
          value: "production-assistant"
        - name: CLAUDE_LOG_LEVEL
          value: "warn"
        - name: CLAUDE_SANDBOX_MODE
          value: "true"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
```

## Secret Management

### Keychain Integration (macOS)
```bash
# Store API key securely
security add-generic-password -s "claude-api-key" -a "$USER" -w "your-key"

# Retrieve in setup script
export ANTHROPIC_API_KEY=$(security find-generic-password -s "claude-api-key" -w)
```

### 1Password CLI
```bash
# Store in 1Password
op item create --category="API Credential" --title="Claude API Key" password="your-key"

# Retrieve in setup script
export ANTHROPIC_API_KEY=$(op item get "Claude API Key" --fields password)
```

### AWS Secrets Manager
```bash
# Store secret
aws secretsmanager create-secret --name "claude-api-key" --secret-string "your-key"

# Retrieve in setup script
export ANTHROPIC_API_KEY=$(aws secretsmanager get-secret-value --secret-id "claude-api-key" --query SecretString --output text)
```

## Dynamic Configuration

### Context-Aware Setup
```bash
#!/bin/bash
# Dynamic configuration based on project type

detect_project_type() {
    if [[ -f "package.json" ]]; then
        if grep -q "react" package.json; then
            export CLAUDE_DEFAULT_AGENT="react-specialist"
        elif grep -q "express" package.json; then
            export CLAUDE_DEFAULT_AGENT="backend-specialist"
        fi
    elif [[ -f "Cargo.toml" ]]; then
        export CLAUDE_DEFAULT_AGENT="rust-specialist"
    elif [[ -f "requirements.txt" ]]; then
        export CLAUDE_DEFAULT_AGENT="python-specialist"
    fi
}

setup_project_specific_env() {
    detect_project_type
    
    # Set project-specific hooks
    if [[ -f "package.json" ]]; then
        export CLAUDE_HOOKS_CONFIG='[
          {
            "event": "PostToolUse",
            "matcher": "Edit",
            "command": "npm test -- --passWithNoTests"
          }
        ]'
    fi
}
```

### User-Specific Configuration
```bash
#!/bin/bash
# Configuration based on current user

setup_user_specific_env() {
    case "$USER" in
        "john.doe")
            export CLAUDE_DEFAULT_AGENT="senior-dev-assistant"
            export CLAUDE_VERBOSE="true"
            export CLAUDE_LOG_LEVEL="debug"
            ;;
        "jane.smith")
            export CLAUDE_DEFAULT_AGENT="ui-ux-specialist"
            export CLAUDE_VERBOSE="false"
            export CLAUDE_LOG_LEVEL="info"
            ;;
        *)
            export CLAUDE_DEFAULT_AGENT="general-assistant"
            export CLAUDE_VERBOSE="false"
            export CLAUDE_LOG_LEVEL="warn"
            ;;
    esac
}
```

## Workflow Automation

### Environment-Based Workflows
```bash
# Different workflows for different environments
export CLAUDE_WORKFLOWS_CONFIG='[
  {
    "name": "dev-workflow",
    "condition": "NODE_ENV=development",
    "steps": [
      {"command": "npm install"},
      {"command": "npm run dev"}
    ]
  },
  {
    "name": "prod-workflow", 
    "condition": "NODE_ENV=production",
    "steps": [
      {"command": "npm ci"},
      {"command": "npm run build"},
      {"command": "npm run test:prod"}
    ]
  }
]'
```

### Conditional Agent Activation
```bash
# Activate different agents based on conditions
if [[ "$NODE_ENV" == "development" ]]; then
    export CLAUDE_DEFAULT_AGENT="dev-assistant"
    export CLAUDE_ENABLE_CONCURRENT_AGENTS="true"
elif [[ "$NODE_ENV" == "production" ]]; then
    export CLAUDE_DEFAULT_AGENT="prod-monitor"
    export CLAUDE_ENABLE_CONCURRENT_AGENTS="false"
fi
```

## Monitoring and Logging

### Environment-Aware Logging
```bash
# Configure logging based on environment
export CLAUDE_LOG_FILE=".claude/logs/${NODE_ENV}-activity.log"
export CLAUDE_LOG_LEVEL="${LOG_LEVEL:-info}"

# Structured logging for production
if [[ "$NODE_ENV" == "production" ]]; then
    export CLAUDE_LOG_FORMAT="json"
    export CLAUDE_LOG_ROTATION="daily"
else
    export CLAUDE_LOG_FORMAT="text"
    export CLAUDE_LOG_ROTATION="never"
fi
```

### Performance Monitoring
```bash
# Performance settings based on environment
if [[ "$NODE_ENV" == "development" ]]; then
    export CLAUDE_TIMEOUT="300000"  # 5 minutes for development
    export CLAUDE_MAX_MEMORY="4096"
else
    export CLAUDE_TIMEOUT="120000"  # 2 minutes for production
    export CLAUDE_MAX_MEMORY="2048"
fi
```

## Best Practices

### Security
- Never commit API keys to version control
- Use secret management systems
- Rotate credentials regularly
- Audit environment variable access

### Configuration Management
- Use environment-specific configuration files
- Validate required variables on startup
- Provide sensible defaults
- Document all available variables

### CI/CD Integration
- Store secrets in CI/CD secret management
- Use different configurations per environment
- Validate configuration in pipelines
- Monitor for configuration drift

### Development Workflow
- Use setup scripts for consistent environments
- Create aliases for common operations
- Automate environment detection
- Provide easy reset/cleanup mechanisms

## Troubleshooting

### Debugging Environment Issues
```bash
# Print all Claude-related environment variables
env | grep CLAUDE | sort

# Validate configuration
claude config validate-env

# Test with specific environment
NODE_ENV=staging source setup-env.sh
claude config show
```

### Common Issues
```bash
# Missing API key
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
    echo "Error: ANTHROPIC_API_KEY not set"
    exit 1
fi

# Invalid JSON configuration
echo "$CLAUDE_AGENTS_CONFIG" | jq . > /dev/null || echo "Invalid agent config JSON"

# Permission issues
if [[ ! -w ".claude" ]]; then
    echo "Error: Cannot write to .claude directory"
    exit 1
fi
```