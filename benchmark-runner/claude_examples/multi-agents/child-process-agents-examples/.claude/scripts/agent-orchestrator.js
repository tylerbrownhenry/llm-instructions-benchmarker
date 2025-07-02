#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class AgentOrchestrator extends EventEmitter {
  constructor(configPath = '.claude/settings.json') {
    super();
    this.configPath = configPath;
    this.config = null;
    this.runningAgents = new Map();
    this.taskQueue = [];
    this.metrics = {
      tasksCompleted: 0,
      tasksQueued: 0,
      agentsSpawned: 0,
      averageTaskTime: 0
    };
  }

  async initialize() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Ensure required directories exist
      await this.ensureDirectories();
      
      // Start persistent agents
      await this.startPersistentAgents();
      
      this.log('info', 'Agent orchestrator initialized');
    } catch (error) {
      this.log('error', `Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = ['.claude/logs', '.claude/tasks', '.claude/scripts'];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  async startPersistentAgents() {
    const persistentAgents = this.config.agents.filter(
      agent => agent.lifecycle === 'persistent'
    );

    for (const agentConfig of persistentAgents) {
      await this.spawnAgent(agentConfig, { persistent: true });
    }
  }

  async spawnAgent(agentConfig, options = {}) {
    const agentId = `${agentConfig.name}-${Date.now()}`;
    
    this.log('info', `Spawning agent: ${agentConfig.name} (${agentId})`);
    
    try {
      // Create agent script
      const agentScript = await this.createAgentScript(agentConfig, agentId);
      
      // Spawn child process
      const childProcess = fork(agentScript, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          ...this.config.childProcessConfig.environment,
          CLAUDE_AGENT_ID: agentId,
          CLAUDE_AGENT_NAME: agentConfig.name,
          CLAUDE_AGENT_CONFIG: JSON.stringify(agentConfig)
        },
        execArgv: this.config.childProcessConfig.nodeOptions || []
      });

      // Set up communication
      this.setupAgentCommunication(childProcess, agentConfig, agentId);
      
      // Store running agent
      this.runningAgents.set(agentId, {
        process: childProcess,
        config: agentConfig,
        startTime: Date.now(),
        persistent: options.persistent || false,
        tasks: []
      });

      this.metrics.agentsSpawned++;
      
      return agentId;
    } catch (error) {
      this.log('error', `Failed to spawn agent ${agentConfig.name}: ${error.message}`);
      throw error;
    }
  }

  async createAgentScript(agentConfig, agentId) {
    const scriptPath = `.claude/scripts/agent-${agentId}.js`;
    
    const agentScript = `
#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ChildAgent {
  constructor() {
    this.agentId = process.env.CLAUDE_AGENT_ID;
    this.agentName = process.env.CLAUDE_AGENT_NAME;
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.setupIPC();
  }

  setupIPC() {
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

    // Send ready signal
    this.sendMessage('ready', { 
      agentId: this.agentId, 
      agentName: this.agentName 
    });
  }

  async handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'task':
        await this.executeTask(data);
        break;
      case 'shutdown':
        await this.shutdown();
        break;
      default:
        this.sendMessage('error', { error: 'Unknown message type: ' + type });
    }
  }

  async executeTask(taskData) {
    const { taskId, action, params } = taskData;
    const startTime = Date.now();
    
    this.sendMessage('task-started', { taskId, agentId: this.agentId });
    
    try {
      let result;
      
      switch (action) {
        case 'run-tests':
          result = await this.runTests(params);
          break;
        case 'write-tests':
          result = await this.writeTests(params);
          break;
        case 'lint-code':
          result = await this.lintCode(params);
          break;
        case 'update-docs':
          result = await this.updateDocs(params);
          break;
        case 'read-logs':
          result = await this.readLogs(params);
          break;
        case 'write-log':
          result = await this.writeLog(params);
          break;
        default:
          throw new Error('Unknown action: ' + action);
      }
      
      const duration = Date.now() - startTime;
      
      this.sendMessage('task-completed', {
        taskId,
        agentId: this.agentId,
        result,
        duration
      });
      
    } catch (error) {
      this.sendMessage('task-failed', {
        taskId,
        agentId: this.agentId,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  async runTests(params) {
    const { files, options = {} } = params;
    const testCommand = options.command || 'npm test';
    const filePattern = files ? \`-- \${files.join(' ')}\` : '';
    
    return new Promise((resolve, reject) => {
      exec(\`\${testCommand} \${filePattern}\`, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout,
          stderr,
          exitCode: error ? error.code : 0
        });
      });
    });
  }

  async writeTests(params) {
    const { sourceFile, testFile } = params;
    
    // Read source file to understand what to test
    const sourceCode = await fs.readFile(sourceFile, 'utf8');
    
    // Generate test content (simplified example)
    const testContent = this.generateTestContent(sourceCode, sourceFile);
    
    // Write test file
    await fs.writeFile(testFile, testContent);
    
    return {
      success: true,
      testFile,
      message: 'Test file generated successfully'
    };
  }

  async lintCode(params) {
    const { files, fix = false } = params;
    const fixFlag = fix ? '--fix' : '';
    const filePattern = files ? files.join(' ') : '.';
    
    return new Promise((resolve, reject) => {
      exec(\`npx eslint \${fixFlag} \${filePattern}\`, (error, stdout, stderr) => {
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

  async writeLog(params) {
    const { logFile, message, level = 'info' } = params;
    const timestamp = new Date().toISOString();
    const logEntry = \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\\n\`;
    
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

  generateTestContent(sourceCode, sourceFile) {
    const fileName = path.basename(sourceFile, path.extname(sourceFile));
    
    return \`
// Generated test file for \${sourceFile}
import { \${fileName} } from '../\${path.basename(sourceFile, path.extname(sourceFile))}';

describe('\${fileName}', () => {
  test('should be defined', () => {
    expect(\${fileName}).toBeDefined();
  });

  // TODO: Add more specific tests based on the source code
});
\`;
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, agentId: this.agentId });
    }
  }

  async shutdown() {
    this.sendMessage('shutdown-complete', { agentId: this.agentId });
    process.exit(0);
  }
}

// Start the agent
new ChildAgent();
`;

    await fs.writeFile(scriptPath, agentScript);
    await fs.chmod(scriptPath, 0o755);
    
    return scriptPath;
  }

  setupAgentCommunication(childProcess, agentConfig, agentId) {
    childProcess.on('message', (message) => {
      this.handleAgentMessage(message, agentId);
    });

    childProcess.on('exit', (code, signal) => {
      this.log('info', `Agent ${agentId} exited with code ${code}, signal ${signal}`);
      this.runningAgents.delete(agentId);
    });

    childProcess.on('error', (error) => {
      this.log('error', `Agent ${agentId} error: ${error.message}`);
    });
  }

  handleAgentMessage(message, agentId) {
    const { type, data } = message;
    
    switch (type) {
      case 'ready':
        this.log('info', `Agent ${agentId} is ready`);
        break;
      case 'task-started':
        this.log('info', `Task ${data.taskId} started by agent ${agentId}`);
        break;
      case 'task-completed':
        this.log('info', `Task ${data.taskId} completed by agent ${agentId} in ${data.duration}ms`);
        this.metrics.tasksCompleted++;
        break;
      case 'task-failed':
        this.log('error', `Task ${data.taskId} failed: ${data.error}`);
        break;
      case 'error':
        this.log('error', `Agent ${agentId} error: ${data.error}`);
        break;
    }
  }

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

  matchesPattern(filePath, pattern) {
    // Simple glob-like matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    return new RegExp(regexPattern).test(filePath);
  }

  getActionForAgent(agentName, event) {
    const actionMap = {
      'test-runner-agent': 'run-tests',
      'test-writer-agent': 'write-tests',
      'linter-agent': 'lint-code',
      'docs-updater-agent': 'update-docs',
      'log-reader-agent': 'read-logs',
      'log-writer-agent': 'write-log'
    };
    
    return actionMap[agentName] || 'unknown';
  }

  async scheduleTask(agentName, taskData) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find or spawn agent
    let agentId = this.findRunningAgent(agentName);
    if (!agentId) {
      const agentConfig = this.config.agents.find(a => a.name === agentName);
      if (agentConfig) {
        agentId = await this.spawnAgent(agentConfig);
      }
    }

    if (agentId) {
      const agent = this.runningAgents.get(agentId);
      agent.process.send({
        type: 'task',
        data: { taskId, ...taskData }
      });
      
      this.metrics.tasksQueued++;
    }
  }

  findRunningAgent(agentName) {
    for (const [agentId, agent] of this.runningAgents) {
      if (agent.config.name === agentName) {
        return agentId;
      }
    }
    return null;
  }

  async cleanup(sessionId) {
    this.log('info', `Cleaning up session ${sessionId}`);
    
    // Shutdown non-persistent agents
    for (const [agentId, agent] of this.runningAgents) {
      if (!agent.persistent) {
        agent.process.send({ type: 'shutdown' });
      }
    }
    
    // Save metrics
    await this.saveMetrics();
  }

  async saveMetrics() {
    try {
      await fs.writeFile('.claude/metrics.json', JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      this.log('error', `Failed to save metrics: ${error.message}`);
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logEntry);
    
    // Also write to log file
    if (this.config?.orchestration?.monitoring?.enabled) {
      fs.appendFile('.claude/logs/orchestrator.log', logEntry + '\\n').catch(() => {});
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const orchestrator = new AgentOrchestrator();
  await orchestrator.initialize();
  
  switch (command) {
    case 'spawn':
      const triggerFile = args.find(arg => arg.startsWith('--trigger='))?.split('=')[1];
      const event = args.find(arg => arg.startsWith('--event='))?.split('=')[1];
      if (triggerFile && event) {
        await orchestrator.triggerAgents(triggerFile, event);
      }
      break;
      
    case 'log':
      const agent = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
      const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
      if (agent && action) {
        await orchestrator.scheduleTask('log-writer-agent', {
          action: 'write-log',
          params: {
            logFile: '.claude/logs/activity.log',
            message: `Agent ${agent} executed: ${action}`,
            level: 'info'
          }
        });
      }
      break;
      
    case 'cleanup':
      const sessionId = args.find(arg => arg.startsWith('--session='))?.split('=')[1];
      if (sessionId) {
        await orchestrator.cleanup(sessionId);
      }
      break;
      
    default:
      console.log('Usage: agent-orchestrator.js [spawn|log|cleanup] [options]');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AgentOrchestrator;