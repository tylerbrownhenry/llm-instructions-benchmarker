# Child Process Agent Orchestration

This example demonstrates a sophisticated agent orchestration system where a main coordinator spawns and manages specialized child process agents through hooks.

## Architecture Overview

```
┌─────────────────────┐
│  Main Coordinator   │
│     (Claude)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Agent Orchestrator  │
│    (Node.js)        │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│              Child Process Agents                    │
├─────────────┬─────────────┬─────────────┬────────────┤
│ Test Runner │ Test Writer │   Linter    │ Docs       │
│   Agent     │    Agent    │   Agent     │ Updater    │
│             │             │             │ Agent      │
├─────────────┼─────────────┼─────────────┼────────────┤
│ Log Reader  │ Log Writer  │   (More)    │   (More)   │
│   Agent     │    Agent    │   Agents    │  Agents    │
└─────────────┴─────────────┴─────────────┴────────────┘
```

## Agent Types and Lifecycle

### Main Coordinator Agent
```json
{
  "name": "main-coordinator",
  "description": "Main orchestrating agent that spawns and coordinates child processes",
  "isMain": true,
  "childProcesses": {
    "enabled": true,
    "maxConcurrent": 5,
    "timeout": 300000
  }
}
```

### Persistent Agents (Always Running)
```json
{
  "name": "test-runner-agent",
  "lifecycle": "persistent",
  "triggerPatterns": ["**/*.test.js", "**/*.spec.js"]
}
```

### Task-Based Agents (Spawned on Demand)
```json
{
  "name": "test-writer-agent",
  "lifecycle": "task-based", 
  "triggerPatterns": ["src/**/*.js", "src/**/*.ts"]
}
```

## Specialized Agent Roles

### Test Runner Agent
**Purpose**: Execute unit tests and report results
```javascript
// Triggered when test files change
async runTests(params) {
  const { files, options = {} } = params;
  const testCommand = options.command || 'npm test';
  const filePattern = files ? `-- ${files.join(' ')}` : '';
  
  return new Promise((resolve, reject) => {
    exec(`${testCommand} ${filePattern}`, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        exitCode: error ? error.code : 0
      });
    });
  });
}
```

### Test Writer Agent
**Purpose**: Generate unit tests for source code
```javascript
// Triggered when source files change
async writeTests(params) {
  const { sourceFile, testFile } = params;
  
  // Read source file to understand what to test
  const sourceCode = await fs.readFile(sourceFile, 'utf8');
  
  // Generate test content
  const testContent = this.generateTestContent(sourceCode, sourceFile);
  
  // Write test file
  await fs.writeFile(testFile, testContent);
  
  return {
    success: true,
    testFile,
    message: 'Test file generated successfully'
  };
}
```

### Linter Agent
**Purpose**: Code quality and formatting
```javascript
// Triggered on any code file change
async lintCode(params) {
  const { files, fix = false } = params;
  const fixFlag = fix ? '--fix' : '';
  const filePattern = files ? files.join(' ') : '.';
  
  return new Promise((resolve, reject) => {
    exec(`npx eslint ${fixFlag} ${filePattern}`, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        exitCode: error ? error.code : 0,
        fixed: fix
      });
    });
  });
}
```

### Documentation Updater Agent
**Purpose**: Maintain documentation
```javascript
// Triggered when source files or docs change
async updateDocs(params) {
  const { sourceFiles, docFiles } = params;
  
  // Generate documentation from source files
  return new Promise((resolve, reject) => {
    exec('npx typedoc --out docs src/', (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        message: 'Documentation updated'
      });
    });
  });
}
```

### Log Reader Agent
**Purpose**: Monitor and analyze log files
```javascript
// Persistent monitoring of log files
async readLogs(params) {
  const { logFile, lines = 100, pattern } = params;
  
  try {
    const logContent = await fs.readFile(logFile, 'utf8');
    const logLines = logContent.split('\\n');
    const recentLines = logLines.slice(-lines);
    
    const filteredLines = pattern 
      ? recentLines.filter(line => line.includes(pattern))
      : recentLines;
    
    return {
      success: true,
      lines: filteredLines,
      totalLines: logLines.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Log Writer Agent
**Purpose**: Structured logging
```javascript
// Handles all logging operations
async writeLog(params) {
  const { logFile, message, level = 'info' } = params;
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\\n`;
  
  try {
    await fs.appendFile(logFile, logEntry);
    return {
      success: true,
      message: 'Log entry written'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Hook-Based Orchestration

### File Change Trigger
```json
{
  "event": "PostToolUse",
  "matcher": "Edit|Write",
  "command": "node .claude/scripts/agent-orchestrator.js spawn --trigger=\"$CLAUDE_TOOL_INPUT_FILE_PATH\" --event=\"file_changed\""
}
```

### Activity Logging
```json
{
  "event": "PreToolUse", 
  "matcher": "Bash",
  "command": "node .claude/scripts/agent-orchestrator.js log --agent=\"main-coordinator\" --action=\"$CLAUDE_TOOL_INPUT_COMMAND\""
}
```

### Session Cleanup
```json
{
  "event": "Stop",
  "matcher": "*",
  "command": "node .claude/scripts/agent-orchestrator.js cleanup --session=\"$CLAUDE_SESSION_ID\""
}
```

## Workflow Examples

### Complete Development Workflow
```bash
# User edits a React component
claude "Update UserProfile component"

# Orchestrator triggers:
# 1. Linter agent fixes code style
# 2. Test writer agent generates/updates tests
# 3. Test runner agent executes tests
# 4. Docs updater agent updates documentation
# 5. Log writer agent records all activities
```

### Test-Driven Development
```bash
# User writes a new function
claude "Add calculateTax function to utils"

# Automated workflow:
# 1. Test writer agent creates test file
# 2. Test runner agent runs tests (initially failing)
# 3. User implements function
# 4. Test runner agent re-runs tests (now passing)
# 5. Linter agent ensures code quality
# 6. Docs updater agent adds API documentation
```

### Continuous Integration Simulation
```bash
# User commits changes
claude "Prepare for deployment"

# CI-like workflow:
# 1. Linter agent validates all code
# 2. Test runner agent runs full test suite
# 3. Docs updater agent regenerates documentation
# 4. Log reader agent checks for errors
# 5. All results aggregated by coordinator
```

## Inter-Agent Communication

### Task Queue System
```javascript
// Task queue configuration
"taskQueue": {
  "enabled": true,
  "maxSize": 100,
  "priorityLevels": ["critical", "high", "normal", "low"]
}
```

### Agent Dependencies
```javascript
// Define which agents must complete before others
"dependencies": {
  "test-runner-agent": ["linter-agent"],
  "docs-updater-agent": ["test-writer-agent"],
  "deployment": ["test-runner-agent", "linter-agent"]
}
```

### IPC Communication
```javascript
// Inter-process communication setup
process.on('message', async (message) => {
  try {
    await this.handleMessage(message);
  } catch (error) {
    this.sendMessage('error', { 
      error: error.message, 
      stack: error.stack 
    });
  }
});
```

## Monitoring and Metrics

### Real-Time Metrics
```json
{
  "metrics": {
    "tasksCompleted": 245,
    "tasksQueued": 12,
    "agentsSpawned": 18,
    "averageTaskTime": 1250,
    "activeAgents": 5
  }
}
```

### Agent Health Monitoring
```javascript
// Monitor agent health and performance
childProcess.on('exit', (code, signal) => {
  this.log('info', `Agent ${agentId} exited with code ${code}`);
  this.runningAgents.delete(agentId);
});

childProcess.on('error', (error) => {
  this.log('error', `Agent ${agentId} error: ${error.message}`);
});
```

## Advanced Features

### Dynamic Agent Spawning
```javascript
// Spawn agents based on file patterns
async triggerAgents(filePath, event) {
  const matchingAgents = this.config.agents.filter(agent => {
    if (!agent.triggerPatterns) return false;
    return agent.triggerPatterns.some(pattern => 
      this.matchesPattern(filePath, pattern)
    );
  });

  for (const agentConfig of matchingAgents) {
    await this.scheduleTask(agentConfig.name, {
      action: this.getActionForAgent(agentConfig.name, event),
      params: { filePath, event }
    });
  }
}
```

### Resource Management
```javascript
// Control resource usage
"childProcessConfig": {
  "nodeOptions": ["--max-old-space-size=2048"],
  "timeout": 300000,
  "retries": 3,
  "maxConcurrent": 5
}
```

### Error Handling and Retries
```javascript
// Robust error handling
async executeTask(taskData) {
  const { taskId, action, params } = taskData;
  const startTime = Date.now();
  
  try {
    const result = await this.performAction(action, params);
    this.sendMessage('task-completed', { taskId, result });
  } catch (error) {
    this.sendMessage('task-failed', { 
      taskId, 
      error: error.message,
      retryable: this.isRetryableError(error)
    });
  }
}
```

## Usage Scenarios

### Large Codebase Management
- **Parallel Processing**: Multiple agents working simultaneously
- **Specialized Tasks**: Each agent focuses on specific responsibilities
- **Scalable Architecture**: Easy to add new agent types

### Team Development
- **Consistent Quality**: Automated linting and testing
- **Documentation**: Always up-to-date docs
- **Code Reviews**: Automated checks before human review

### CI/CD Integration
- **Pipeline Simulation**: Local CI-like environment
- **Fast Feedback**: Immediate issue detection
- **Quality Gates**: Ensure standards before deployment

### Learning and Experimentation
- **Observable Workflow**: See how tasks flow between agents
- **Modular Design**: Easy to modify or extend
- **Debugging Tools**: Comprehensive logging and monitoring

## Benefits

### Performance
- **Parallel Execution**: Multiple agents work simultaneously
- **Resource Isolation**: Each agent runs in its own process
- **Efficient Resource Usage**: Agents spawned only when needed

### Reliability
- **Fault Isolation**: Agent failures don't crash the system
- **Automatic Recovery**: Failed agents can be respawned
- **Comprehensive Monitoring**: Track all agent activities

### Maintainability
- **Modular Architecture**: Each agent has a single responsibility
- **Easy Extension**: Add new agents without modifying existing ones
- **Clear Interfaces**: Well-defined communication protocols

### Scalability
- **Horizontal Scaling**: Add more agent instances as needed
- **Load Distribution**: Tasks distributed across available agents
- **Resource Management**: Control memory and CPU usage per agent