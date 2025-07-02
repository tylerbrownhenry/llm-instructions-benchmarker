#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const WebSocket = require('ws');
const path = require('path');

class RealtimeCoordinator extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.agentMesh = new Map();
    this.eventBus = new EventEmitter();
    this.sharedState = new Map();
    this.communicationChannels = new Map();
    this.vectorClock = new Map();
    this.eventHistory = [];
    this.consensusQueue = [];
    this.wsServer = null;
    
    this.metrics = {
      eventsProcessed: 0,
      consensusOperations: 0,
      stateUpdates: 0,
      communicationLatency: [],
      systemThroughput: 0
    };
  }

  async initialize() {
    try {
      const configData = await fs.readFile('.claude/settings.json', 'utf8');
      this.config = JSON.parse(configData);
      
      await this.setupCommunicationInfrastructure();
      await this.initializeAgentMesh();
      await this.startRealtimeServices();
      
      console.log('Real-time coordinator initialized');
    } catch (error) {
      console.error('Failed to initialize real-time coordinator:', error.message);
      throw error;
    }
  }

  async setupCommunicationInfrastructure() {
    // Setup WebSocket server for real-time communication
    this.wsServer = new WebSocket.Server({ port: 8080 });
    
    this.wsServer.on('connection', (ws) => {
      ws.on('message', (message) => {
        this.handleRealtimeMessage(JSON.parse(message));
      });
    });

    // Setup event bus for internal communication
    this.eventBus.setMaxListeners(100);
    this.eventBus.on('agent-event', this.handleAgentEvent.bind(this));
    this.eventBus.on('state-change', this.handleStateChange.bind(this));
    this.eventBus.on('consensus-request', this.handleConsensusRequest.bind(this));

    // Initialize shared state partitions
    for (const partition of ['performance', 'security', 'resources', 'user-experience']) {
      this.sharedState.set(partition, new Map());
    }

    // Setup communication channels
    const channels = ['state-changes', 'user-events', 'performance-metrics', 'api-events', 
                     'db-operations', 'security-events', 'ui-events', 'data-streams'];
    
    channels.forEach(channel => {
      this.communicationChannels.set(channel, {
        subscribers: new Set(),
        messageQueue: [],
        lastUpdate: Date.now()
      });
    });
  }

  async initializeAgentMesh() {
    console.log('Initializing agent mesh...');
    
    for (const agentConfig of this.config.agentMesh) {
      await this.spawnRealtimeAgent(agentConfig);
    }

    // Setup inter-agent communication links
    await this.establishCommunicationLinks();
  }

  async spawnRealtimeAgent(agentConfig) {
    const agentId = `${agentConfig.name}-${Date.now()}`;
    
    try {
      const agentScript = await this.createRealtimeAgent(agentConfig, agentId);
      const childProcess = fork(agentScript, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          CLAUDE_AGENT_ID: agentId,
          CLAUDE_AGENT_CONFIG: JSON.stringify(agentConfig),
          CLAUDE_COORDINATOR_PORT: '8080',
          CLAUDE_REALTIME_MODE: 'true'
        }
      });

      this.setupRealtimeAgentCommunication(childProcess, agentId, agentConfig);
      
      this.agentMesh.set(agentId, {
        process: childProcess,
        config: agentConfig,
        state: 'initializing',
        lastHeartbeat: Date.now(),
        eventQueue: [],
        connections: new Set()
      });

      // Initialize vector clock for this agent
      this.vectorClock.set(agentId, 0);
      
      console.log(`Spawned real-time agent: ${agentConfig.name} (${agentId})`);
      return agentId;
    } catch (error) {
      console.error(`Failed to spawn agent ${agentConfig.name}:`, error.message);
      throw error;
    }
  }

  async createRealtimeAgent(agentConfig, agentId) {
    const scriptPath = `.claude/scripts/agents/realtime-${agentId}.js`;
    const scriptContent = this.generateRealtimeAgentScript(agentConfig);
    
    await fs.writeFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, 0o755);
    
    return scriptPath;
  }

  generateRealtimeAgentScript(agentConfig) {
    return `#!/usr/bin/env node

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class RealtimeAgent extends EventEmitter {
  constructor() {
    super();
    this.agentId = process.env.CLAUDE_AGENT_ID;
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.coordinatorPort = process.env.CLAUDE_COORDINATOR_PORT;
    
    this.name = this.config.name;
    this.type = this.config.type;
    this.expertise = this.config.expertise || [];
    this.realtimeCapabilities = this.config.realtimeCapabilities || {};
    this.communicatesWith = this.config.communicatesWith || [];
    this.sharedChannels = this.config.sharedChannels || [];
    
    this.localState = new Map();
    this.eventBuffer = [];
    this.vectorClock = new Map();
    this.peers = new Map();
    
    this.initializeRealtimeCapabilities();
  }

  async initializeRealtimeCapabilities() {
    // Connect to coordinator via WebSocket
    this.ws = new WebSocket(\`ws://localhost:\${this.coordinatorPort}\`);
    
    this.ws.on('open', () => {
      console.log(\`Agent \${this.name} connected to coordinator\`);
      this.sendMessage('agent-ready', {
        agentId: this.agentId,
        name: this.name,
        type: this.type,
        capabilities: this.realtimeCapabilities
      });
      
      this.startRealtimeOperations();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleRealtimeMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error(\`WebSocket error for agent \${this.name}:\`, error.message);
    });

    // Setup IPC for coordinator communication
    process.on('message', (message) => {
      this.handleCoordinatorMessage(message);
    });

    // Send ready signal
    this.sendToCoordinator('ready', {
      agentId: this.agentId,
      name: this.name,
      capabilities: this.realtimeCapabilities
    });
  }

  startRealtimeOperations() {
    // Start capability-specific operations
    if (this.realtimeCapabilities.stateTracking) {
      this.startStateTracking();
    }
    
    if (this.realtimeCapabilities.eventStreaming) {
      this.startEventStreaming();
    }
    
    if (this.realtimeCapabilities.healthMonitoring) {
      this.startHealthMonitoring();
    }
    
    if (this.realtimeCapabilities.performanceMetrics) {
      this.startPerformanceMonitoring();
    }

    // Start heartbeat
    setInterval(() => {
      this.sendHeartbeat();
    }, 1000);
  }

  async handleRealtimeMessage(message) {
    const { type, data, timestamp, sourceAgent } = message;
    
    // Update vector clock
    if (sourceAgent && this.vectorClock.has(sourceAgent)) {
      this.vectorClock.set(sourceAgent, Math.max(
        this.vectorClock.get(sourceAgent), 
        timestamp || Date.now()
      ));
    }
    
    switch (type) {
      case 'stream-event':
        await this.handleStreamEvent(data);
        break;
      case 'state-sync':
        await this.handleStateSync(data);
        break;
      case 'peer-communication':
        await this.handlePeerCommunication(data);
        break;
      case 'consensus-request':
        await this.handleConsensusRequest(data);
        break;
      case 'workflow-trigger':
        await this.handleWorkflowTrigger(data);
        break;
      default:
        console.log(\`Unknown message type: \${type}\`);
    }
  }

  async handleCoordinatorMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'stream-analysis':
        await this.performStreamAnalysis(data);
        break;
      case 'observe-command':
        await this.observeCommand(data);
        break;
      case 'sync-state':
        await this.syncState(data);
        break;
      default:
        console.log(\`Unknown coordinator message: \${type}\`);
    }
  }

  async performStreamAnalysis(data) {
    const { event, file, context } = data;
    let analysisResult;
    
    // Perform analysis based on agent type and expertise
    switch (this.name) {
      case 'frontend-observer':
        analysisResult = await this.analyzeFrontendChanges(file, context);
        break;
      case 'backend-monitor':
        analysisResult = await this.analyzeBackendChanges(file, context);
        break;
      case 'security-sentinel':
        analysisResult = await this.analyzeSecurityImplications(file, context);
        break;
      case 'performance-tracker':
        analysisResult = await this.analyzePerformanceImpact(file, context);
        break;
      case 'database-watcher':
        analysisResult = await this.analyzeDatabaseChanges(file, context);
        break;
      default:
        analysisResult = await this.performGenericAnalysis(file, context);
    }
    
    // Stream results immediately
    this.streamResult(analysisResult);
  }

  async analyzeFrontendChanges(file, context) {
    if (!file.includes('.js') && !file.includes('.jsx') && !file.includes('.ts') && !file.includes('.tsx')) {
      return null;
    }
    
    const analysis = {
      agent: this.name,
      timestamp: Date.now(),
      file,
      findings: []
    };
    
    try {
      const content = await require('fs').promises.readFile(file, 'utf8');
      
      // Real-time React analysis
      if (content.includes('useState') || content.includes('useEffect')) {
        analysis.findings.push({
          type: 'react-hooks',
          message: 'React hooks detected - monitoring state changes',
          impact: 'medium'
        });
      }
      
      if (content.includes('fetch(') || content.includes('axios')) {
        analysis.findings.push({
          type: 'api-calls',
          message: 'API calls detected - coordinating with backend monitor',
          impact: 'high',
          coordinateWith: ['backend-monitor']
        });
      }
      
      if (content.includes('localStorage') || content.includes('sessionStorage')) {
        analysis.findings.push({
          type: 'local-storage',
          message: 'Local storage usage - potential state management concern',
          impact: 'medium'
        });
      }
      
      // Check for performance anti-patterns
      const rerenderTriggers = (content.match(/useEffect\\(/g) || []).length;
      if (rerenderTriggers > 3) {
        analysis.findings.push({
          type: 'performance-concern',
          message: \`Many useEffect hooks (\${rerenderTriggers}) - potential render performance issue\`,
          impact: 'high',
          coordinateWith: ['performance-tracker']
        });
      }
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }

  async analyzeBackendChanges(file, context) {
    if (!file.includes('api') && !file.includes('server') && !file.includes('route')) {
      return null;
    }
    
    const analysis = {
      agent: this.name,
      timestamp: Date.now(),
      file,
      findings: []
    };
    
    try {
      const content = await require('fs').promises.readFile(file, 'utf8');
      
      // API endpoint analysis
      if (content.includes('app.get') || content.includes('app.post') || 
          content.includes('router.')) {
        analysis.findings.push({
          type: 'api-endpoint',
          message: 'API endpoint changes detected',
          impact: 'high',
          coordinateWith: ['frontend-observer', 'security-sentinel']
        });
      }
      
      // Database operations
      if (content.includes('query') || content.includes('find') || 
          content.includes('save') || content.includes('update')) {
        analysis.findings.push({
          type: 'database-operation',
          message: 'Database operations detected',
          impact: 'medium',
          coordinateWith: ['database-watcher']
        });
      }
      
      // Authentication/authorization
      if (content.includes('auth') || content.includes('jwt') || 
          content.includes('token') || content.includes('login')) {
        analysis.findings.push({
          type: 'authentication',
          message: 'Authentication logic changes detected',
          impact: 'critical',
          coordinateWith: ['security-sentinel']
        });
      }
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }

  async analyzeSecurityImplications(file, context) {
    const analysis = {
      agent: this.name,
      timestamp: Date.now(),
      file,
      securityFindings: []
    };
    
    try {
      const content = await require('fs').promises.readFile(file, 'utf8');
      
      // Critical security patterns
      const securityPatterns = [
        { pattern: /eval\\s*\\(/, severity: 'critical', type: 'code-injection' },
        { pattern: /innerHTML\\s*=/, severity: 'high', type: 'xss-risk' },
        { pattern: /password\\s*=\\s*['"][^'"]+['"]/, severity: 'critical', type: 'hardcoded-credential' },
        { pattern: /api[_-]?key\\s*=\\s*['"][^'"]+['"]/, severity: 'critical', type: 'hardcoded-api-key' },
        { pattern: /http:\\/\\//, severity: 'medium', type: 'insecure-protocol' },
        { pattern: /\\$\\{[^}]*\\}/, severity: 'medium', type: 'template-injection-risk' }
      ];
      
      securityPatterns.forEach(({ pattern, severity, type }) => {
        if (pattern.test(content)) {
          analysis.securityFindings.push({
            type,
            severity,
            message: \`Security concern: \${type.replace(/-/g, ' ')}\`,
            pattern: pattern.toString(),
            requiresImmediateAttention: severity === 'critical'
          });
        }
      });
      
      // Check for security headers
      if (file.includes('server') || file.includes('app')) {
        const hasSecurityHeaders = content.includes('helmet') || 
                                 content.includes('cors') ||
                                 content.includes('Content-Security-Policy');
        
        if (!hasSecurityHeaders) {
          analysis.securityFindings.push({
            type: 'missing-security-headers',
            severity: 'medium',
            message: 'Consider adding security headers middleware'
          });
        }
      }
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }

  async analyzePerformanceImpact(file, context) {
    const analysis = {
      agent: this.name,
      timestamp: Date.now(),
      file,
      performanceFindings: []
    };
    
    try {
      const content = await require('fs').promises.readFile(file, 'utf8');
      const lines = content.split('\\n');
      
      // Performance anti-patterns
      if (content.includes('for') || content.includes('while')) {
        const loopCount = (content.match(/for\\s*\\(|while\\s*\\(/g) || []).length;
        if (loopCount > 2) {
          analysis.performanceFindings.push({
            type: 'nested-loops-concern',
            message: \`Multiple loops detected (\${loopCount}) - potential O(n²) complexity\`,
            impact: 'medium'
          });
        }
      }
      
      // Large function detection
      const functionBlocks = content.match(/function[^{]*{[^}]*}/g) || [];
      functionBlocks.forEach((func, index) => {
        const funcLines = func.split('\\n').length;
        if (funcLines > 50) {
          analysis.performanceFindings.push({
            type: 'large-function',
            message: \`Large function detected (\${funcLines} lines) - consider refactoring\`,
            impact: 'low'
          });
        }
      });
      
      // Bundle size impact (for frontend files)
      if (file.includes('.js') || file.includes('.jsx') || file.includes('.ts') || file.includes('.tsx')) {
        const fileSize = content.length;
        if (fileSize > 10000) {
          analysis.performanceFindings.push({
            type: 'large-file',
            message: \`Large file (\${Math.round(fileSize/1000)}KB) - may impact bundle size\`,
            impact: 'medium',
            coordinateWith: ['resource-optimizer']
          });
        }
      }
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }

  async analyzeDatabaseChanges(file, context) {
    if (!file.includes('model') && !file.includes('schema') && 
        !file.includes('migration') && !file.includes('query')) {
      return null;
    }
    
    const analysis = {
      agent: this.name,
      timestamp: Date.now(),
      file,
      databaseFindings: []
    };
    
    try {
      const content = await require('fs').promises.readFile(file, 'utf8');
      
      // Schema changes
      if (content.includes('CREATE TABLE') || content.includes('ALTER TABLE') ||
          content.includes('DROP TABLE')) {
        analysis.databaseFindings.push({
          type: 'schema-change',
          message: 'Database schema modifications detected',
          impact: 'high',
          coordinateWith: ['backend-monitor']
        });
      }
      
      // Query optimization opportunities
      if (content.includes('SELECT *')) {
        analysis.databaseFindings.push({
          type: 'query-optimization',
          message: 'SELECT * queries detected - consider selecting specific columns',
          impact: 'medium'
        });
      }
      
      // Index usage
      if (content.includes('WHERE') && !content.includes('INDEX')) {
        analysis.databaseFindings.push({
          type: 'index-recommendation',
          message: 'WHERE clauses without indexes - consider adding indexes',
          impact: 'medium'
        });
      }
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }

  streamResult(result) {
    if (!result) return;
    
    // Immediately stream result to coordinator and peers
    this.sendMessage('stream-result', {
      agentId: this.agentId,
      result,
      timestamp: Date.now(),
      vectorClock: Object.fromEntries(this.vectorClock)
    });
    
    // Coordinate with specified agents
    if (result.findings || result.securityFindings || result.performanceFindings || result.databaseFindings) {
      const findings = result.findings || result.securityFindings || result.performanceFindings || result.databaseFindings;
      findings.forEach(finding => {
        if (finding.coordinateWith) {
          finding.coordinateWith.forEach(peerAgent => {
            this.sendToPeer(peerAgent, 'coordinate-analysis', {
              sourceAgent: this.name,
              finding,
              originalFile: result.file,
              context: result
            });
          });
        }
      });
    }
  }

  startStateTracking() {
    setInterval(() => {
      this.trackState();
    }, 100); // Track state every 100ms
  }

  startEventStreaming() {
    setInterval(() => {
      this.processEventBuffer();
    }, 50); // Process events every 50ms
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.monitorHealth();
    }, 5000); // Health check every 5 seconds
  }

  startPerformanceMonitoring() {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 1000); // Collect metrics every second
  }

  trackState() {
    const stateSnapshot = {
      timestamp: Date.now(),
      agentId: this.agentId,
      localState: Object.fromEntries(this.localState),
      eventBufferSize: this.eventBuffer.length,
      vectorClock: Object.fromEntries(this.vectorClock)
    };
    
    this.sendMessage('state-update', stateSnapshot);
  }

  processEventBuffer() {
    if (this.eventBuffer.length === 0) return;
    
    const events = this.eventBuffer.splice(0, 10); // Process up to 10 events
    events.forEach(event => {
      this.sendMessage('event-processed', {
        agentId: this.agentId,
        event,
        timestamp: Date.now()
      });
    });
  }

  monitorHealth() {
    const healthStatus = {
      agentId: this.agentId,
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      eventProcessingRate: this.eventBuffer.length / 5, // Events per second
      peerConnections: this.peers.size
    };
    
    this.sendMessage('health-update', healthStatus);
  }

  collectPerformanceMetrics() {
    const metrics = {
      agentId: this.agentId,
      timestamp: Date.now(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      eventLatency: this.calculateEventLatency(),
      communicationLatency: this.calculateCommunicationLatency()
    };
    
    this.sendMessage('performance-metrics', metrics);
  }

  calculateEventLatency() {
    if (this.eventBuffer.length === 0) return 0;
    const now = Date.now();
    const avgLatency = this.eventBuffer.reduce((sum, event) => 
      sum + (now - event.timestamp), 0) / this.eventBuffer.length;
    return avgLatency;
  }

  calculateCommunicationLatency() {
    // Simple ping-pong latency measurement
    return Math.random() * 10; // Simulated latency
  }

  sendHeartbeat() {
    this.sendMessage('heartbeat', {
      agentId: this.agentId,
      timestamp: Date.now(),
      vectorClock: Object.fromEntries(this.vectorClock)
    });
  }

  sendMessage(type, data) {
    const message = {
      type,
      data,
      agentId: this.agentId,
      timestamp: Date.now()
    };
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendToCoordinator(type, data) {
    if (process.send) {
      process.send({ type, data, agentId: this.agentId });
    }
  }

  sendToPeer(peerAgent, type, data) {
    this.sendMessage('peer-message', {
      targetAgent: peerAgent,
      messageType: type,
      messageData: data,
      sourceAgent: this.agentId
    });
  }
}

// Start the real-time agent
new RealtimeAgent();
`;
  }

  setupRealtimeAgentCommunication(childProcess, agentId, agentConfig) {
    childProcess.on('message', (message) => {
      this.handleAgentMessage(message, agentId);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`Real-time agent ${agentId} exited with code ${code}`);
      this.handleAgentExit(agentId);
    });

    childProcess.on('error', (error) => {
      console.error(`Real-time agent ${agentId} error:`, error.message);
    });
  }

  async establishCommunicationLinks() {
    // Set up peer-to-peer communication links based on configuration
    for (const [agentId, agent] of this.agentMesh) {
      const communicatesWith = agent.config.communicatesWith || [];
      
      communicatesWith.forEach(peerName => {
        const peerAgent = Array.from(this.agentMesh.values())
          .find(a => a.config.name === peerName);
        
        if (peerAgent) {
          agent.connections.add(peerAgent);
        }
      });
    }
  }

  async startRealtimeServices() {
    // Start real-time monitoring and coordination services
    this.startMetricsCollection();
    this.startConsensusService();
    this.startEventProcessing();
    
    console.log('Real-time services started');
  }

  startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 250); // Collect metrics every 250ms
  }

  startConsensusService() {
    setInterval(() => {
      this.processConsensusQueue();
    }, 1000); // Process consensus every second
  }

  startEventProcessing() {
    setInterval(() => {
      this.processEventHistory();
    }, 100); // Process events every 100ms
  }

  handleRealtimeMessage(message) {
    const { type, data, agentId } = message;
    
    switch (type) {
      case 'agent-ready':
        this.handleAgentReady(agentId, data);
        break;
      case 'stream-result':
        this.handleStreamResult(agentId, data);
        break;
      case 'state-update':
        this.handleStateUpdate(agentId, data);
        break;
      case 'health-update':
        this.handleHealthUpdate(agentId, data);
        break;
      case 'performance-metrics':
        this.handlePerformanceMetrics(agentId, data);
        break;
      case 'peer-message':
        this.handlePeerMessage(data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(agentId, data);
        break;
    }
  }

  handleAgentMessage(message, agentId) {
    const { type, data } = message;
    
    switch (type) {
      case 'ready':
        console.log(`Agent ${agentId} is ready for real-time coordination`);
        this.agentMesh.get(agentId).state = 'ready';
        break;
    }
  }

  handleStreamResult(agentId, data) {
    const { result, timestamp } = data;
    
    // Update metrics
    this.metrics.eventsProcessed++;
    
    // Add to event history with vector clock
    this.eventHistory.push({
      agentId,
      result,
      timestamp,
      vectorClock: data.vectorClock || {}
    });
    
    // Trigger real-time coordination if needed
    this.triggerRealtimeCoordination(agentId, result);
    
    console.log(`Received stream result from ${agentId}:`, result.agent || agentId);
  }

  handleStateUpdate(agentId, data) {
    // Update distributed state
    const agent = this.agentMesh.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      
      // Update shared state partition
      const partition = this.determineStatePartition(data);
      if (partition) {
        this.sharedState.get(partition).set(agentId, data);
        this.metrics.stateUpdates++;
      }
    }
  }

  handleHealthUpdate(agentId, data) {
    const agent = this.agentMesh.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.healthStatus = data;
      
      // Check for health issues
      if (data.status !== 'healthy') {
        this.handleUnhealthyAgent(agentId, data);
      }
    }
  }

  handlePerformanceMetrics(agentId, data) {
    // Update performance metrics
    if (data.communicationLatency) {
      this.metrics.communicationLatency.push(data.communicationLatency);
      
      // Keep only last 100 measurements
      if (this.metrics.communicationLatency.length > 100) {
        this.metrics.communicationLatency.shift();
      }
    }
    
    // Update throughput calculation
    this.metrics.systemThroughput = this.calculateSystemThroughput();
  }

  handlePeerMessage(data) {
    const { targetAgent, messageType, messageData, sourceAgent } = data;
    
    // Route message to target agent
    const targetAgentEntry = Array.from(this.agentMesh.entries())
      .find(([id, agent]) => agent.config.name === targetAgent);
    
    if (targetAgentEntry) {
      const [targetId, targetAgentInfo] = targetAgentEntry;
      targetAgentInfo.process.send({
        type: 'peer-communication',
        data: {
          sourceAgent,
          messageType,
          data: messageData
        }
      });
    }
  }

  handleHeartbeat(agentId, data) {
    const agent = this.agentMesh.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      
      // Update vector clock
      if (data.vectorClock) {
        Object.entries(data.vectorClock).forEach(([agentName, clock]) => {
          const currentClock = this.vectorClock.get(agentName) || 0;
          this.vectorClock.set(agentName, Math.max(currentClock, clock));
        });
      }
    }
  }

  triggerRealtimeCoordination(agentId, result) {
    // Check if coordination is needed based on result
    const coordinationNeeded = this.assessCoordinationNeeds(result);
    
    if (coordinationNeeded.length > 0) {
      this.initiateCoordination(agentId, result, coordinationNeeded);
    }
  }

  assessCoordinationNeeds(result) {
    const coordinationNeeded = [];
    
    // Check for findings that require coordination
    const allFindings = [
      ...(result.findings || []),
      ...(result.securityFindings || []),
      ...(result.performanceFindings || []),
      ...(result.databaseFindings || [])
    ];
    
    allFindings.forEach(finding => {
      if (finding.coordinateWith) {
        coordinationNeeded.push(...finding.coordinateWith);
      }
      
      if (finding.impact === 'critical' || finding.severity === 'critical') {
        // Critical findings need immediate coordination
        coordinationNeeded.push('security-sentinel', 'performance-tracker');
      }
    });
    
    return [...new Set(coordinationNeeded)]; // Remove duplicates
  }

  initiateCoordination(sourceAgentId, result, targetAgents) {
    console.log(`Initiating coordination from ${sourceAgentId} to:`, targetAgents);
    
    targetAgents.forEach(targetAgentName => {
      const targetAgent = Array.from(this.agentMesh.entries())
        .find(([id, agent]) => agent.config.name === targetAgentName);
      
      if (targetAgent) {
        const [targetId, targetAgentInfo] = targetAgent;
        
        // Send coordination message
        this.sendRealtimeMessage(targetId, 'coordination-request', {
          sourceAgent: sourceAgentId,
          result,
          urgency: this.calculateUrgency(result),
          timestamp: Date.now()
        });
      }
    });
  }

  calculateUrgency(result) {
    const criticalFindings = [
      ...(result.findings || []),
      ...(result.securityFindings || []),
      ...(result.performanceFindings || []),
      ...(result.databaseFindings || [])
    ].filter(finding => 
      finding.impact === 'critical' || 
      finding.severity === 'critical' ||
      finding.requiresImmediateAttention
    );
    
    return criticalFindings.length > 0 ? 'high' : 'medium';
  }

  sendRealtimeMessage(agentId, type, data) {
    const agent = this.agentMesh.get(agentId);
    if (agent && agent.process) {
      agent.process.send({
        type,
        data,
        timestamp: Date.now()
      });
    }
  }

  async streamAnalysis(event, file) {
    console.log(`Streaming analysis for event: ${event}, file: ${file}`);
    
    // Trigger real-time analysis workflow
    const workflow = this.config.realtimeWorkflows.find(w => w.name === 'live-code-analysis');
    
    if (workflow) {
      await this.executeRealtimeWorkflow(workflow, { event, file });
    }
  }

  async executeRealtimeWorkflow(workflow, context) {
    console.log(`Executing real-time workflow: ${workflow.name}`);
    
    const participants = workflow.participants;
    const startTime = Date.now();
    
    // Send workflow trigger to all participants
    participants.forEach(participantName => {
      const participant = Array.from(this.agentMesh.entries())
        .find(([id, agent]) => agent.config.name === participantName);
      
      if (participant) {
        const [participantId, participantInfo] = participant;
        participantInfo.process.send({
          type: 'stream-analysis',
          data: context
        });
      }
    });
  }

  async observeCommand(command, teams) {
    console.log(`Observing command: ${command}`);
    
    // Broadcast command observation to relevant agents
    for (const [agentId, agent] of this.agentMesh) {
      if (agent.config.realtimeCapabilities.eventStreaming) {
        agent.process.send({
          type: 'observe-command',
          data: { command, timestamp: Date.now() }
        });
      }
    }
  }

  async syncState(action) {
    console.log(`Synchronizing state - action: ${action}`);
    
    // Initiate consensus for final state synchronization
    const consensusData = {
      action,
      timestamp: Date.now(),
      systemState: this.gatherSystemState(),
      agentStates: this.gatherAgentStates()
    };
    
    await this.initiateConsensus('final-sync', consensusData);
    
    // Graceful shutdown of all agents
    await this.shutdownAllAgents();
  }

  gatherSystemState() {
    const systemState = {};
    
    this.sharedState.forEach((partition, partitionName) => {
      systemState[partitionName] = Object.fromEntries(partition);
    });
    
    return systemState;
  }

  gatherAgentStates() {
    const agentStates = {};
    
    this.agentMesh.forEach((agent, agentId) => {
      agentStates[agentId] = {
        name: agent.config.name,
        state: agent.state,
        lastHeartbeat: agent.lastHeartbeat,
        healthStatus: agent.healthStatus
      };
    });
    
    return agentStates;
  }

  async initiateConsensus(type, data) {
    this.consensusQueue.push({
      type,
      data,
      timestamp: Date.now(),
      votes: new Map(),
      status: 'pending'
    });
    
    this.metrics.consensusOperations++;
  }

  processConsensusQueue() {
    const pendingConsensus = this.consensusQueue.filter(c => c.status === 'pending');
    
    pendingConsensus.forEach(consensus => {
      const quorum = Math.ceil(this.agentMesh.size * 0.51);
      
      if (consensus.votes.size >= quorum) {
        consensus.status = 'completed';
        console.log(`Consensus reached for: ${consensus.type}`);
      } else if (Date.now() - consensus.timestamp > 5000) {
        consensus.status = 'timeout';
        console.log(`Consensus timeout for: ${consensus.type}`);
      }
    });
  }

  collectSystemMetrics() {
    const now = Date.now();
    
    // Calculate average communication latency
    const avgLatency = this.metrics.communicationLatency.length > 0 
      ? this.metrics.communicationLatency.reduce((a, b) => a + b, 0) / this.metrics.communicationLatency.length
      : 0;
    
    // Update metrics
    this.metrics.timestamp = now;
    this.metrics.avgCommunicationLatency = avgLatency;
    this.metrics.activeAgents = this.agentMesh.size;
    this.metrics.consensusQueueSize = this.consensusQueue.length;
  }

  calculateSystemThroughput() {
    const timeWindow = 10000; // 10 seconds
    const now = Date.now();
    
    const recentEvents = this.eventHistory.filter(event => 
      now - event.timestamp < timeWindow
    );
    
    return recentEvents.length / (timeWindow / 1000); // Events per second
  }

  determineStatePartition(data) {
    // Simple partitioning strategy based on data type
    if (data.securityFindings || data.agentId?.includes('security')) {
      return 'security';
    } else if (data.performanceFindings || data.agentId?.includes('performance')) {
      return 'performance';
    } else if (data.memoryUsage || data.cpuUsage) {
      return 'resources';
    } else {
      return 'user-experience';
    }
  }

  handleUnhealthyAgent(agentId, healthData) {
    console.warn(`Agent ${agentId} is unhealthy:`, healthData);
    
    // Could implement recovery strategies here
    // For now, just log the issue
  }

  handleAgentExit(agentId) {
    console.log(`Agent ${agentId} has exited`);
    
    // Clean up agent references
    this.agentMesh.delete(agentId);
    this.vectorClock.delete(agentId);
    
    // Remove from shared state partitions
    this.sharedState.forEach(partition => {
      partition.delete(agentId);
    });
  }

  async shutdownAllAgents() {
    console.log('Shutting down all real-time agents...');
    
    const shutdownPromises = Array.from(this.agentMesh.values()).map(agent => 
      new Promise(resolve => {
        agent.process.on('exit', resolve);
        agent.process.send({ type: 'shutdown' });
        setTimeout(resolve, 5000); // Force timeout
      })
    );
    
    await Promise.all(shutdownPromises);
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    console.log('All agents shut down');
  }

  async saveMetrics() {
    try {
      await fs.writeFile('.claude/shared/realtime-metrics.json', 
        JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const coordinator = new RealtimeCoordinator();
  await coordinator.initialize();
  
  switch (command) {
    case 'stream':
      const event = args.find(arg => arg.startsWith('--event='))?.split('=')[1];
      const file = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
      
      if (event && file) {
        await coordinator.streamAnalysis(event, file);
      }
      break;
      
    case 'observe':
      const cmd = args.find(arg => arg.startsWith('--command='))?.split('=')[1];
      const teams = args.find(arg => arg.startsWith('--teams='))?.split('=')[1];
      
      if (cmd) {
        await coordinator.observeCommand(cmd, teams);
      }
      break;
      
    case 'sync':
      const action = args.find(arg => arg.startsWith('--event='))?.split('=')[1];
      await coordinator.syncState(action);
      break;
      
    default:
      console.log('Usage: realtime-coordinator.js [stream|observe|sync] [options]');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RealtimeCoordinator;