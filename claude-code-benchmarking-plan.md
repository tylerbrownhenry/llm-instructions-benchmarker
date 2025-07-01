# Claude Code Benchmarking System Plan

## System Architecture

```
benchmark-runner/
├── config/
│   ├── ClaudeMapper.json          # Maps test scenarios to CLAUDE.md files
│   ├── Prompt.md                  # Standard prompt for all tests
│   └── ValidationTests.js         # Post-execution validation
├── templates/
│   └── react-app/                 # Base React app template
│       ├── src/
│       │   ├── App.js
│       │   ├── App.css
│       │   └── server.js
│       ├── tests/
│       │   ├── app.test.js
│       │   └── server.test.js
│       └── package.json
├── claude-configs/
│   ├── CLAUDE_NO_TDD.md
│   ├── CLAUDE_TDD.md
│   ├── CLAUDE_EMPTY.md
│   └── CLAUDE_STRICT.md
├── samples/                       # Generated test instances
├── results/                       # Execution results and comparisons
├── scripts/
│   ├── setup.js                   # Create sample directories
│   ├── runner.js                  # Execute Claude Code sessions
│   └── analyzer.js                # Compare and analyze results
└── benchmark.js                   # Main orchestration script
```

## Template React App Structure

The base template will be a minimal but complete React application:

**Package.json:**
```json
{
  "name": "benchmark-react-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^2.0.0",
    "@testing-library/react": "^13.0.0"
  }
}
```

**File Structure:**
- `src/App.js` - Simple React component with a counter
- `src/App.css` - Basic styling
- `src/server.js` - Express server serving the app
- `tests/app.test.js` - React component tests
- `tests/server.test.js` - Server endpoint tests

## Configuration System

**ClaudeMapper.json:**
```json
{
  "scenarios": [
    {
      "id": "no-tdd",
      "name": "No TDD Instructions",
      "claudeFile": "CLAUDE_NO_TDD.md",
      "description": "Standard instructions without TDD requirements"
    },
    {
      "id": "tdd-strict",
      "name": "Strict TDD",
      "claudeFile": "CLAUDE_TDD.md",
      "description": "Enforces test-driven development"
    },
    {
      "id": "minimal",
      "name": "Minimal Instructions",
      "claudeFile": "CLAUDE_EMPTY.md",
      "description": "Minimal or empty instructions"
    },
    {
      "id": "strict-standards",
      "name": "Strict Code Standards",
      "claudeFile": "CLAUDE_STRICT.md",
      "description": "Enforces strict coding standards and practices"
    }
  ],
  "settings": {
    "parallelExecution": false,
    "timeoutMinutes": 30,
    "cleanupAfterRun": false
  }
}
```

**Prompt.md:**
```markdown
# Benchmark Test Prompt

Add a new feature to this React application: implement a todo list component that allows users to add, edit, and delete tasks. The component should:

1. Display a list of todos
2. Allow adding new todos with a form
3. Allow editing existing todos inline
4. Allow deleting todos
5. Persist todos in local storage
6. Include proper error handling

Please implement this feature following the project's existing patterns and your configured guidelines.
```

## Claude Code Session Automation

**Execution Flow:**
1. **Setup Phase**: Create sample directories for each scenario
2. **Installation Phase**: Run `npm install` in each sample
3. **Session Phase**: Launch Claude Code sessions programmatically
4. **Monitoring Phase**: Track session progress and completion
5. **Collection Phase**: Gather results and generated code

**Key Automation Components:**

**Session Management:**
```javascript
// Spawn Claude Code sessions
const spawnClaudeSession = async (projectPath, prompt) => {
  return spawn('claude-code', ['--project', projectPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: projectPath
  });
};

// Send prompt to session
const sendPrompt = async (session, prompt) => {
  session.stdin.write(prompt + '\n');
  return waitForCompletion(session);
};
```

**Session Monitoring:**
- Track session duration
- Monitor for completion signals
- Capture session logs
- Handle timeouts and errors

## Validation and Comparison System

**ValidationTests.js:**
```javascript
const fs = require('fs');
const path = require('path');

const validationTests = {
  // Check if todo component was created
  todoComponentExists: (projectPath) => {
    const todoPath = path.join(projectPath, 'src/TodoList.js');
    return fs.existsSync(todoPath);
  },

  // Check if tests were written
  testsWritten: (projectPath) => {
    const testFiles = fs.readdirSync(path.join(projectPath, 'tests'));
    return testFiles.some(file => file.includes('todo') || file.includes('Todo'));
  },

  // Check if code passes linting
  passesLinting: async (projectPath) => {
    // Run linting command and check exit code
  },

  // Check if tests pass
  testsPass: async (projectPath) => {
    // Run test command and check exit code
  },

  // Count lines of code added
  linesOfCodeAdded: (projectPath, originalPath) => {
    // Compare file sizes/content
  }
};

module.exports = validationTests;
```

**Comparison Metrics:**
- Code quality (linting, formatting)
- Test coverage
- Performance (build time, bundle size)
- Code structure and organization
- Adherence to requested features
- Time to completion

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. Create base directory structure
2. Implement template React app
3. Create configuration files and Claude instruction variants
4. Build basic setup script for creating sample directories

### Phase 2: Automation Engine (Week 2)
1. Implement Claude Code session spawning
2. Create prompt delivery system
3. Add session monitoring and timeout handling
4. Build result collection mechanisms

### Phase 3: Validation System (Week 3)
1. Implement validation test suite
2. Create code comparison utilities
3. Build metrics collection system
4. Add report generation

### Phase 4: Analysis & Reporting (Week 4)
1. Create comprehensive result analysis
2. Build visual comparison reports
3. Add statistical analysis of results
4. Implement automated insights generation

## Usage Example

```bash
# Run full benchmark suite
npm run benchmark

# Run specific scenario
npm run benchmark -- --scenario tdd-strict

# Run with custom prompt
npm run benchmark -- --prompt ./custom-prompt.md

# Generate comparison report
npm run analyze-results
```

This system will provide comprehensive insights into how different Claude Code configurations affect development outcomes, code quality, and adherence to various development methodologies.