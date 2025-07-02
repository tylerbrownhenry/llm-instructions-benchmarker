#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class TaskDispatcher extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.runningTasks = new Map();
    this.agentProcesses = new Map();
    this.taskQueue = [];
    this.metrics = {
      tasksDispatched: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      agentUtilization: {}
    };
  }

  async initialize() {
    try {
      const configData = await fs.readFile('.claude/settings.json', 'utf8');
      this.config = JSON.parse(configData);
      
      await this.ensureDirectories();
      await this.loadMetrics();
      
      console.log('Task dispatcher initialized');
    } catch (error) {
      console.error('Failed to initialize task dispatcher:', error.message);
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = ['.claude/agents', '.claude/logs', '.claude/temp'];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  async dispatchForFile(filePath, event) {
    console.log(`Dispatching tasks for file: ${filePath}, event: ${event}`);
    
    // Find matching agents based on trigger patterns
    const matchingAgents = this.config.agents.filter(agent => {
      if (!agent.triggerPatterns) return false;
      return agent.triggerPatterns.some(pattern => 
        this.matchesGlob(filePath, pattern)
      );
    });

    if (matchingAgents.length === 0) {
      console.log('No matching agents found for file:', filePath);
      return;
    }

    // Check if pipeline is enabled
    if (this.config.taskPipeline?.enabled) {
      await this.executePipeline(matchingAgents, { filePath, event });
    } else {
      // Execute agents concurrently
      const tasks = matchingAgents.map(agent => 
        this.executeAgent(agent, { filePath, event })
      );
      
      await Promise.all(tasks);
    }
  }

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

      // Find agents for this stage
      const stageAgents = matchingAgents.filter(agent => 
        stage.agents.includes(agent.name)
      );

      if (stageAgents.length === 0) {
        console.log(`No agents found for stage: ${stage.name}`);
        continue;
      }

      // Execute stage agents
      const stagePromises = stageAgents.map(agent => 
        this.executeAgent(agent, context, stage.timeout)
      );

      try {
        const results = await Promise.all(stagePromises);
        const stageSuccess = results.every(result => result.success);
        
        stageResults.set(stage.name, { 
          success: stageSuccess, 
          results 
        });

        if (stage.blocking && !stageSuccess) {
          console.error(`Blocking stage ${stage.name} failed, stopping pipeline`);
          break;
        }
      } catch (error) {
        console.error(`Stage ${stage.name} failed:`, error.message);
        stageResults.set(stage.name, { 
          success: false, 
          error: error.message 
        });
        
        if (stage.blocking) {
          break;
        }
      }
    }

    return stageResults;
  }

  async executeAgent(agentConfig, context, timeout = 60000) {
    const taskId = `${agentConfig.name}-${Date.now()}`;
    console.log(`Executing agent: ${agentConfig.name} (${taskId})`);

    try {
      // Check if agent script exists
      const agentScriptPath = agentConfig.scriptPath;
      try {
        await fs.access(agentScriptPath);
      } catch (error) {
        console.log(`Agent script not found, creating: ${agentScriptPath}`);
        await this.generateAgentScript(agentConfig);
      }

      // Spawn agent process
      const agentProcess = fork(agentScriptPath, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          CLAUDE_AGENT_CONFIG: JSON.stringify(agentConfig),
          CLAUDE_TASK_CONTEXT: JSON.stringify(context),
          CLAUDE_TASK_ID: taskId
        }
      });

      this.agentProcesses.set(taskId, agentProcess);
      this.runningTasks.set(taskId, {
        agentName: agentConfig.name,
        startTime: Date.now(),
        context
      });

      // Handle agent communication
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          agentProcess.kill();
          reject(new Error(`Agent ${agentConfig.name} timed out`));
        }, timeout);

        agentProcess.on('message', (message) => {
          clearTimeout(timer);
          this.handleAgentMessage(message, taskId);
          
          if (message.type === 'completed') {
            resolve({
              success: true,
              result: message.data,
              duration: Date.now() - this.runningTasks.get(taskId).startTime
            });
          } else if (message.type === 'failed') {
            resolve({
              success: false,
              error: message.error,
              duration: Date.now() - this.runningTasks.get(taskId).startTime
            });
          }
        });

        agentProcess.on('exit', (code) => {
          clearTimeout(timer);
          this.agentProcesses.delete(taskId);
          this.runningTasks.delete(taskId);
          
          if (code !== 0) {
            resolve({
              success: false,
              error: `Agent exited with code ${code}`,
              duration: Date.now() - this.runningTasks.get(taskId).startTime
            });
          }
        });

        agentProcess.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });

        // Send task to agent
        agentProcess.send({
          type: 'execute',
          context,
          config: agentConfig.config || {}
        });
      });

    } catch (error) {
      console.error(`Failed to execute agent ${agentConfig.name}:`, error.message);
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

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

  generateTestRunnerScript() {
    return `#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class UnitTestRunner {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.runTests();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async runTests() {
    const { filePath } = this.context;
    const config = this.config.config || {};
    
    // Determine test command based on file
    let testCommand = 'npm test';
    
    if (filePath && filePath.includes('test')) {
      // Run specific test file
      testCommand += \` -- "\${filePath}"\`;
    } else if (filePath) {
      // Run tests related to the changed file
      const testFile = this.findRelatedTestFile(filePath);
      if (testFile) {
        testCommand += \` -- "\${testFile}"\`;
      }
    }

    if (config.verbose) {
      testCommand += ' --verbose';
    }

    if (config.coverageThreshold) {
      testCommand += \` --coverage --coverageThreshold='{"global":{"statements":\${config.coverageThreshold},"branches":\${config.coverageThreshold},"functions":\${config.coverageThreshold},"lines":\${config.coverageThreshold}}}'\`;
    }

    return new Promise((resolve, reject) => {
      exec(testCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
        const result = {
          success: !error,
          exitCode: error ? error.code : 0,
          stdout,
          stderr,
          coverage: this.parseCoverage(stdout),
          failedTests: this.parseFailedTests(stdout)
        };
        
        resolve(result);
      });
    });
  }

  findRelatedTestFile(filePath) {
    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);
    
    const possibleTestFiles = [
      path.join(dirName, \`\${baseName}.test.js\`),
      path.join(dirName, \`\${baseName}.spec.js\`),
      path.join(dirName, '__tests__', \`\${baseName}.test.js\`),
      path.join('test', \`\${baseName}.test.js\`)
    ];
    
    return possibleTestFiles.find(testFile => {
      try {
        require.resolve(path.resolve(testFile));
        return true;
      } catch {
        return false;
      }
    });
  }

  parseCoverage(output) {
    const coverageRegex = /All files[\\s\\S]*?(\\d+\\.?\\d*)\\s*\\|\\s*(\\d+\\.?\\d*)\\s*\\|\\s*(\\d+\\.?\\d*)\\s*\\|\\s*(\\d+\\.?\\d*)/;
    const match = output.match(coverageRegex);
    
    if (match) {
      return {
        statements: parseFloat(match[1]),
        branches: parseFloat(match[2]),
        functions: parseFloat(match[3]),
        lines: parseFloat(match[4])
      };
    }
    
    return null;
  }

  parseFailedTests(output) {
    const failedTests = [];
    const failureRegex = /FAIL\\s+(.+?)\\n([\\s\\S]*?)(?=\\n\\s*PASS|\\n\\s*FAIL|\\n\\s*Test Suites:|$)/g;
    let match;
    
    while ((match = failureRegex.exec(output)) !== null) {
      failedTests.push({
        file: match[1].trim(),
        details: match[2].trim()
      });
    }
    
    return failedTests;
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const runner = new UnitTestRunner();
    await runner.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  generateTestWriterScript() {
    return `#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class UnitTestWriter {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.writeTests();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async writeTests() {
    const { filePath } = this.context;
    
    if (!filePath || filePath.includes('test') || filePath.includes('spec')) {
      return { message: 'Skipped test file or no source file provided' };
    }

    try {
      const sourceCode = await fs.readFile(filePath, 'utf8');
      const testContent = this.generateTestContent(sourceCode, filePath);
      const testFilePath = this.getTestFilePath(filePath);
      
      // Check if test file already exists
      let shouldWrite = true;
      try {
        await fs.access(testFilePath);
        // Test file exists, check if we should update it
        const existingTest = await fs.readFile(testFilePath, 'utf8');
        if (existingTest.includes('// Generated test file')) {
          shouldWrite = true; // Update generated tests
        } else {
          shouldWrite = false; // Don't overwrite manual tests
        }
      } catch {
        // Test file doesn't exist, create it
        shouldWrite = true;
      }

      if (shouldWrite) {
        await fs.writeFile(testFilePath, testContent);
        return {
          success: true,
          testFile: testFilePath,
          message: 'Test file generated/updated successfully'
        };
      } else {
        return {
          success: true,
          message: 'Test file exists and appears to be manually created, skipping'
        };
      }
    } catch (error) {
      throw new Error(\`Failed to write tests for \${filePath}: \${error.message}\`);
    }
  }

  generateTestContent(sourceCode, filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const relativePath = path.relative(path.dirname(this.getTestFilePath(filePath)), filePath);
    
    // Extract functions and classes from source code
    const functions = this.extractFunctions(sourceCode);
    const classes = this.extractClasses(sourceCode);
    
    let testContent = \`// Generated test file for \${filePath}
// Auto-generated by Claude Code unit-test-writer agent

import { \${functions.concat(classes).join(', ')} } from '\${relativePath}';

describe('\${fileName}', () => {
\`;

    // Generate tests for functions
    functions.forEach(funcName => {
      testContent += \`
  describe('\${funcName}', () => {
    test('should be defined', () => {
      expect(\${funcName}).toBeDefined();
    });

    test('should handle valid input', () => {
      // TODO: Add test with valid input
    });

    test('should handle invalid input', () => {
      // TODO: Add test with invalid input
    });
  });
\`;
    });

    // Generate tests for classes
    classes.forEach(className => {
      testContent += \`
  describe('\${className}', () => {
    test('should create instance', () => {
      const instance = new \${className}();
      expect(instance).toBeInstanceOf(\${className});
    });

    // TODO: Add more class-specific tests
  });
\`;
    });

    testContent += \`
});
\`;

    return testContent;
  }

  extractFunctions(code) {
    const functionRegex = /(?:export\\s+)?(?:function\\s+|const\\s+|let\\s+|var\\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*(?:=\\s*(?:async\\s+)?(?:function|\\()|\\()/g;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }
    
    return [...new Set(functions)]; // Remove duplicates
  }

  extractClasses(code) {
    const classRegex = /(?:export\\s+)?class\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const classes = [];
    let match;
    
    while ((match = classRegex.exec(code)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  getTestFilePath(filePath) {
    const parsed = path.parse(filePath);
    const testDir = path.join(parsed.dir, '__tests__');
    const testFileName = \`\${parsed.name}.test\${parsed.ext}\`;
    
    return path.join(testDir, testFileName);
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const writer = new UnitTestWriter();
    await writer.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  generateEslintScript() {
    return `#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

class EslintEnforcer {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.runEslint();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async runEslint() {
    const { filePath } = this.context;
    const config = this.config.config || {};
    
    let eslintCommand = 'npx eslint';
    
    if (config.autoFix) {
      eslintCommand += ' --fix';
    }
    
    if (config.configFile) {
      eslintCommand += \` --config \${config.configFile}\`;
    }
    
    eslintCommand += ' --format json';
    
    // Target specific file or all files
    const target = filePath || '.';
    eslintCommand += \` "\${target}"\`;

    return new Promise((resolve, reject) => {
      exec(eslintCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
        try {
          const eslintResults = JSON.parse(stdout || '[]');
          
          const summary = {
            success: !error || error.code === 0,
            exitCode: error ? error.code : 0,
            filesChecked: eslintResults.length,
            totalErrors: eslintResults.reduce((sum, file) => sum + file.errorCount, 0),
            totalWarnings: eslintResults.reduce((sum, file) => sum + file.warningCount, 0),
            fixedCount: eslintResults.reduce((sum, file) => sum + (file.fixableErrorCount || 0), 0),
            results: eslintResults,
            stderr
          };
          
          resolve(summary);
        } catch (parseError) {
          resolve({
            success: false,
            error: 'Failed to parse ESLint output',
            stdout,
            stderr
          });
        }
      });
    });
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const enforcer = new EslintEnforcer();
    await enforcer.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  generateDocsScript() {
    return `#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DocumentationMaintainer {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.updateDocumentation();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async updateDocumentation() {
    const { filePath } = this.context;
    const config = this.config.config || {};
    
    const tasks = [];
    
    // Generate API documentation if source files changed
    if (filePath && (filePath.includes('src/') || filePath.includes('lib/'))) {
      tasks.push(this.generateApiDocs(config));
    }
    
    // Update README if package.json changed
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
      results,
      message: 'Documentation update completed'
    };
  }

  async generateApiDocs(config) {
    const docTool = config.docTool || 'typedoc';
    const outputDir = config.outputDir || 'docs';
    
    let command;
    if (docTool === 'typedoc') {
      command = \`npx typedoc --out \${outputDir} src/\`;
      if (!config.includePrivate) {
        command += ' --excludePrivate';
      }
    } else if (docTool === 'jsdoc') {
      command = \`npx jsdoc -d \${outputDir} -r src/\`;
    }

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        resolve({
          success: !error,
          tool: docTool,
          stdout,
          stderr,
          message: error ? 'API doc generation failed' : 'API docs generated successfully'
        });
      });
    });
  }

  async updateReadme() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      let readme = '';
      
      try {
        readme = await fs.readFile('README.md', 'utf8');
      } catch {
        // README doesn't exist, create basic one
      }

      // Update or create README sections
      readme = this.updateReadmeSection(readme, 'Name', \`# \${packageJson.name}\`);
      readme = this.updateReadmeSection(readme, 'Description', packageJson.description || '');
      
      if (packageJson.scripts) {
        const scripts = Object.keys(packageJson.scripts)
          .map(script => \`- \\\`npm run \${script}\\\`: \${packageJson.scripts[script]}\`)
          .join('\\n');
        readme = this.updateReadmeSection(readme, 'Scripts', \`## Available Scripts\\n\\n\${scripts}\`);
      }

      await fs.writeFile('README.md', readme);
      
      return {
        success: true,
        message: 'README.md updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: \`Failed to update README: \${error.message}\`
      };
    }
  }

  updateReadmeSection(readme, sectionName, content) {
    const sectionRegex = new RegExp(\`(## \${sectionName}[\\\\s\\\\S]*?)(?=## |$)\`, 'i');
    
    if (sectionRegex.test(readme)) {
      return readme.replace(sectionRegex, content + '\\n\\n');
    } else {
      return readme + '\\n\\n' + content + '\\n\\n';
    }
  }

  async updateChangelog() {
    // Simplified changelog update
    const date = new Date().toISOString().split('T')[0];
    const changelogEntry = \`## [\${date}]\\n- Documentation updated\\n\\n\`;
    
    try {
      let changelog = '';
      try {
        changelog = await fs.readFile('CHANGELOG.md', 'utf8');
      } catch {
        changelog = '# Changelog\\n\\n';
      }
      
      // Insert new entry after the header
      const lines = changelog.split('\\n');
      lines.splice(2, 0, changelogEntry);
      
      await fs.writeFile('CHANGELOG.md', lines.join('\\n'));
      
      return {
        success: true,
        message: 'Changelog updated'
      };
    } catch (error) {
      return {
        success: false,
        message: \`Failed to update changelog: \${error.message}\`
      };
    }
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const maintainer = new DocumentationMaintainer();
    await maintainer.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  generateLogAnalyzerScript() {
    return `#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class LogAnalyzer {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.analyzeLogs();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async analyzeLogs() {
    const { filePath } = this.context;
    
    if (!filePath || !filePath.includes('.log')) {
      return { message: 'No log file to analyze' };
    }

    try {
      const logContent = await fs.readFile(filePath, 'utf8');
      const analysis = this.performLogAnalysis(logContent);
      
      return {
        success: true,
        filePath,
        analysis,
        message: 'Log analysis completed'
      };
    } catch (error) {
      throw new Error(\`Failed to analyze log file \${filePath}: \${error.message}\`);
    }
  }

  performLogAnalysis(content) {
    const lines = content.split('\\n').filter(line => line.trim());
    const analysis = {
      totalLines: lines.length,
      levels: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      errors: [],
      patterns: {},
      timeRange: null
    };

    const timestamps = [];
    
    lines.forEach((line, index) => {
      // Analyze log levels
      if (line.includes('[DEBUG]')) analysis.levels.debug++;
      else if (line.includes('[INFO]')) analysis.levels.info++;
      else if (line.includes('[WARN]')) analysis.levels.warn++;
      else if (line.includes('[ERROR]')) analysis.levels.error++;
      else if (line.includes('[FATAL]')) analysis.levels.fatal++;

      // Extract errors
      if (line.includes('[ERROR]') || line.includes('[FATAL]')) {
        analysis.errors.push({
          line: index + 1,
          content: line,
          timestamp: this.extractTimestamp(line)
        });
      }

      // Extract timestamps for time range
      const timestamp = this.extractTimestamp(line);
      if (timestamp) {
        timestamps.push(timestamp);
      }

      // Identify patterns
      const pattern = this.identifyPattern(line);
      if (pattern) {
        analysis.patterns[pattern] = (analysis.patterns[pattern] || 0) + 1;
      }
    });

    // Set time range
    if (timestamps.length > 0) {
      analysis.timeRange = {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps)
      };
    }

    return analysis;
  }

  extractTimestamp(line) {
    const timestampRegex = /\\[?([0-9]{4}-[0-9]{2}-[0-9]{2}[T\\s][0-9]{2}:[0-9]{2}:[0-9]{2})/;
    const match = line.match(timestampRegex);
    return match ? new Date(match[1]).getTime() : null;
  }

  identifyPattern(line) {
    // Simple pattern identification
    if (line.includes('database')) return 'database';
    if (line.includes('authentication')) return 'auth';
    if (line.includes('payment')) return 'payment';
    if (line.includes('api')) return 'api';
    return null;
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const analyzer = new LogAnalyzer();
    await analyzer.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  generateLoggerScript() {
    return `#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class StructuredLogger {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.writeLog();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async writeLog() {
    const config = this.config.config || {};
    const { message, level = 'info', metadata = {} } = this.context;
    
    const logEntry = this.formatLogEntry(message, level, metadata, config);
    const logFile = this.getLogFile(level, config);
    
    try {
      await this.ensureLogDirectory(logFile);
      await fs.appendFile(logFile, logEntry + '\\n');
      
      // Check if log rotation is needed
      if (config.rotateSize) {
        await this.checkLogRotation(logFile, config);
      }
      
      return {
        success: true,
        logFile,
        message: 'Log entry written successfully'
      };
    } catch (error) {
      throw new Error(\`Failed to write log: \${error.message}\`);
    }
  }

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
      // Text format
      const metadataStr = Object.keys(metadata).length > 0 
        ? \` \${JSON.stringify(metadata)}\`
        : '';
      return \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\${metadataStr}\`;
    }
  }

  getLogFile(level, config) {
    const logDir = '.claude/logs';
    const date = new Date().toISOString().split('T')[0];
    
    if (['error', 'fatal'].includes(level)) {
      return path.join(logDir, \`error-\${date}.log\`);
    } else {
      return path.join(logDir, \`activity-\${date}.log\`);
    }
  }

  async ensureLogDirectory(logFile) {
    const logDir = path.dirname(logFile);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async checkLogRotation(logFile, config) {
    try {
      const stats = await fs.stat(logFile);
      const maxSize = this.parseSize(config.rotateSize);
      
      if (stats.size > maxSize) {
        await this.rotateLog(logFile, config);
      }
    } catch (error) {
      // File might not exist yet
    }
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/^(\\d+)([KMGT]?B?)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const size = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
      case 'KB': return size * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'GB': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  async rotateLog(logFile, config) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = \`\${logFile}.\${timestamp}\`;
    
    try {
      await fs.rename(logFile, rotatedFile);
      
      if (config.archiveOld) {
        // Could implement compression here
        console.log(\`Log rotated to: \${rotatedFile}\`);
      }
    } catch (error) {
      console.error(\`Failed to rotate log: \${error.message}\`);
    }
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Handle command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
  
  if (action === 'log') {
    const message = args.find(arg => arg.startsWith('--message='))?.split('=')[1];
    const level = args.find(arg => arg.startsWith('--level='))?.split('=')[1] || 'info';
    
    if (message) {
      // Set up environment for direct usage
      process.env.CLAUDE_AGENT_CONFIG = JSON.stringify({
        name: 'structured-logger',
        config: { logFormat: 'text' }
      });
      process.env.CLAUDE_TASK_CONTEXT = JSON.stringify({ message, level });
      process.env.CLAUDE_TASK_ID = \`direct-\${Date.now()}\`;
      
      const logger = new StructuredLogger();
      logger.writeLog().then(() => {
        console.log('Log written successfully');
      }).catch(console.error);
    }
  }
} else {
  // Setup IPC for child process usage
  process.on('message', async (message) => {
    if (message.type === 'execute') {
      const logger = new StructuredLogger();
      await logger.execute();
    }
  });

  // Send ready signal
  if (process.send) {
    process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
  }
}
`;
  }

  generateGenericScript() {
    return `#!/usr/bin/env node

class GenericAgent {
  constructor() {
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.context = JSON.parse(process.env.CLAUDE_TASK_CONTEXT);
    this.taskId = process.env.CLAUDE_TASK_ID;
  }

  async execute() {
    try {
      const result = await this.performTask();
      this.sendMessage('completed', result);
    } catch (error) {
      this.sendMessage('failed', { error: error.message });
    }
  }

  async performTask() {
    // Generic task implementation
    return {
      success: true,
      message: \`Generic agent \${this.config.name} executed successfully\`,
      context: this.context
    };
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, taskId: this.taskId });
    }
  }
}

// Setup IPC and execute
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const agent = new GenericAgent();
    await agent.execute();
  }
});

// Send ready signal
if (process.send) {
  process.send({ type: 'ready', taskId: process.env.CLAUDE_TASK_ID });
}
`;
  }

  matchesGlob(filePath, pattern) {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    return new RegExp(regexPattern).test(filePath);
  }

  handleAgentMessage(message, taskId) {
    const task = this.runningTasks.get(taskId);
    if (!task) return;

    console.log(`Agent ${task.agentName} (${taskId}): ${message.type}`);
    
    if (message.type === 'completed') {
      this.metrics.tasksCompleted++;
      this.updateAgentMetrics(task.agentName, true, message.data.duration || 0);
    } else if (message.type === 'failed') {
      this.metrics.tasksFailed++;
      this.updateAgentMetrics(task.agentName, false, message.data.duration || 0);
    }
  }

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

  async cleanup() {
    console.log('Cleaning up task dispatcher...');
    
    // Kill remaining processes
    for (const [taskId, process] of this.agentProcesses) {
      process.kill();
    }
    
    this.agentProcesses.clear();
    this.runningTasks.clear();
    
    // Save metrics
    await this.saveMetrics();
  }

  async loadMetrics() {
    try {
      const metricsData = await fs.readFile('.claude/agent-metrics.json', 'utf8');
      this.metrics = { ...this.metrics, ...JSON.parse(metricsData) };
    } catch (error) {
      // Metrics file doesn't exist yet
    }
  }

  async saveMetrics() {
    try {
      await fs.writeFile('.claude/agent-metrics.json', JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const eventArg = args.find(arg => arg.startsWith('--event='));
  const cleanupArg = args.find(arg => arg.startsWith('--cleanup='));

  const dispatcher = new TaskDispatcher();
  await dispatcher.initialize();

  if (fileArg && eventArg) {
    const filePath = fileArg.split('=')[1];
    const event = eventArg.split('=')[1];
    await dispatcher.dispatchForFile(filePath, event);
  } else if (cleanupArg) {
    await dispatcher.cleanup();
  } else {
    console.log('Usage: task-dispatcher.js --file=<file> --event=<event> | --cleanup=true');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TaskDispatcher;