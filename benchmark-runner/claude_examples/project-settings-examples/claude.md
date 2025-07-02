# Project Settings Configuration

This example demonstrates project-specific settings using `.claude/settings.json` files that are shared with the team and personal `.claude/settings.local.json` files that are git-ignored.

## Settings File Structure

```
.claude/
├── settings.json        # Shared team settings (committed)
└── settings.local.json  # Personal overrides (git-ignored)
```

## Team-Shared Configuration

### Project Definition
```json
{
  "project": {
    "name": "e-commerce-platform",
    "type": "full-stack", 
    "framework": "next-node-postgres"
  }
}
```

### Project-Specific Permissions
```json
{
  "permissions": {
    "allowTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebFetch"],
    "requireApproval": ["Bash:npm install", "Bash:docker"],
    "autoApprove": {
      "patterns": ["npm run *", "git add .", "git commit -m *"],
      "fileTypes": ["*.js", "*.ts", "*.jsx", "*.tsx", "*.json", "*.md"]
    }
  }
}
```

## Multi-Agent Team Setup

### Frontend Specialist
```json
{
  "agents": [
    {
      "name": "frontend-dev",
      "description": "Next.js frontend development specialist",
      "instructions": "Focus on React components, TypeScript, and responsive design. Use Tailwind CSS for styling. Ensure accessibility compliance.",
      "scope": ["src/pages/**", "src/components/**", "src/styles/**"],
      "tools": ["Read", "Write", "Edit", "Bash"],
      "concurrent": true
    }
  ]
}
```

### Backend Specialist  
```json
{
  "agents": [
    {
      "name": "backend-dev",
      "description": "Node.js API development specialist", 
      "instructions": "Build REST APIs with Express. Use PostgreSQL with Prisma ORM. Implement proper error handling and validation.",
      "scope": ["src/api/**", "src/lib/**", "prisma/**"],
      "tools": ["Read", "Write", "Edit", "Bash"],
      "concurrent": true
    }
  ]
}
```

### Database Administrator
```json
{
  "agents": [
    {
      "name": "database-admin",
      "description": "Database schema and migration specialist",
      "instructions": "Manage database schema, write migrations, optimize queries. Ensure data integrity and performance.",
      "scope": ["prisma/**", "migrations/**"],
      "tools": ["Read", "Write", "Edit", "Bash"],
      "concurrent": false
    }
  ]
}
```

### Testing Specialist
```json
{
  "agents": [
    {
      "name": "testing-specialist", 
      "description": "Testing and quality assurance specialist",
      "instructions": "Write comprehensive tests using Jest and Testing Library. Focus on unit, integration, and e2e testing.",
      "scope": ["**/*.test.*", "**/*.spec.*", "tests/**"],
      "tools": ["Read", "Write", "Edit", "Bash"],
      "concurrent": false
    }
  ]
}
```

## Project-Specific Hooks

### Code Quality Automation
```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "matcher": "Edit|Write", 
      "command": "if [[ \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *.js || \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *.ts ]]; then npx eslint \"$CLAUDE_TOOL_INPUT_FILE_PATH\" --fix; fi"
    }
  ]
}
```

### Test Automation
```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "matcher": "Write|Edit",
      "command": "if [[ \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *test* || \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *spec* ]]; then npm test -- \"$CLAUDE_TOOL_INPUT_FILE_PATH\" --passWithNoTests; fi"
    }
  ]
}
```

### Dependency Management
```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "matcher": "Edit",
      "command": "if [[ \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == package.json ]]; then npm install; fi"
    }
  ]
}
```

## Multi-Agent Workflows

### Feature Development Workflow
```json
{
  "workflows": {
    "feature-development": {
      "description": "Full-stack feature development workflow",
      "agents": ["database-admin", "backend-dev", "frontend-dev", "testing-specialist"],
      "sequential": true,
      "steps": [
        {"agent": "database-admin", "task": "Update schema if needed"},
        {"agent": "backend-dev", "task": "Implement API endpoints"},
        {"agent": "frontend-dev", "task": "Build UI components"},
        {"agent": "testing-specialist", "task": "Add comprehensive tests"}
      ]
    }
  }
}
```

### Parallel Bug Fix Workflow
```json
{
  "workflows": {
    "bug-fix": {
      "description": "Bug investigation and resolution workflow",
      "agents": ["testing-specialist", "backend-dev", "frontend-dev"], 
      "sequential": false,
      "parallel": true
    }
  }
}
```

## Personal Local Settings

### Developer-Specific Configuration
```json
{
  "personal": {
    "developer": "john.doe@company.com",
    "preferences": {
      "verbose": true,
      "notifications": false
    }
  }
}
```

### Personal Environment Variables
```json
{
  "environment": {
    "LOG_LEVEL": "debug",
    "SENTRY_DSN": "$SENTRY_DSN_DEV", 
    "STRIPE_SECRET_KEY": "$STRIPE_TEST_KEY"
  }
}
```

### Personal Agent
```json
{
  "agents": [
    {
      "name": "personal-assistant",
      "description": "John's personal development helper",
      "instructions": "Remember that John prefers functional components and detailed comments. Always explain TypeScript types.",
      "defaultActive": false
    }
  ]
}
```

### Custom Commands
```json
{
  "customCommands": {
    "quick-test": "npm test -- --watchAll=false --coverage=false",
    "db-reset": "npx prisma migrate reset --force && npx prisma db seed",
    "commit-wip": "git add . && git commit -m 'WIP: $(date +%H:%M)'"
  }
}
```

## Workflow Examples

### Team Feature Development
```bash
# Use the coordinated workflow
claude --workflow feature-development "Add user wishlists"

# Execution:
# 1. database-admin: Creates wishlist tables and relations
# 2. backend-dev: Implements wishlist API endpoints  
# 3. frontend-dev: Builds wishlist UI components
# 4. testing-specialist: Adds tests for all layers
```

### Agent-Specific Tasks
```bash
# Frontend-only work
claude --agent frontend-dev "Update product card component"

# Backend-only work  
claude --agent backend-dev "Add rate limiting to API"

# Database work
claude --agent database-admin "Optimize product queries"

# Testing work
claude --agent testing-specialist "Add e2e checkout tests"
```

### Personal Development
```bash
# Use personal settings and commands
claude quick-test
claude db-reset
claude commit-wip
```

## Integration Examples

### Database Integration
```json
{
  "integrations": {
    "database": {
      "type": "postgresql",
      "orm": "prisma", 
      "migrations": "auto"
    }
  }
}
```

### Git Hooks Integration
```json
{
  "integrations": {
    "git": {
      "hooks": {
        "pre-commit": ["npm run lint", "npm run test:changed"],
        "pre-push": ["npm run build", "npm run test:e2e"]
      }
    }
  }
}
```

### Deployment Integration
```json
{
  "integrations": {
    "deployment": {
      "platform": "vercel",
      "environment": "preview", 
      "database": "supabase"
    }
  }
}
```

## Project Environment Setup

### Development Environment
```json
{
  "environment": {
    "NODE_ENV": "development",
    "DATABASE_URL": "postgresql://localhost:5432/ecommerce_dev",
    "REDIS_URL": "redis://localhost:6379",
    "API_BASE_URL": "http://localhost:3001"
  }
}
```

### Testing Configuration
```json
{
  "testing": {
    "framework": "jest",
    "coverage": {
      "threshold": 80,
      "exclude": ["**/*.config.js", "**/*.stories.js"]
    },
    "e2e": {
      "framework": "playwright",
      "baseUrl": "http://localhost:3000"
    }
  }
}
```

## Best Practices

### Team Collaboration
- Commit shared settings to version control
- Keep personal settings in `.local.json` files
- Document agent responsibilities and scopes
- Use consistent naming conventions

### Security
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Review permissions regularly
- Restrict dangerous commands

### Performance
- Scope agents to relevant file patterns
- Use concurrent agents where possible
- Optimize hook commands for speed
- Monitor resource usage

## File Structure Example

```
e-commerce-platform/
├── .claude/
│   ├── settings.json         # Team configuration
│   ├── settings.local.json   # Personal overrides (git-ignored)
│   └── activity.log          # Project activity log
├── src/
│   ├── pages/               # Frontend agent scope
│   ├── components/          # Frontend agent scope
│   ├── api/                 # Backend agent scope
│   └── lib/                 # Backend agent scope
├── prisma/                  # Database agent scope
├── tests/                   # Testing agent scope
├── package.json
└── .gitignore              # Excludes .claude/settings.local.json
```

### Git Ignore Configuration
```gitignore
# Personal Claude settings
.claude/settings.local.json
.claude/*-activity.log

# Environment files
.env.local
.env.development.local
```

## Troubleshooting

### Settings Conflicts
```bash
# Check effective settings (merged from all sources)
claude config show

# Validate settings syntax
claude config validate .claude/settings.json

# Test agent configuration
claude --agent frontend-dev --dry-run "test command"
```

### Agent Issues
```bash
# List available agents
claude agents list

# Test agent scope
claude --agent backend-dev "show scope"

# Check agent conflicts
claude agents validate
```