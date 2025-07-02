# User Settings Configuration

This example shows how to configure Claude Code using user-level `settings.json` files that apply globally across all projects.

## Settings File Location

```bash
# User settings (applies to all projects)
~/.claude/settings.json

# Personal overrides (git-ignored)
~/.claude/settings.local.json
```

## Global Permissions

### Tool Access Control
```json
{
  "permissions": {
    "allowTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "denyTools": ["WebFetch"],
    "requireApproval": ["Bash:rm", "Bash:sudo", "Bash:curl"]
  }
}
```

Benefits:
- **Consistent Security**: Same permissions across all projects
- **Personal Safety**: Block dangerous commands globally
- **Productivity**: Pre-approve common operations

### User-Specific Environment
```json
{
  "environment": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug", 
    "CLAUDE_WORKSPACE": "/Users/$USER/Development",
    "DEFAULT_EDITOR": "code"
  }
}
```

## Global Hooks

### Universal Code Formatting
```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "matcher": "Edit|Write", 
      "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
    }
  ]
}
```

### Activity Logging
```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "matcher": "Bash",
      "command": "echo \"$(date): User $USER running: $CLAUDE_TOOL_INPUT_COMMAND\" >> ~/.claude/global-activity.log"
    },
    {
      "event": "Stop",
      "matcher": "*", 
      "command": "echo \"$(date): Session ended for $USER\" >> ~/.claude/global-activity.log"
    }
  ]
}
```

## Personal Agents

### Default Assistant
```json
{
  "agents": [
    {
      "name": "personal-assistant",
      "description": "General development assistant for personal projects", 
      "instructions": "Help with personal coding projects. Prefer modern JavaScript/TypeScript. Always explain changes.",
      "defaultActive": true
    }
  ]
}
```

### Learning Mentor
```json
{
  "agents": [
    {
      "name": "learning-mentor",
      "description": "Educational coding assistant",
      "instructions": "Focus on teaching concepts and best practices. Provide detailed explanations and examples.",
      "defaultActive": false
    }
  ]
}
```

## User Preferences

### Workflow Settings
```json
{
  "preferences": {
    "includeCoAuthoredBy": true,     // Add Claude attribution to commits
    "cleanupPeriodDays": 30,         // Keep transcripts for 30 days
    "verbose": false,                // Concise output
    "theme": "dark"                  // UI theme preference
  }
}
```

### Notifications
```json
{
  "preferences": {
    "notifications": {
      "desktop": true,               // Show desktop notifications
      "sound": false                 // No notification sounds
    }
  }
}
```

## API Key Management

### Secure Key Retrieval
```json
{
  "apiKeyHelper": {
    "command": "security find-generic-password -s 'claude-api-key' -w",
    "timeout": 5000
  }
}
```

Alternative approaches:
```bash
# Using environment variable
export ANTHROPIC_API_KEY="your-key-here"

# Using keychain (macOS)
security add-generic-password -s "claude-api-key" -a "$USER" -w "your-key"

# Using 1Password CLI
op item get "Claude API Key" --fields password
```

## Configuration Commands

### View Current Settings
```bash
# Show effective settings (merged from all sources)
claude config show

# Show user settings only
cat ~/.claude/settings.json | jq .

# Show specific setting
claude config get permissions.allowTools
```

### Modify Settings
```bash
# Set environment variable
claude config set environment.NODE_ENV development

# Add allowed tool
claude config add permissions.allowTools WebFetch

# Remove denied tool
claude config remove permissions.denyTools WebFetch
```

## Personal Workflow Examples

### Development Setup
```bash
# Activate personal assistant
claude --agent personal-assistant "Set up new React project"

# Global formatting applies automatically
# Personal environment variables used
# Activity logged to ~/.claude/global-activity.log
```

### Learning Session
```bash
# Switch to learning mentor
claude --agent learning-mentor "Explain async/await vs Promises"

# Educational focus with detailed explanations
# Code examples with step-by-step breakdown
# Best practices highlighted
```

### Cross-Project Consistency
```bash
# Same settings apply everywhere
cd ~/project-a && claude "Fix linting errors"
cd ~/project-b && claude "Add error handling"

# Both projects get:
# - Same code formatting
# - Same tool permissions
# - Same activity logging
# - Same agent behavior
```

## Advanced User Settings

### Custom Tool Workflows
```json
{
  "customCommands": {
    "setup-project": "mkdir -p src tests docs && npm init -y && npm install -D jest prettier eslint",
    "quick-commit": "git add . && git commit -m 'WIP: $(date)' && git push",
    "daily-backup": "tar -czf ~/backups/$(date +%Y%m%d).tar.gz ~/Development"
  }
}
```

### Project Templates
```json
{
  "templates": {
    "react-app": {
      "directory": "~/templates/react-starter",
      "postCreate": ["npm install", "git init", "code ."]
    },
    "node-api": {
      "directory": "~/templates/node-api-starter", 
      "postCreate": ["npm install", "npm run dev"]
    }
  }
}
```

### Integration Settings
```json
{
  "integrations": {
    "git": {
      "autoStage": false,
      "requireCommitMessage": true,
      "pushAfterCommit": false
    },
    "editor": {
      "openAfterCreate": true,
      "preferredEditor": "code",
      "extensions": ["ms-vscode.vscode-typescript-next"]
    }
  }
}
```

## Best Practices

### Security Considerations
- Store API keys securely (keychain, not plaintext)
- Review tool permissions regularly
- Use approval requirements for dangerous commands
- Monitor activity logs for suspicious behavior

### Productivity Tips
- Set up global formatting hooks for consistency
- Create personal agents for different work contexts
- Use environment variables for common paths
- Configure notifications to avoid interruptions

### Maintenance
- Regular cleanup of old transcripts
- Backup settings before major changes
- Review and update permissions quarterly
- Monitor resource usage and cleanup periods

## Troubleshooting

### Common Issues
```bash
# Settings not taking effect
claude config validate

# Permission denied errors
claude config get permissions

# API key issues
claude config test-auth

# Hook failures
tail -f ~/.claude/global-activity.log
```

### Reset Settings
```bash
# Backup current settings
cp ~/.claude/settings.json ~/.claude/settings.backup.json

# Reset to defaults
rm ~/.claude/settings.json
claude config init

# Restore from backup
cp ~/.claude/settings.backup.json ~/.claude/settings.json
```