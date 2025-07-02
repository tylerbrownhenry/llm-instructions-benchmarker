# Task-Specific Agent Specialization

This example demonstrates a sophisticated system where specialized agents handle specific development tasks through automated generation and execution of child processes.

## Specialized Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Task Dispatcher                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Agent Registry                             │    │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────┐  │    │
│  │  │Unit Test    │Unit Test    │ESLint       │Docs     │  │    │
│  │  │Runner       │Writer       │Enforcer     │Updater  │  │    │
│  │  └─────────────┴─────────────┴─────────────┴─────────┘  │    │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────┐  │    │
│  │  │Log          │Structured   │(Future      │(Future  │  │    │
│  │  │Analyzer     │Logger       │Agents)      │Agents)  │  │    │
│  │  └─────────────┴─────────────┴─────────────┴─────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Definitions

### Unit Test Runner Agent
**Purpose**: Execute unit tests with detailed reporting

```json
{
  "name": "unit-test-runner",
  "description": "Specialized agent for running unit tests with detailed reporting",
  "triggerPatterns": ["**/*.test.js", "**/*.spec.js", "**/*.test.ts", "**/*.spec.ts"],
  "config": {
    "testFramework": "jest",
    "coverageThreshold": 80,
    "watchMode": false,
    "verbose": true
  }
}
```

**Key Features**:
- Detects related test files automatically
- Runs specific tests based on changed files
- Provides coverage analysis
- Parses test failures with detailed reporting

```javascript
async runTests() {
  const { filePath } = this.context;
  
  // Smart test targeting
  let testCommand = 'npm test';
  if (filePath && filePath.includes('test')) {
    testCommand += ` -- "${filePath}"`;
  } else if (filePath) {
    const testFile = this.findRelatedTestFile(filePath);
    if (testFile) {
      testCommand += ` -- "${testFile}"`;
    }
  }

  // Coverage analysis
  if (config.coverageThreshold) {
    testCommand += ` --coverage --coverageThreshold='{"global":{"statements":${config.coverageThreshold}}}'`;
  }

  return this.executeCommand(testCommand);
}
```

### Unit Test Writer Agent
**Purpose**: Generate comprehensive unit tests for source code

```json
{
  "name": "unit-test-writer",
  "description": "Specialized agent for writing comprehensive unit tests",
  "triggerPatterns": ["src/**/*.js", "src/**/*.ts", "lib/**/*.js", "lib/**/*.ts"],
  "config": {
    "testFramework": "jest",
    "testingLibrary": "@testing-library/react",
    "generateMocks": true,
    "testTypes": ["unit", "integration"]
  }
}
```

**Key Features**:
- Analyzes source code to extract functions and classes
- Generates test skeletons with proper structure
- Avoids overwriting manually created tests
- Creates test files in appropriate directories

```javascript
async writeTests() {
  const { filePath } = this.context;
  
  // Skip if already a test file
  if (filePath.includes('test') || filePath.includes('spec')) {
    return { message: 'Skipped test file' };
  }

  const sourceCode = await fs.readFile(filePath, 'utf8');
  const testContent = this.generateTestContent(sourceCode, filePath);
  const testFilePath = this.getTestFilePath(filePath);
  
  // Smart test file management
  let shouldWrite = true;
  try {
    const existingTest = await fs.readFile(testFilePath, 'utf8');
    if (!existingTest.includes('// Generated test file')) {
      shouldWrite = false; // Don't overwrite manual tests
    }
  } catch {
    shouldWrite = true; // File doesn't exist
  }

  if (shouldWrite) {
    await fs.writeFile(testFilePath, testContent);
    return { success: true, testFile: testFilePath };
  }
}
```

### ESLint Enforcer Agent
**Purpose**: Code quality and formatting enforcement

```json
{
  "name": "eslint-enforcer",
  "description": "Specialized agent for ESLint code quality enforcement",
  "triggerPatterns": ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
  "config": {
    "autoFix": true,
    "configFile": ".eslintrc.js",
    "extensions": [".js", ".ts", ".jsx", ".tsx"],
    "ignorePatterns": ["node_modules", "dist", "build"]
  }
}
```

**Key Features**:
- Automatic code fixing where possible
- Detailed violation reporting
- Integration with project ESLint configuration
- Summary statistics and metrics

```javascript
async runEslint() {
  const { filePath } = this.context;
  const config = this.config.config || {};
  
  let eslintCommand = 'npx eslint';
  
  if (config.autoFix) {
    eslintCommand += ' --fix';
  }
  
  eslintCommand += ' --format json';
  
  const target = filePath || '.';
  eslintCommand += ` "${target}"`;

  const results = await this.executeCommand(eslintCommand);
  
  return {
    success: results.exitCode === 0,
    filesChecked: results.length,
    totalErrors: results.reduce((sum, file) => sum + file.errorCount, 0),
    totalWarnings: results.reduce((sum, file) => sum + file.warningCount, 0),
    fixedCount: results.reduce((sum, file) => sum + (file.fixableErrorCount || 0), 0)
  };
}
```

### Documentation Maintainer Agent
**Purpose**: Maintain and update project documentation

```json
{
  "name": "documentation-maintainer",
  "description": "Specialized agent for maintaining and updating documentation",
  "triggerPatterns": ["src/**/*.js", "src/**/*.ts", "README.md", "docs/**/*"],
  "config": {
    "docTool": "typedoc",
    "outputDir": "docs",
    "includePrivate": false,
    "generateChangelog": true
  }
}
```

**Key Features**:
- API documentation generation
- README.md maintenance
- Changelog updates
- Multiple documentation tools support

```javascript
async updateDocumentation() {
  const { filePath } = this.context;
  const config = this.config.config || {};
  
  const tasks = [];
  
  // Generate API docs for source changes
  if (filePath && (filePath.includes('src/') || filePath.includes('lib/'))) {
    tasks.push(this.generateApiDocs(config));
  }
  
  // Update README for package.json changes
  if (filePath && filePath.includes('package.json')) {
    tasks.push(this.updateReadme());
  }
  
  // Update changelog if enabled
  if (config.generateChangelog) {
    tasks.push(this.updateChangelog());
  }

  const results = await Promise.all(tasks);
  return {
    success: results.every(r => r.success),
    results
  };
}
```

### Log Analyzer Agent
**Purpose**: Monitor and analyze log files for patterns and issues

```json
{
  "name": "log-analyzer",
  "description": "Specialized agent for reading and analyzing log files",
  "triggerPatterns": ["logs/**/*.log", "*.log"],
  "config": {
    "logFormats": ["json", "text", "combined"],
    "alertLevels": ["error", "fatal"],
    "retentionDays": 30
  }
}
```

**Key Features**:
- Log level analysis and statistics
- Error pattern identification
- Time range analysis
- Structured reporting

```javascript
performLogAnalysis(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const analysis = {
    totalLines: lines.length,
    levels: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
    errors: [],
    patterns: {},
    timeRange: null
  };

  lines.forEach((line, index) => {
    // Analyze log levels
    if (line.includes('[DEBUG]')) analysis.levels.debug++;
    else if (line.includes('[INFO]')) analysis.levels.info++;
    else if (line.includes('[WARN]')) analysis.levels.warn++;
    else if (line.includes('[ERROR]')) analysis.levels.error++;

    // Extract errors for detailed analysis
    if (line.includes('[ERROR]') || line.includes('[FATAL]')) {
      analysis.errors.push({
        line: index + 1,
        content: line,
        timestamp: this.extractTimestamp(line)
      });
    }

    // Identify patterns
    const pattern = this.identifyPattern(line);
    if (pattern) {
      analysis.patterns[pattern] = (analysis.patterns[pattern] || 0) + 1;
    }
  });

  return analysis;
}
```

### Structured Logger Agent
**Purpose**: Write structured log entries with proper formatting

```json
{
  "name": "structured-logger",
  "description": "Specialized agent for writing structured log entries",
  "config": {
    "logFormat": "json",
    "logLevels": ["debug", "info", "warn", "error", "fatal"],
    "rotateSize": "10MB",
    "archiveOld": true
  }
}
```

**Key Features**:
- Multiple log formats (JSON, text)
- Automatic log rotation
- Structured metadata inclusion
- Command-line interface for direct usage

```javascript
formatLogEntry(message, level, metadata, config) {
  const timestamp = new Date().toISOString();
  
  if (config.logFormat === 'json') {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      metadata,
      taskId: this.taskId
    });
  } else {
    const metadataStr = Object.keys(metadata).length > 0 
      ? ` ${JSON.stringify(metadata)}`
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadataStr}`;
  }
}
```

## Task Pipeline System

### Pipeline Configuration
```json
{
  "taskPipeline": {
    "enabled": true,
    "stages": [
      {
        "name": "code-quality",
        "agents": ["eslint-enforcer"],
        "blocking": true,
        "timeout": 30000
      },
      {
        "name": "test-generation",
        "agents": ["unit-test-writer"],
        "blocking": false,
        "timeout": 60000
      },
      {
        "name": "test-execution",
        "agents": ["unit-test-runner"],
        "blocking": true,
        "timeout": 120000,
        "dependsOn": ["code-quality"]
      },
      {
        "name": "documentation",
        "agents": ["documentation-maintainer"],
        "blocking": false,
        "timeout": 45000,
        "dependsOn": ["test-execution"]
      }
    ]
  }
}
```

### Pipeline Execution Flow
```javascript
async executePipeline(matchingAgents, context) {
  const { stages } = this.config.taskPipeline;
  const stageResults = new Map();

  for (const stage of stages) {
    console.log(`Executing pipeline stage: ${stage.name}`);
    
    // Check dependencies
    if (stage.dependsOn) {
      const dependenciesMet = stage.dependsOn.every(dep => 
        stageResults.has(dep) && stageResults.get(dep).success
      );
      
      if (!dependenciesMet) {
        console.log(`Skipping stage ${stage.name} - dependencies not met`);
        continue;
      }
    }

    // Execute stage agents
    const stageAgents = matchingAgents.filter(agent => 
      stage.agents.includes(agent.name)
    );

    const results = await Promise.all(
      stageAgents.map(agent => this.executeAgent(agent, context, stage.timeout))
    );
    
    const stageSuccess = results.every(result => result.success);
    stageResults.set(stage.name, { success: stageSuccess, results });

    // Handle blocking stages
    if (stage.blocking && !stageSuccess) {
      console.error(`Blocking stage ${stage.name} failed, stopping pipeline`);
      break;
    }
  }

  return stageResults;
}
```

## Agent Script Generation

### Dynamic Script Creation
The system automatically generates agent scripts based on configuration:

```javascript
async generateAgentScript(agentConfig) {
  const agentTemplates = {
    'unit-test-runner': this.generateTestRunnerScript(),
    'unit-test-writer': this.generateTestWriterScript(),
    'eslint-enforcer': this.generateEslintScript(),
    'documentation-maintainer': this.generateDocsScript(),
    'log-analyzer': this.generateLogAnalyzerScript(),
    'structured-logger': this.generateLoggerScript()
  };

  const scriptContent = agentTemplates[agentConfig.name] || this.generateGenericScript();
  
  await fs.writeFile(agentConfig.scriptPath, scriptContent);
  await fs.chmod(agentConfig.scriptPath, 0o755);
  
  console.log(`Generated agent script: ${agentConfig.scriptPath}`);
}
```

## Hook Integration

### File Change Triggers
```json
{
  "event": "PostToolUse",
  "matcher": "Edit|Write",
  "command": "node .claude/task-dispatcher.js --file=\"$CLAUDE_TOOL_INPUT_FILE_PATH\" --event=\"file_modified\""
}
```

### Activity Logging
```json
{
  "event": "PreToolUse",
  "matcher": "Bash",
  "command": "node .claude/agents/structured-logger.js --action=\"log\" --message=\"Command executed: $CLAUDE_TOOL_INPUT_COMMAND\" --level=\"info\""
}
```

### Session Cleanup
```json
{
  "event": "Stop",
  "matcher": "*",
  "command": "node .claude/task-dispatcher.js --event=\"session_end\" --cleanup=true"
}
```

## Workflow Examples

### Complete Development Cycle
```bash
# User creates a new utility function
claude "Add calculateTax function to utils.js"

# Automated pipeline execution:
# 1. ESLint enforcer validates code style (blocking)
# 2. Unit test writer generates test skeleton (non-blocking)
# 3. Unit test runner executes tests (blocking, depends on code-quality)
# 4. Documentation maintainer updates API docs (non-blocking, depends on test-execution)
```

### Test-Driven Development Support
```bash
# User modifies existing function
claude "Update user validation logic"

# Smart agent execution:
# 1. ESLint enforcer fixes style issues
# 2. Unit test runner finds and executes related tests
# 3. Test writer updates test cases if needed
# 4. Documentation maintainer refreshes API documentation
```

### Log Analysis Workflow
```bash
# Application generates new log entries
# Log analyzer agent automatically:
# 1. Detects new log file changes
# 2. Analyzes log patterns and error rates
# 3. Generates alerts for critical issues
# 4. Updates analysis reports
```

## Agent Communication

### Inter-Process Communication
```javascript
// Agent sends completion message
this.sendMessage('completed', {
  success: true,
  result: analysisData,
  duration: executionTime
});

// Dispatcher handles agent messages
handleAgentMessage(message, taskId) {
  const task = this.runningTasks.get(taskId);
  
  switch (message.type) {
    case 'completed':
      this.metrics.tasksCompleted++;
      this.updateAgentMetrics(task.agentName, true, message.data.duration);
      break;
    case 'failed':
      this.metrics.tasksFailed++;
      this.updateAgentMetrics(task.agentName, false, message.data.duration);
      break;
  }
}
```

### Task Context Passing
```javascript
// Context passed to each agent
const context = {
  filePath: '/path/to/changed/file.js',
  event: 'file_modified',
  timestamp: Date.now(),
  metadata: { /* additional context */ }
};

// Agent receives and processes context
const { filePath, event } = this.context;
if (filePath && this.shouldProcessFile(filePath)) {
  await this.performSpecializedTask(filePath);
}
```

## Monitoring and Metrics

### Real-Time Metrics Collection
```json
{
  "metrics": {
    "tasksDispatched": 156,
    "tasksCompleted": 142,
    "tasksFailed": 14,
    "agentUtilization": {
      "unit-test-runner": {
        "tasksCompleted": 45,
        "tasksFailed": 2,
        "averageDuration": 2340
      },
      "eslint-enforcer": {
        "tasksCompleted": 67,
        "tasksFailed": 1,
        "averageDuration": 890
      }
    }
  }
}
```

### Performance Tracking
```javascript
updateAgentMetrics(agentName, success, duration) {
  if (!this.metrics.agentUtilization[agentName]) {
    this.metrics.agentUtilization[agentName] = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalDuration: 0,
      averageDuration: 0
    };
  }

  const agentMetrics = this.metrics.agentUtilization[agentName];
  
  if (success) {
    agentMetrics.tasksCompleted++;
  } else {
    agentMetrics.tasksFailed++;
  }
  
  agentMetrics.totalDuration += duration;
  const totalTasks = agentMetrics.tasksCompleted + agentMetrics.tasksFailed;
  agentMetrics.averageDuration = agentMetrics.totalDuration / totalTasks;
}
```

## Advanced Features

### Agent Lifecycle Management
- **Persistent Agents**: Always running for immediate response
- **Task-Based Agents**: Spawned on demand for specific tasks
- **Resource Management**: Automatic cleanup and process termination

### Error Handling and Recovery
- **Timeout Management**: Configurable timeouts per agent type
- **Retry Logic**: Automatic retry for transient failures
- **Graceful Degradation**: Continue pipeline execution despite non-blocking failures

### Extensibility
- **Plugin Architecture**: Easy addition of new agent types
- **Configuration-Driven**: All agent behavior controlled via JSON configuration
- **Template System**: Automated script generation for new agents

## Benefits

### Specialization
- Each agent focuses on a single responsibility
- Optimized performance for specific tasks
- Clear separation of concerns

### Scalability
- Independent agent processes
- Parallel execution capabilities
- Resource isolation and management

### Maintainability
- Configuration-driven agent definitions
- Automatic script generation
- Comprehensive monitoring and logging

### Flexibility
- Pipeline vs. concurrent execution modes
- Configurable dependencies and blocking behavior
- Easy addition of new agent types