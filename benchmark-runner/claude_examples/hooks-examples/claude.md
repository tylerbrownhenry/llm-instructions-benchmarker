# Automated Hooks and Quality Checks

This project uses Claude Code hooks to automate quality checks, testing, and maintenance tasks.

## Hook Categories

### PostToolUse Hooks
- **Code Formatting**: Auto-formats files after Edit/Write operations with Prettier
- **Linting**: Runs ESLint with auto-fix after file modifications
- **Automated Testing**: Runs relevant tests after editing JS/TS files

### PreToolUse Hooks
- **Activity Logging**: Logs bash command execution before running

### Stop Hooks
- **Session Logging**: Records when Claude sessions complete

## Example Workflows

### File Edit Workflow
1. User edits `src/components/Button.tsx`
2. PostToolUse hooks trigger automatically:
   - Code formatted with Prettier
   - ESLint fixes applied
   - Tests run for Button component

### Bash Command Workflow  
1. User runs bash command via Claude
2. PreToolUse hook logs the command execution
3. Command executes normally
4. Activity logged for audit trail

### Session Completion
1. Claude finishes responding to user
2. Stop hook logs session completion
3. Activity log updated with timestamp

## Configuration Files

### Required Dependencies
```json
{
  "devDependencies": {
    "prettier": "^3.0.0",
    "eslint": "^8.0.0", 
    "madge": "^6.0.0",
    "typedoc": "^0.25.0"
  }
}
```

### NPM Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --coverage",
    "build": "tsc && vite build",
    "lint": "eslint src/**/*.{js,ts,tsx}",
    "format": "prettier --write src/**/*.{js,ts,tsx}"
  }
}
```

## Logs and Monitoring

- **Hook Activity**: `.claude/hooks.log`
- **Task History**: `.claude/activity.log`
- **Test Results**: Integrated with CI/CD pipeline

## Benefits

- **Quality Assurance**: Automated testing and linting
- **Consistency**: Code formatting and style enforcement  
- **Architecture**: Dependency and circular reference checking
- **Documentation**: Auto-updated API documentation
- **Audit Trail**: Complete log of development activities