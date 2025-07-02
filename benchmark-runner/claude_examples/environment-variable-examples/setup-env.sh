#!/bin/bash

# Claude Code Environment Setup Script
# This script demonstrates different ways to configure Claude Code using environment variables

set -e

echo "🚀 Setting up Claude Code environment configuration..."

# === Development Environment Setup ===
export CLAUDE_WORKSPACE="$(pwd)"
export CLAUDE_PROJECT_ROOT="."
export NODE_ENV="development"
export LOG_LEVEL="debug"

# === API Configuration ===
# Option 1: Direct environment variable
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-your-api-key-here}"

# Option 2: Read from keychain (macOS)
if command -v security &> /dev/null; then
    echo "🔑 Attempting to read API key from keychain..."
    export ANTHROPIC_API_KEY=$(security find-generic-password -s "claude-api-key" -w 2>/dev/null || echo "")
fi

# Option 3: Read from 1Password CLI
if command -v op &> /dev/null; then
    echo "🔐 Attempting to read API key from 1Password..."
    export ANTHROPIC_API_KEY=$(op item get "Claude API Key" --fields password 2>/dev/null || echo "")
fi

# === Agent Configuration ===
export CLAUDE_DEFAULT_AGENT="full-stack-dev"
export CLAUDE_ENABLE_CONCURRENT_AGENTS="true"
export CLAUDE_MAX_CONCURRENT_AGENTS="4"

# Define available agents
export CLAUDE_AGENTS_CONFIG='[
  {
    "name": "full-stack-dev",
    "description": "Full-stack development assistant",
    "instructions": "Expert in React, Node.js, and PostgreSQL. Write clean, tested code.",
    "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  },
  {
    "name": "devops-specialist", 
    "description": "DevOps and infrastructure specialist",
    "instructions": "Focus on Docker, Kubernetes, CI/CD, and monitoring. Prioritize security.",
    "tools": ["Read", "Write", "Edit", "Bash"]
  },
  {
    "name": "security-auditor",
    "description": "Security analysis and compliance specialist", 
    "instructions": "Identify vulnerabilities, ensure compliance, review security practices.",
    "tools": ["Read", "Grep", "Bash"]
  }
]'

# === Hook Configuration ===
export CLAUDE_ENABLE_HOOKS="true"
export CLAUDE_HOOK_TIMEOUT="30000"
export CLAUDE_HOOK_LOG_LEVEL="info"

# Define hooks configuration
export CLAUDE_HOOKS_CONFIG='[
  {
    "event": "PostToolUse",
    "matcher": "Edit|Write",
    "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
  },
  {
    "event": "PostToolUse", 
    "matcher": "Edit",
    "command": "if [[ \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *.js || \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *.ts ]]; then npm test -- --testPathPattern=\"$CLAUDE_TOOL_INPUT_FILE_PATH\" --passWithNoTests; fi"
  },
  {
    "event": "PreToolUse",
    "matcher": "Bash",
    "command": "echo \"$(date): Running command: $CLAUDE_TOOL_INPUT_COMMAND\" >> .claude/env-activity.log"
  }
]'

# === Tool Permissions ===
export CLAUDE_ALLOW_TOOLS="Read,Write,Edit,Bash,Glob,Grep,WebFetch"
export CLAUDE_DENY_TOOLS=""
export CLAUDE_REQUIRE_APPROVAL="Bash:rm -rf,Bash:sudo,Bash:curl"

# === Workflow Configuration ===
export CLAUDE_WORKFLOWS_CONFIG='[
  {
    "name": "ci-pipeline",
    "description": "Continuous integration pipeline",
    "steps": [
      {"command": "npm install"},
      {"command": "npm run lint"},
      {"command": "npm run test"},
      {"command": "npm run build"},
      {"command": "npm run test:e2e"}
    ]
  },
  {
    "name": "deploy-staging",
    "description": "Deploy to staging environment",
    "steps": [
      {"command": "npm run build"},
      {"command": "docker build -t app:staging ."},
      {"command": "kubectl apply -f k8s/staging/"},
      {"command": "kubectl rollout status deployment/app-staging"}
    ]
  }
]'

# === Database Configuration ===
export DATABASE_URL="postgresql://localhost:5432/claude_dev"
export REDIS_URL="redis://localhost:6379"
export API_BASE_URL="http://localhost:3000"

# === Testing Configuration ===
export CLAUDE_RUN_TESTS_ON_EDIT="true"
export CLAUDE_TEST_FRAMEWORK="jest"
export CLAUDE_COVERAGE_THRESHOLD="80"
export CLAUDE_E2E_FRAMEWORK="playwright"

# === Build and Development ===
export CLAUDE_AUTO_BUILD="false"
export CLAUDE_BUILD_COMMAND="npm run build"
export CLAUDE_BUILD_OUTPUT="dist"
export CLAUDE_WATCH_FILES="src/**/*,tests/**/*"
export CLAUDE_DEFAULT_EDITOR="code"

# === Logging and Monitoring ===
export CLAUDE_LOG_LEVEL="debug"
export CLAUDE_LOG_FILE=".claude/env-activity.log"
export CLAUDE_VERBOSE="true"
export CLAUDE_CLEANUP_PERIOD_DAYS="30"

# === Security Settings ===
export CLAUDE_INCLUDE_COAUTHORED_BY="true"
export CLAUDE_REQUIRE_COMMIT_APPROVAL="false"
export CLAUDE_SANDBOX_MODE="false"

# === Performance Settings ===
export CLAUDE_TIMEOUT="120000"
export CLAUDE_MAX_MEMORY="2048"
export CLAUDE_ENABLE_CACHE="true"
export CLAUDE_CACHE_SIZE="1000"

# === Notification Configuration ===
export CLAUDE_NOTIFICATIONS_ENABLED="true"
export CLAUDE_NOTIFICATION_SOUND="false"
# Uncomment and set your webhook URL
# export CLAUDE_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# === Development Tools Integration ===
export CLAUDE_GIT_AUTO_STAGE="false"
export CLAUDE_GIT_AUTO_COMMIT="false" 
export CLAUDE_GIT_AUTO_PUSH="false"

# === Custom Functions ===
setup_claude_aliases() {
    echo "📝 Setting up Claude aliases..."
    
    # Quick development commands
    alias claude-dev='claude --agent full-stack-dev'
    alias claude-ops='claude --agent devops-specialist'
    alias claude-sec='claude --agent security-auditor'
    
    # Workflow shortcuts
    alias claude-ci='claude --workflow ci-pipeline'
    alias claude-deploy='claude --workflow deploy-staging'
    
    # Quick actions
    alias claude-test='CLAUDE_RUN_TESTS_ON_EDIT=true claude'
    alias claude-quiet='CLAUDE_VERBOSE=false claude'
    alias claude-debug='CLAUDE_LOG_LEVEL=debug CLAUDE_VERBOSE=true claude'
}

setup_development_environment() {
    echo "🛠️  Setting up development environment..."
    
    # Create necessary directories
    mkdir -p .claude logs temp
    
    # Initialize log files
    touch .claude/env-activity.log
    touch logs/development.log
    
    # Set up Git hooks if in a Git repository
    if [ -d ".git" ]; then
        echo "🔗 Setting up Git hooks..."
        echo '#!/bin/bash' > .git/hooks/pre-commit
        echo 'npm run lint && npm run test' >> .git/hooks/pre-commit
        chmod +x .git/hooks/pre-commit
    fi
    
    # Create development database if it doesn't exist
    if command -v createdb &> /dev/null; then
        echo "🗄️  Creating development database..."
        createdb claude_dev 2>/dev/null || echo "Database already exists"
    fi
}

validate_environment() {
    echo "✅ Validating environment configuration..."
    
    # Check required tools
    local required_tools=("node" "npm" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            echo "❌ Required tool not found: $tool"
            return 1
        fi
    done
    
    # Check API key
    if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your-api-key-here" ]; then
        echo "⚠️  Warning: ANTHROPIC_API_KEY not set or using placeholder"
    fi
    
    # Check database connection
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            echo "✅ Database connection successful"
        else
            echo "⚠️  Warning: Cannot connect to database"
        fi
    fi
    
    echo "✅ Environment validation complete"
}

# === Environment-Specific Configurations ===
setup_environment_specific() {
    case "${NODE_ENV:-development}" in
        "development")
            echo "🔧 Configuring for development environment..."
            export CLAUDE_LOG_LEVEL="debug"
            export CLAUDE_VERBOSE="true"
            export CLAUDE_RUN_TESTS_ON_EDIT="true"
            ;;
        "staging")
            echo "🎭 Configuring for staging environment..."
            export CLAUDE_LOG_LEVEL="info"
            export CLAUDE_VERBOSE="false"
            export CLAUDE_REQUIRE_COMMIT_APPROVAL="true"
            ;;
        "production")
            echo "🚀 Configuring for production environment..."
            export CLAUDE_LOG_LEVEL="warn"
            export CLAUDE_VERBOSE="false"
            export CLAUDE_SANDBOX_MODE="true"
            export CLAUDE_REQUIRE_APPROVAL="Bash:*"
            ;;
    esac
}

# === Main Execution ===
main() {
    echo "🎯 Starting Claude Code environment setup..."
    
    setup_environment_specific
    setup_development_environment
    setup_claude_aliases
    validate_environment
    
    echo "✨ Claude Code environment setup complete!"
    echo ""
    echo "Available commands:"
    echo "  claude-dev     - Full-stack development agent"
    echo "  claude-ops     - DevOps specialist agent"
    echo "  claude-sec     - Security auditor agent"
    echo "  claude-ci      - Run CI pipeline"
    echo "  claude-deploy  - Deploy to staging"
    echo ""
    echo "Environment variables set:"
    echo "  CLAUDE_WORKSPACE: $CLAUDE_WORKSPACE"
    echo "  NODE_ENV: $NODE_ENV"
    echo "  CLAUDE_DEFAULT_AGENT: $CLAUDE_DEFAULT_AGENT"
    echo "  CLAUDE_LOG_LEVEL: $CLAUDE_LOG_LEVEL"
    echo ""
    echo "To activate these settings, run: source setup-env.sh"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi