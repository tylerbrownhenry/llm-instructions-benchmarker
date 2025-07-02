#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class AgentOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.persistentAgents = new Map();
    this.pooledAgents = new Map();
    this.singleUseAgents = new Map();
    this.taskQueue = [];
    this.resourceUsage = {
      memory: 0,
      cpu: 0,
      activeAgents: 0
    };
    this.metrics = {
      tasksProcessed: 0,
      agentsSpawned: 0,
      agentsTerminated: 0,
      avgTaskTime: 0,
      errorRate: 0
    };
  }

  async initialize() {
    try {
      const configData = await fs.readFile('.claude/settings.json', 'utf8');
      this.config = JSON.parse(configData);
      
      await this.setupDirectories();
      await this.startPersistentAgents();
      await this.initializeAgentPools();
      await this.startMonitoring();
      
      console.log('Agent orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error.message);
      throw error;
    }
  }

  async setupDirectories() {
    const dirs = [
      '.claude/scripts/agents',
      '.claude/logs', 
      '.claude/temp',
      '.claude/reports',
      '.claude/state'
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might exist
      }
    }
  }

  async startPersistentAgents() {
    const persistentAgents = this.config.agents.filter(agent => agent.type === 'reusable');
    
    for (const agentConfig of persistentAgents) {
      await this.spawnPersistentAgent(agentConfig);
    }
    
    console.log(`Started ${persistentAgents.length} persistent agents`);
  }

  async initializeAgentPools() {
    const pooledAgents = this.config.agents.filter(agent => agent.type === 'pool');
    
    for (const agentConfig of pooledAgents) {
      await this.initializeAgentPool(agentConfig);
    }
    
    console.log(`Initialized ${pooledAgents.length} agent pools`);
  }

  async spawnPersistentAgent(agentConfig) {
    const agentId = \`\${agentConfig.name}-persistent-\${Date.now()}\`;
    
    try {
      const agentScript = await this.createAgentScript(agentConfig, agentId);
      const childProcess = this.createChildProcess(agentScript, agentConfig, agentId);
      
      this.persistentAgents.set(agentId, {
        process: childProcess,
        config: agentConfig,
        startTime: Date.now(),
        taskCount: 0,
        activeTasks: new Set()
      });

      this.setupAgentCommunication(childProcess, agentId, 'persistent');
      
      console.log(\`Spawned persistent agent: \${agentConfig.name} (\${agentId})\`);
      return agentId;
    } catch (error) {
      console.error(\`Failed to spawn persistent agent \${agentConfig.name}:\`, error.message);
      throw error;
    }
  }

  async initializeAgentPool(agentConfig) {
    const poolName = agentConfig.name;
    const { minInstances } = agentConfig.poolConfig;
    
    this.pooledAgents.set(poolName, {
      config: agentConfig,
      instances: new Map(),
      activeCount: 0,
      taskQueue: [],
      roundRobinIndex: 0
    });

    // Start minimum number of instances
    for (let i = 0; i < minInstances; i++) {
      await this.spawnPooledAgent(agentConfig, poolName);
    }
    
    console.log(\`Initialized pool \${poolName} with \${minInstances} instances\`);
  }

  async spawnPooledAgent(agentConfig, poolName) {
    const agentId = \`\${poolName}-pool-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`;
    
    try {
      const agentScript = await this.createAgentScript(agentConfig, agentId);
      const childProcess = this.createChildProcess(agentScript, agentConfig, agentId);
      
      const pool = this.pooledAgents.get(poolName);
      pool.instances.set(agentId, {
        process: childProcess,
        busy: false,
        taskCount: 0,
        startTime: Date.now()
      });

      this.setupAgentCommunication(childProcess, agentId, 'pooled');
      
      console.log(\`Spawned pooled agent: \${agentId}\`);
      return agentId;
    } catch (error) {
      console.error(\`Failed to spawn pooled agent:\`, error.message);
      throw error;
    }
  }

  async spawnSingleUseAgent(agentConfig, task) {
    const agentId = \`\${agentConfig.name}-single-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`;
    
    try {
      const agentScript = await this.createAgentScript(agentConfig, agentId, task);
      const childProcess = this.createChildProcess(agentScript, agentConfig, agentId);
      
      this.singleUseAgents.set(agentId, {
        process: childProcess,
        config: agentConfig,
        task,
        startTime: Date.now()
      });

      this.setupAgentCommunication(childProcess, agentId, 'single-use');
      
      console.log(\`Spawned single-use agent: \${agentConfig.name} (\${agentId})\`);
      
      // Execute task immediately
      childProcess.send({
        type: 'execute-task',
        task,
        agentId
      });
      
      return agentId;
    } catch (error) {
      console.error(\`Failed to spawn single-use agent \${agentConfig.name}:\`, error.message);
      throw error;
    }
  }

  createChildProcess(agentScript, agentConfig, agentId) {
    return fork(agentScript, [], {
      stdio: 'pipe',
      env: {
        ...process.env,
        CLAUDE_AGENT_ID: agentId,
        CLAUDE_AGENT_CONFIG: JSON.stringify(agentConfig),
        CLAUDE_ORCHESTRATOR_MODE: 'true'
      },
      execArgv: ['--max-old-space-size=' + (agentConfig.resources?.memory || '256').replace('MB', '')]
    });
  }

  async createAgentScript(agentConfig, agentId, task = null) {
    const scriptPath = \`.claude/scripts/agents/\${agentId}.js\`;
    
    const scriptContent = this.generateAgentScript(agentConfig, task);
    await fs.writeFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, 0o755);
    
    return scriptPath;
  }

  generateAgentScript(agentConfig, task = null) {
    return \`#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class OrchestrationAgent {
  constructor() {
    this.agentId = process.env.CLAUDE_AGENT_ID;
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.activeTasks = new Map();
    this.capabilities = this.config.capabilities || [];
    this.setupIPC();
  }

  setupIPC() {
    process.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.sendMessage('error', {
          error: error.message,
          stack: error.stack,
          agentId: this.agentId
        });
      }
    });

    // Health check response
    process.on('SIGUSR1', () => {
      this.sendMessage('health-check', {
        agentId: this.agentId,
        activeTasks: this.activeTasks.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      });
    });

    this.sendMessage('ready', {
      agentId: this.agentId,
      capabilities: this.capabilities,
      type: this.config.type
    });
  }

  async handleMessage(message) {
    const { type, task, agentId } = message;
    
    switch (type) {
      case 'execute-task':
        await this.executeTask(task);
        break;
      case 'cancel-task':
        await this.cancelTask(task.id);
        break;
      case 'health-check':
        await this.performHealthCheck();
        break;
      case 'shutdown':
        await this.shutdown();
        break;
      default:
        this.sendMessage('error', { error: 'Unknown message type: ' + type });
    }
  }

  async executeTask(task) {
    const taskId = task.id || \`task-\${Date.now()}\`;
    const startTime = Date.now();
    
    this.activeTasks.set(taskId, { task, startTime });
    this.sendMessage('task-started', { taskId, agentId: this.agentId });
    
    try {
      let result;
      
      // Route task based on capability and type
      if (this.capabilities.includes('build') && task.type === 'build') {
        result = await this.handleBuildTask(task);
      } else if (this.capabilities.includes('test-execution') && task.type === 'test') {
        result = await this.handleTestTask(task);
      } else if (this.capabilities.includes('static-analysis') && task.type === 'quality') {
        result = await this.handleQualityTask(task);
      } else if (this.capabilities.includes('file-processing') && task.type === 'file-process') {
        result = await this.handleFileProcessingTask(task);
      } else if (this.capabilities.includes('git-operations') && task.type === 'git') {
        result = await this.handleGitTask(task);
      } else if (this.capabilities.includes('security-scanning') && task.type === 'security') {
        result = await this.handleSecurityTask(task);
      } else if (this.capabilities.includes('general-processing')) {
        result = await this.handleGenericTask(task);
      } else {
        throw new Error(\`Unsupported task type: \${task.type}\`);
      }
      
      const duration = Date.now() - startTime;
      this.activeTasks.delete(taskId);
      
      this.sendMessage('task-completed', {
        taskId,
        agentId: this.agentId,
        result,
        duration,
        taskType: task.type
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.activeTasks.delete(taskId);
      
      this.sendMessage('task-failed', {
        taskId,
        agentId: this.agentId,
        error: error.message,
        duration,
        taskType: task.type
      });
    }
  }

  async handleBuildTask(task) {
    const { action, files, options = {} } = task.params || {};
    
    switch (action) {
      case 'install-dependencies':
        return await this.runCommand('npm install');
      case 'build-project':
        return await this.runCommand('npm run build');
      case 'clean-build':
        return await this.runCommand('npm run clean && npm run build');
      default:
        return await this.runCommand('npm run build');
    }
  }

  async handleTestTask(task) {
    const { action, files, options = {} } = task.params || {};
    
    switch (action) {
      case 'run-unit-tests':
        return await this.runCommand('npm run test:unit');
      case 'run-integration-tests':
        return await this.runCommand('npm run test:integration');
      case 'run-specific-tests':
        const filePattern = files ? files.join(' ') : '';
        return await this.runCommand(\`npm test -- \${filePattern}\`);
      default:
        return await this.runCommand('npm test');
    }
  }

  async handleQualityTask(task) {
    const { action, files } = task.params || {};
    
    switch (action) {
      case 'lint':
        return await this.runCommand('npx eslint . --format json');
      case 'type-check':
        return await this.runCommand('npx tsc --noEmit');
      case 'complexity-analysis':
        return await this.runCommand('npx complexity-report');
      default:
        return await this.runCommand('npx eslint . --format json');
    }
  }

  async handleFileProcessingTask(task) {
    const { action, filePath, options = {} } = task.params || {};
    
    switch (action) {
      case 'validate-json':
        return await this.validateJsonFile(filePath);
      case 'format-markdown':
        return await this.formatMarkdownFile(filePath);
      case 'process-yaml':
        return await this.processYamlFile(filePath);
      default:
        return { message: 'File processed', filePath };
    }
  }

  async handleGitTask(task) {
    const { action, options = {} } = task.params || {};
    
    switch (action) {
      case 'commit':
        const message = options.message || 'Automated commit';
        return await this.runCommand(\`git add . && git commit -m "\${message}"\`);
      case 'create-branch':
        const branchName = options.branch || 'feature/automated';
        return await this.runCommand(\`git checkout -b \${branchName}\`);
      case 'analyze-changes':
        return await this.runCommand('git diff --stat');
      default:
        return await this.runCommand('git status');
    }
  }

  async handleSecurityTask(task) {
    const { action, files } = task.params || {};
    
    switch (action) {
      case 'vulnerability-scan':
        return await this.runCommand('npm audit --json');
      case 'secret-scan':
        return await this.runCommand('npx secret-scan .');
      case 'dependency-check':
        return await this.runCommand('npx audit-ci --config audit-ci.json');
      default:
        return await this.runCommand('npm audit --json');
    }
  }

  async handleGenericTask(task) {
    const { action, command, params = {} } = task.params || {};
    
    if (command) {
      return await this.runCommand(command);
    } else {
      return {
        message: 'Generic task processed',
        action,
        params,
        agentCapabilities: this.capabilities
      };
    }
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          exitCode: error ? error.code : 0,
          stdout,
          stderr,
          command
        });
      });
    });
  }

  async validateJsonFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      JSON.parse(content);
      return { valid: true, message: 'JSON is valid' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async formatMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Simple markdown formatting
      const formatted = content
        .replace(/\\n{3,}/g, '\\n\\n')
        .replace(/^#\\s+/gm, '# ')
        .replace(/^##\\s+/gm, '## ');
      
      await fs.writeFile(filePath, formatted);
      return { formatted: true, message: 'Markdown formatted' };
    } catch (error) {
      return { formatted: false, error: error.message };
    }
  }

  async processYamlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Basic YAML validation
      if (content.includes('---')) {
        return { processed: true, message: 'YAML processed' };
      } else {
        return { processed: false, message: 'Invalid YAML format' };
      }
    } catch (error) {
      return { processed: false, error: error.message };
    }
  }

  async cancelTask(taskId) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      this.sendMessage('task-cancelled', { taskId, agentId: this.agentId });
    }
  }

  async performHealthCheck() {
    const healthStatus = {
      agentId: this.agentId,
      status: 'healthy',
      activeTasks: this.activeTasks.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      capabilities: this.capabilities
    };
    
    this.sendMessage('health-status', healthStatus);
  }

  async shutdown() {
    console.log(\`Agent \${this.agentId} shutting down...\`);
    
    // Cancel active tasks
    for (const taskId of this.activeTasks.keys()) {
      await this.cancelTask(taskId);
    }
    
    this.sendMessage('shutdown-complete', { agentId: this.agentId });
    process.exit(0);
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data, timestamp: Date.now() });
    }
  }
}

// Start the agent
new OrchestrationAgent();
\`;
  }

  setupAgentCommunication(childProcess, agentId, agentType) {
    childProcess.on('message', (message) => {
      this.handleAgentMessage(message, agentId, agentType);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(\`Agent \${agentId} exited with code \${code}, signal \${signal}\`);
      this.handleAgentExit(agentId, agentType, code);
    });

    childProcess.on('error', (error) => {
      console.error(\`Agent \${agentId} error:\`, error.message);
      this.handleAgentError(agentId, agentType, error);
    });
  }

  handleAgentMessage(message, agentId, agentType) {
    const { type, data } = message;
    
    switch (type) {
      case 'ready':
        console.log(\`Agent \${agentId} is ready\`);
        break;
      case 'task-started':
        console.log(\`Task \${data.taskId} started by agent \${agentId}\`);
        break;
      case 'task-completed':
        console.log(\`Task \${data.taskId} completed by agent \${agentId} in \${data.duration}ms\`);
        this.handleTaskCompletion(agentId, agentType, data);
        break;
      case 'task-failed':
        console.error(\`Task \${data.taskId} failed: \${data.error}\`);
        this.handleTaskFailure(agentId, agentType, data);
        break;
      case 'health-status':
        this.updateAgentHealth(agentId, data);
        break;
      case 'error':
        console.error(\`Agent \${agentId} error:\`, data.error);
        break;
    }
  }

  handleTaskCompletion(agentId, agentType, data) {
    this.metrics.tasksProcessed++;
    
    // Mark pooled agent as available
    if (agentType === 'pooled') {
      this.markPooledAgentAvailable(agentId);
    }
    
    // Terminate single-use agent
    if (agentType === 'single-use') {
      this.terminateSingleUseAgent(agentId);
    }
  }

  handleTaskFailure(agentId, agentType, data) {
    this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.tasksProcessed;
    
    // Same cleanup as completion
    this.handleTaskCompletion(agentId, agentType, data);
  }

  handleAgentExit(agentId, agentType, code) {
    this.metrics.agentsTerminated++;
    
    // Remove from tracking
    this.persistentAgents.delete(agentId);
    this.singleUseAgents.delete(agentId);
    
    // Handle pooled agent exit
    for (const [poolName, pool] of this.pooledAgents) {
      if (pool.instances.has(agentId)) {
        pool.instances.delete(agentId);
        break;
      }
    }
  }

  handleAgentError(agentId, agentType, error) {
    console.error(\`Agent \${agentId} (\${agentType}) encountered error:\`, error.message);
    // Could implement restart logic here
  }

  markPooledAgentAvailable(agentId) {
    for (const [poolName, pool] of this.pooledAgents) {
      if (pool.instances.has(agentId)) {
        pool.instances.get(agentId).busy = false;
        break;
      }
    }
  }

  terminateSingleUseAgent(agentId) {
    const agent = this.singleUseAgents.get(agentId);
    if (agent) {
      agent.process.send({ type: 'shutdown' });
      this.singleUseAgents.delete(agentId);
    }
  }

  async routeTask(taskData) {
    const { file, command, action } = taskData;
    
    // Determine task type and route to appropriate agent
    const task = this.createTask(taskData);
    const routingRule = this.findRoutingRule(task);
    
    if (routingRule) {
      await this.executeRoutingRule(routingRule, task);
    } else {
      console.log('No routing rule found for task:', task);
    }
  }

  createTask(taskData) {
    const { file, command, action } = taskData;
    
    // Infer task type from context
    let taskType = 'general';
    
    if (file) {
      if (file.includes('package.json') || file.includes('Dockerfile')) {
        taskType = 'build';
      } else if (file.includes('.test.') || file.includes('.spec.')) {
        taskType = 'test';
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        taskType = 'quality';
      } else if (file.endsWith('.md') || file.endsWith('.json')) {
        taskType = 'file-process';
      }
    }
    
    if (command) {
      if (command.includes('git')) {
        taskType = 'git';
      } else if (command.includes('npm') || command.includes('build')) {
        taskType = 'build';
      } else if (command.includes('test')) {
        taskType = 'test';
      }
    }

    return {
      id: \`task-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
      type: taskType,
      action,
      params: { file, command, action },
      priority: this.getTaskPriority(taskType),
      timestamp: Date.now()
    };
  }

  findRoutingRule(task) {
    const rules = this.config.orchestration.taskRouting.rules;
    
    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, task)) {
        return rule;
      }
    }
    
    return null;
  }

  evaluateCondition(condition, task) {
    try {
      // Simple condition evaluation
      return eval(condition.replace(/task\\./g, 'task.'));
    } catch (error) {
      console.error('Failed to evaluate condition:', condition, error.message);
      return false;
    }
  }

  async executeRoutingRule(rule, task) {
    const { agent: agentName, spawn, distribution } = rule;
    
    if (spawn === 'new') {
      // Spawn new single-use agent
      const agentConfig = this.config.agents.find(a => a.name === agentName);
      if (agentConfig) {
        await this.spawnSingleUseAgent(agentConfig, task);
      }
    } else if (distribution === 'round-robin') {
      // Use pooled agent
      await this.assignTaskToPool(agentName, task);
    } else {
      // Use persistent agent
      await this.assignTaskToPersistentAgent(agentName, task);
    }
  }

  async assignTaskToPersistentAgent(agentName, task) {
    // Find persistent agent
    for (const [agentId, agent] of this.persistentAgents) {
      if (agent.config.name === agentName) {
        // Check if agent can handle more tasks
        const maxTasks = agent.config.maxConcurrentTasks || 1;
        if (agent.activeTasks.size < maxTasks) {
          agent.process.send({
            type: 'execute-task',
            task,
            agentId
          });
          agent.activeTasks.add(task.id);
          return;
        }
      }
    }
    
    console.log(\`No available persistent agent found for: \${agentName}\`);
  }

  async assignTaskToPool(poolName, task) {
    const pool = this.pooledAgents.get(poolName);
    if (!pool) {
      console.error(\`Pool not found: \${poolName}\`);
      return;
    }

    // Find available agent in pool
    for (const [agentId, instance] of pool.instances) {
      if (!instance.busy) {
        instance.busy = true;
        instance.process.send({
          type: 'execute-task',
          task,
          agentId
        });
        return;
      }
    }

    // No available agents, check if we can scale up
    const { maxInstances, scaleUpThreshold } = pool.config.poolConfig;
    if (pool.instances.size < maxInstances && pool.taskQueue.length >= scaleUpThreshold) {
      await this.spawnPooledAgent(pool.config, poolName);
      // Retry task assignment
      await this.assignTaskToPool(poolName, task);
    } else {
      // Queue task
      pool.taskQueue.push(task);
    }
  }

  getTaskPriority(taskType) {
    const priorityMap = {
      'security': 'high',
      'build': 'high', 
      'test': 'medium',
      'quality': 'medium',
      'file-process': 'low',
      'git': 'low'
    };
    
    return priorityMap[taskType] || 'low';
  }

  async startMonitoring() {
    setInterval(() => {
      this.updateMetrics();
      this.performHealthChecks();
      this.manageResources();
    }, 60000); // Every minute
  }

  updateMetrics() {
    this.resourceUsage.activeAgents = 
      this.persistentAgents.size + 
      this.singleUseAgents.size +
      Array.from(this.pooledAgents.values())
        .reduce((sum, pool) => sum + pool.instances.size, 0);

    // Save metrics
    this.saveMetrics();
  }

  performHealthChecks() {
    // Send health check signals to all agents
    for (const [agentId, agent] of this.persistentAgents) {
      agent.process.kill('SIGUSR1'); // Health check signal
    }
  }

  manageResources() {
    // Check resource limits and scale down if needed
    const { totalMemoryLimit, maxConcurrentAgents } = this.config.orchestration.resourceManagement;
    
    if (this.resourceUsage.activeAgents > maxConcurrentAgents) {
      console.log('Resource limit exceeded, scaling down...');
      this.scaleDownAgents();
    }
  }

  scaleDownAgents() {
    // Terminate idle single-use agents first
    for (const [agentId, agent] of this.singleUseAgents) {
      if (agent.process) {
        this.terminateSingleUseAgent(agentId);
        break; // Scale down one at a time
      }
    }
  }

  async cleanup(reason = 'unknown') {
    console.log(\`Cleaning up orchestrator - reason: \${reason}\`);
    
    // Graceful shutdown of all agents
    const shutdownPromises = [];
    
    // Shutdown persistent agents
    for (const [agentId, agent] of this.persistentAgents) {
      shutdownPromises.push(this.shutdownAgent(agent.process, agentId));
    }
    
    // Shutdown pooled agents
    for (const [poolName, pool] of this.pooledAgents) {
      for (const [agentId, instance] of pool.instances) {
        shutdownPromises.push(this.shutdownAgent(instance.process, agentId));
      }
    }
    
    // Shutdown single-use agents
    for (const [agentId, agent] of this.singleUseAgents) {
      shutdownPromises.push(this.shutdownAgent(agent.process, agentId));
    }

    // Wait for graceful shutdown
    await Promise.all(shutdownPromises);
    
    // Save final metrics
    await this.saveMetrics();
    
    console.log('Orchestrator cleanup completed');
  }

  async shutdownAgent(process, agentId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        resolve();
      }, 30000); // 30 second timeout

      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      process.send({ type: 'shutdown' });
    });
  }

  async saveMetrics() {
    try {
      const metricsData = {
        ...this.metrics,
        resourceUsage: this.resourceUsage,
        timestamp: Date.now(),
        agentCounts: {
          persistent: this.persistentAgents.size,
          pooled: Array.from(this.pooledAgents.values())
            .reduce((sum, pool) => sum + pool.instances.size, 0),
          singleUse: this.singleUseAgents.size
        }
      };

      await fs.writeFile('.claude/reports/metrics.json', JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }

  async logActivity(event, tool) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      tool,
      activeAgents: this.resourceUsage.activeAgents
    };

    try {
      await fs.appendFile('.claude/logs/orchestrator.log', JSON.stringify(logEntry) + '\\n');
    } catch (error) {
      console.error('Failed to log activity:', error.message);
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
    case 'route':
      const file = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
      const cmd = args.find(arg => arg.startsWith('--command='))?.split('=')[1];
      const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
      
      await orchestrator.routeTask({ file, command: cmd, action });
      break;
      
    case 'log':
      const event = args.find(arg => arg.startsWith('--event='))?.split('=')[1];
      const tool = args.find(arg => arg.startsWith('--tool='))?.split('=')[1];
      
      await orchestrator.logActivity(event, tool);
      break;
      
    case 'cleanup':
      const reason = args.find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'manual';
      await orchestrator.cleanup(reason);
      break;
      
    default:
      console.log('Usage: orchestrator.js [route|log|cleanup] [options]');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AgentOrchestrator;