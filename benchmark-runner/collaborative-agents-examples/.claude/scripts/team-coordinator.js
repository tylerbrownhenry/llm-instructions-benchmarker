#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class CollaborativeTeamCoordinator extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.activeTeams = new Map();
    this.sharedState = new Map();
    this.syncBarriers = new Map();
    this.agentStates = new Map();
    this.collaborationMetrics = {
      teamsActivated: 0,
      synchronizationEvents: 0,
      consensusReached: 0,
      conflictsResolved: 0
    };
  }

  async initialize() {
    try {
      const configData = await fs.readFile('.claude/settings.json', 'utf8');
      this.config = JSON.parse(configData);
      
      await this.setupSharedResources();
      await this.initializeTeams();
      
      console.log('Collaborative team coordinator initialized');
    } catch (error) {
      console.error('Failed to initialize coordinator:', error.message);
      throw error;
    }
  }

  async setupSharedResources() {
    const sharedDir = '.claude/shared';
    const dirs = [sharedDir, `${sharedDir}/state`, `${sharedDir}/artifacts`, `${sharedDir}/logs`];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might exist
      }
    }

    // Initialize shared state storage
    this.sharedStateFile = `${sharedDir}/state/global-state.json`;
    this.consensusFile = `${sharedDir}/state/consensus.json`;
  }

  async initializeTeams() {
    for (const teamConfig of this.config.agentTeams) {
      await this.prepareTeam(teamConfig);
    }
  }

  async prepareTeam(teamConfig) {
    const teamState = {
      name: teamConfig.name,
      config: teamConfig,
      agents: new Map(),
      sharedState: { ...teamConfig.sharedState },
      syncPoints: new Set(),
      phase: 'idle',
      collaborationHistory: []
    };

    this.activeTeams.set(teamConfig.name, teamState);
    
    // Create shared state file for team
    await this.saveTeamState(teamConfig.name, teamState.sharedState);
  }

  async activateTeam(teamName, trigger) {
    console.log(`Activating team: ${teamName} for trigger: ${trigger}`);
    
    const team = this.activeTeams.get(teamName);
    if (!team) {
      console.error(`Team not found: ${teamName}`);
      return;
    }

    // Determine appropriate workflow
    const workflow = this.determineWorkflow(teamName, trigger);
    if (!workflow) {
      console.log(`No suitable workflow found for team ${teamName}`);
      return;
    }

    // Spawn all team members simultaneously
    await this.spawnTeamMembers(team);
    
    // Execute collaborative workflow
    await this.executeCollaborativeWorkflow(team, workflow, trigger);
  }

  determineWorkflow(teamName, trigger) {
    const workflows = this.config.teamWorkflows;
    
    // Simple workflow selection logic
    if (teamName === 'code-review-team' && trigger.includes('.js')) {
      return workflows['collaborative-code-review'];
    } else if (teamName === 'feature-development-team') {
      return workflows['collaborative-feature-development'];
    } else if (teamName === 'debugging-team') {
      return workflows['collaborative-debugging'];
    }
    
    return null;
  }

  async spawnTeamMembers(team) {
    console.log(`Spawning ${team.config.members.length} team members for ${team.name}`);
    
    const spawnPromises = team.config.members.map(async (memberConfig) => {
      const agentId = `${team.name}-${memberConfig.name}-${Date.now()}`;
      const agentScript = await this.createCollaborativeAgent(memberConfig, team, agentId);
      
      const childProcess = fork(agentScript, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          CLAUDE_AGENT_ID: agentId,
          CLAUDE_TEAM_NAME: team.name,
          CLAUDE_AGENT_CONFIG: JSON.stringify(memberConfig),
          CLAUDE_TEAM_CONFIG: JSON.stringify(team.config),
          CLAUDE_SHARED_STATE_FILE: await this.getTeamStateFile(team.name)
        }
      });

      this.setupAgentCommunication(childProcess, agentId, team.name);
      
      team.agents.set(agentId, {
        process: childProcess,
        config: memberConfig,
        state: 'initializing',
        currentPhase: null,
        contributions: [],
        dependencies: new Set(memberConfig.waitFor || [])
      });

      return agentId;
    });

    await Promise.all(spawnPromises);
    console.log(`All ${team.config.members.length} team members spawned for ${team.name}`);
  }

  async createCollaborativeAgent(memberConfig, team, agentId) {
    const scriptPath = `.claude/scripts/agents/collaborative-${agentId}.js`;
    const scriptContent = this.generateCollaborativeAgentScript(memberConfig, team);
    
    await fs.writeFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, 0o755);
    
    return scriptPath;
  }

  generateCollaborativeAgentScript(memberConfig, team) {
    return `#!/usr/bin/env node

const fs = require('fs').promises;
const { exec } = require('child_process');

class CollaborativeAgent {
  constructor() {
    this.agentId = process.env.CLAUDE_AGENT_ID;
    this.teamName = process.env.CLAUDE_TEAM_NAME;
    this.config = JSON.parse(process.env.CLAUDE_AGENT_CONFIG);
    this.teamConfig = JSON.parse(process.env.CLAUDE_TEAM_CONFIG);
    this.sharedStateFile = process.env.CLAUDE_SHARED_STATE_FILE;
    
    this.expertise = this.config.expertise || [];
    this.role = this.config.role;
    this.waitFor = new Set(this.config.waitFor || []);
    this.provides = this.config.provides || [];
    
    this.localState = {
      findings: {},
      recommendations: {},
      analysis: {},
      consensusVotes: {}
    };
    
    this.setupCollaboration();
  }

  setupCollaboration() {
    process.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.sendMessage('error', {
          error: error.message,
          phase: this.currentPhase,
          agentId: this.agentId
        });
      }
    });

    this.sendMessage('ready', {
      agentId: this.agentId,
      role: this.role,
      expertise: this.expertise,
      provides: this.provides
    });
  }

  async handleMessage(message) {
    const { type, phase, data } = message;
    
    switch (type) {
      case 'start-collaboration':
        await this.startCollaboration(data);
        break;
      case 'sync-point':
        await this.handleSyncPoint(phase, data);
        break;
      case 'peer-contribution':
        await this.handlePeerContribution(data);
        break;
      case 'consensus-request':
        await this.handleConsensusRequest(data);
        break;
      case 'phase-transition':
        await this.handlePhaseTransition(data);
        break;
      default:
        console.log(\`Unknown message type: \${type}\`);
    }
  }

  async startCollaboration(data) {
    this.currentPhase = data.phase;
    this.collaborationContext = data.context;
    
    console.log(\`Agent \${this.role} starting collaboration in phase: \${this.currentPhase}\`);
    
    // Wait for dependencies if any
    if (this.waitFor.size > 0) {
      await this.waitForDependencies();
    }
    
    // Start working on assigned task
    await this.performCollaborativeWork();
  }

  async waitForDependencies() {
    console.log(\`Agent \${this.role} waiting for dependencies: \${Array.from(this.waitFor).join(', ')}\`);
    
    return new Promise((resolve) => {
      const checkDependencies = async () => {
        const sharedState = await this.loadSharedState();
        const completedAgents = Object.keys(sharedState.agentContributions || {});
        
        const dependenciesMet = Array.from(this.waitFor).every(dep => 
          completedAgents.some(agent => agent.includes(dep))
        );
        
        if (dependenciesMet) {
          console.log(\`Dependencies met for agent \${this.role}\`);
          resolve();
        } else {
          setTimeout(checkDependencies, 1000); // Check every second
        }
      };
      
      checkDependencies();
    });
  }

  async performCollaborativeWork() {
    let result;
    
    // Perform role-specific work based on expertise
    switch (this.role) {
      case 'syntax-analysis':
        result = await this.performSyntaxAnalysis();
        break;
      case 'logic-analysis':
        result = await this.performLogicAnalysis();
        break;
      case 'security-analysis':
        result = await this.performSecurityAnalysis();
        break;
      case 'style-analysis':
        result = await this.performStyleAnalysis();
        break;
      case 'integration-analysis':
        result = await this.performIntegrationAnalysis();
        break;
      case 'synthesis':
        result = await this.performSynthesis();
        break;
      case 'requirement-analysis':
        result = await this.performRequirementAnalysis();
        break;
      case 'api-design':
        result = await this.performApiDesign();
        break;
      case 'frontend-design':
        result = await this.performFrontendDesign();
        break;
      case 'backend-design':
        result = await this.performBackendDesign();
        break;
      case 'test-strategy':
        result = await this.performTestStrategy();
        break;
      case 'integration-planning':
        result = await this.performIntegrationPlanning();
        break;
      case 'error-identification':
        result = await this.performErrorIdentification();
        break;
      case 'data-analysis':
        result = await this.performDataAnalysis();
        break;
      case 'execution-tracing':
        result = await this.performExecutionTracing();
        break;
      case 'hypothesis-formation':
        result = await this.performHypothesisFormation();
        break;
      case 'solution-design':
        result = await this.performSolutionDesign();
        break;
      case 'solution-verification':
        result = await this.performSolutionVerification();
        break;
      default:
        result = await this.performGenericAnalysis();
    }
    
    // Share findings with team
    await this.shareFindings(result);
    
    // Participate in consensus if needed
    await this.participateInConsensus(result);
    
    this.sendMessage('work-completed', {
      agentId: this.agentId,
      role: this.role,
      phase: this.currentPhase,
      result
    });
  }

  async performSyntaxAnalysis() {
    const { filePath } = this.collaborationContext;
    
    try {
      const code = await fs.readFile(filePath, 'utf8');
      
      // Perform syntax analysis
      const syntaxIssues = [];
      
      // Check for basic syntax patterns
      if (code.includes('var ')) {
        syntaxIssues.push({ type: 'outdated-syntax', message: 'Use let/const instead of var' });
      }
      
      if (code.match(/function\\s+\\w+\\s*\\(/)) {
        const funcCount = (code.match(/function\\s+\\w+\\s*\\(/g) || []).length;
        syntaxIssues.push({ type: 'info', message: \`Found \${funcCount} function declarations\` });
      }
      
      // Check for missing semicolons
      const lines = code.split('\\n');
      lines.forEach((line, index) => {
        if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
          syntaxIssues.push({ 
            type: 'style', 
            line: index + 1, 
            message: 'Consider adding semicolon' 
          });
        }
      });
      
      return {
        agent: this.role,
        analysis: 'syntax-complete',
        issues: syntaxIssues,
        metrics: {
          linesAnalyzed: lines.length,
          issuesFound: syntaxIssues.length
        }
      };
    } catch (error) {
      return {
        agent: this.role,
        analysis: 'syntax-failed',
        error: error.message
      };
    }
  }

  async performSecurityAnalysis() {
    const { filePath } = this.collaborationContext;
    
    try {
      const code = await fs.readFile(filePath, 'utf8');
      const securityIssues = [];
      
      // Check for potential security issues
      if (code.includes('eval(')) {
        securityIssues.push({ 
          severity: 'high', 
          type: 'code-injection', 
          message: 'Avoid using eval() - potential code injection risk' 
        });
      }
      
      if (code.includes('innerHTML')) {
        securityIssues.push({ 
          severity: 'medium', 
          type: 'xss', 
          message: 'Using innerHTML may lead to XSS vulnerabilities' 
        });
      }
      
      if (code.match(/password.*=.*['"].*['"]/) || code.match(/api.*key.*=.*['"].*['"]/) || code.match(/secret.*=.*['"].*['"]/)) {
        securityIssues.push({ 
          severity: 'critical', 
          type: 'hardcoded-secrets', 
          message: 'Potential hardcoded credentials detected' 
        });
      }
      
      if (code.includes('http://')) {
        securityIssues.push({ 
          severity: 'medium', 
          type: 'insecure-protocol', 
          message: 'Use HTTPS instead of HTTP for secure communication' 
        });
      }
      
      return {
        agent: this.role,
        analysis: 'security-complete',
        vulnerabilities: securityIssues,
        riskLevel: this.calculateRiskLevel(securityIssues),
        recommendations: this.generateSecurityRecommendations(securityIssues)
      };
    } catch (error) {
      return {
        agent: this.role,
        analysis: 'security-failed',
        error: error.message
      };
    }
  }

  async performLogicAnalysis() {
    const sharedState = await this.loadSharedState();
    const syntaxResults = sharedState.agentContributions?.['syntax-reviewer'];
    
    if (!syntaxResults) {
      throw new Error('Syntax analysis results not available');
    }
    
    const { filePath } = this.collaborationContext;
    const code = await fs.readFile(filePath, 'utf8');
    
    const logicIssues = [];
    
    // Analyze logic patterns
    const complexityScore = this.calculateComplexity(code);
    if (complexityScore > 10) {
      logicIssues.push({
        type: 'high-complexity',
        score: complexityScore,
        message: 'Function complexity is high, consider refactoring'
      });
    }
    
    // Check for potential logic errors
    if (code.includes('==') && !code.includes('===')) {
      logicIssues.push({
        type: 'equality-comparison',
        message: 'Use strict equality (===) instead of loose equality (==)'
      });
    }
    
    // Check for unreachable code
    const unreachablePattern = /return[^;]*;[\\s\\S]*?(?=function|$)/g;
    const unreachable = code.match(unreachablePattern);
    if (unreachable) {
      logicIssues.push({
        type: 'unreachable-code',
        message: 'Potential unreachable code detected after return statements'
      });
    }
    
    return {
      agent: this.role,
      analysis: 'logic-complete',
      issues: logicIssues,
      complexity: complexityScore,
      recommendations: this.generateLogicRecommendations(logicIssues)
    };
  }

  async performSynthesis() {
    console.log('Performing synthesis of all team contributions...');
    
    const sharedState = await this.loadSharedState();
    const allContributions = sharedState.agentContributions || {};
    
    // Collect all findings from team members
    const allIssues = [];
    const allRecommendations = [];
    const metrics = {};
    
    Object.values(allContributions).forEach(contribution => {
      if (contribution.issues) allIssues.push(...contribution.issues);
      if (contribution.vulnerabilities) allIssues.push(...contribution.vulnerabilities);
      if (contribution.recommendations) allRecommendations.push(...contribution.recommendations);
      if (contribution.metrics) Object.assign(metrics, contribution.metrics);
    });
    
    // Synthesize findings
    const synthesis = {
      summary: {
        totalIssues: allIssues.length,
        criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
        highIssues: allIssues.filter(i => i.severity === 'high').length,
        mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
        lowIssues: allIssues.filter(i => i.severity === 'low').length
      },
      prioritizedRecommendations: this.prioritizeRecommendations(allRecommendations),
      overallAssessment: this.generateOverallAssessment(allIssues),
      actionPlan: this.generateActionPlan(allIssues, allRecommendations),
      metrics
    };
    
    return {
      agent: this.role,
      analysis: 'synthesis-complete',
      synthesis,
      consensus: await this.buildConsensus(allContributions)
    };
  }

  async performRequirementAnalysis() {
    const { context } = this.collaborationContext;
    
    // Analyze requirements based on context
    const requirements = {
      functional: [],
      nonFunctional: [],
      constraints: []
    };
    
    // Extract requirements from context
    if (context && context.includes('user')) {
      requirements.functional.push('User authentication and authorization');
      requirements.functional.push('User profile management');
    }
    
    if (context && context.includes('api')) {
      requirements.functional.push('RESTful API endpoints');
      requirements.nonFunctional.push('API response time < 200ms');
    }
    
    if (context && context.includes('database')) {
      requirements.functional.push('Data persistence layer');
      requirements.nonFunctional.push('Database transaction consistency');
    }
    
    return {
      agent: this.role,
      analysis: 'requirements-complete',
      requirements,
      testScenarios: this.generateTestScenarios(requirements)
    };
  }

  async performApiDesign() {
    const sharedState = await this.loadSharedState();
    const requirements = sharedState.agentContributions?.['requirements-analyst']?.requirements;
    
    if (!requirements) {
      throw new Error('Requirements not available for API design');
    }
    
    const apiSpec = {
      endpoints: [],
      models: [],
      authentication: 'JWT',
      versioning: 'path-based'
    };
    
    // Generate endpoints based on requirements
    requirements.functional.forEach(req => {
      if (req.includes('user')) {
        apiSpec.endpoints.push({
          path: '/api/v1/users',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'User management endpoints'
        });
      }
      
      if (req.includes('authentication')) {
        apiSpec.endpoints.push({
          path: '/api/v1/auth',
          methods: ['POST'],
          description: 'Authentication endpoint'
        });
      }
    });
    
    return {
      agent: this.role,
      analysis: 'api-design-complete',
      specification: apiSpec,
      dataModels: this.generateDataModels(apiSpec)
    };
  }

  async performErrorIdentification() {
    const { errorContext } = this.collaborationContext;
    
    const errorCatalog = [];
    
    if (errorContext.stackTrace) {
      const stackLines = errorContext.stackTrace.split('\\n');
      stackLines.forEach((line, index) => {
        if (line.includes('Error:')) {
          errorCatalog.push({
            type: 'runtime-error',
            message: line.trim(),
            stackLevel: index,
            severity: 'high'
          });
        }
      });
    }
    
    if (errorContext.logs) {
      errorContext.logs.forEach(log => {
        if (log.includes('ERROR') || log.includes('FATAL')) {
          errorCatalog.push({
            type: 'logged-error',
            message: log,
            severity: log.includes('FATAL') ? 'critical' : 'high'
          });
        }
      });
    }
    
    return {
      agent: this.role,
      analysis: 'error-identification-complete',
      errorCatalog,
      failurePoints: this.identifyFailurePoints(errorCatalog)
    };
  }

  calculateComplexity(code) {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionKeywords = ['if', 'else', 'switch', 'case', 'for', 'while', 'do', '&&', '||', '?'];
    decisionKeywords.forEach(keyword => {
      const regex = new RegExp(\`\\\\b\${keyword}\\\\b\`, 'g');
      const matches = code.match(regex);
      if (matches) complexity += matches.length;
    });
    
    return complexity;
  }

  calculateRiskLevel(issues) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0) return 'medium';
    return 'low';
  }

  generateSecurityRecommendations(issues) {
    const recommendations = [];
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'code-injection':
          recommendations.push('Replace eval() with safer alternatives like JSON.parse() or Function constructor');
          break;
        case 'xss':
          recommendations.push('Use textContent instead of innerHTML, or sanitize input properly');
          break;
        case 'hardcoded-secrets':
          recommendations.push('Move sensitive data to environment variables or secure vaults');
          break;
        case 'insecure-protocol':
          recommendations.push('Update all HTTP URLs to use HTTPS protocol');
          break;
      }
    });
    
    return recommendations;
  }

  async shareFindings(findings) {
    const sharedState = await this.loadSharedState();
    
    if (!sharedState.agentContributions) {
      sharedState.agentContributions = {};
    }
    
    sharedState.agentContributions[this.config.name] = findings;
    
    await this.saveSharedState(sharedState);
    
    // Notify coordinator
    this.sendMessage('findings-shared', {
      agentId: this.agentId,
      role: this.role,
      findings: findings
    });
  }

  async participateInConsensus(findings) {
    // Simple consensus participation
    const consensusItems = this.extractConsensusItems(findings);
    
    if (consensusItems.length > 0) {
      this.sendMessage('consensus-contribution', {
        agentId: this.agentId,
        role: this.role,
        items: consensusItems,
        expertise: this.expertise
      });
    }
  }

  extractConsensusItems(findings) {
    const items = [];
    
    if (findings.issues) {
      findings.issues.forEach(issue => {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          items.push({
            type: 'issue',
            priority: issue.severity,
            description: issue.message,
            vote: 'agree'
          });
        }
      });
    }
    
    return items;
  }

  async loadSharedState() {
    try {
      const stateData = await fs.readFile(this.sharedStateFile, 'utf8');
      return JSON.parse(stateData);
    } catch (error) {
      return {}; // Return empty state if file doesn't exist
    }
  }

  async saveSharedState(state) {
    try {
      await fs.writeFile(this.sharedStateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save shared state:', error.message);
    }
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ 
        type, 
        data, 
        agentId: this.agentId,
        role: this.role,
        timestamp: Date.now() 
      });
    }
  }
}

// Start the collaborative agent
new CollaborativeAgent();
`;
  }

  setupAgentCommunication(childProcess, agentId, teamName) {
    childProcess.on('message', (message) => {
      this.handleAgentMessage(message, agentId, teamName);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`Agent ${agentId} exited with code ${code}`);
      this.handleAgentExit(agentId, teamName);
    });

    childProcess.on('error', (error) => {
      console.error(`Agent ${agentId} error:`, error.message);
    });
  }

  handleAgentMessage(message, agentId, teamName) {
    const { type, data } = message;
    const team = this.activeTeams.get(teamName);
    
    switch (type) {
      case 'ready':
        console.log(`Agent ${data.role} (${agentId}) is ready`);
        this.agentStates.set(agentId, 'ready');
        break;
        
      case 'work-completed':
        console.log(`Agent ${data.role} completed work in phase ${data.phase}`);
        this.handleWorkCompletion(agentId, teamName, data);
        break;
        
      case 'findings-shared':
        console.log(`Agent ${data.role} shared findings`);
        this.handleFindingsShared(agentId, teamName, data);
        break;
        
      case 'consensus-contribution':
        console.log(`Agent ${data.role} contributed to consensus`);
        this.handleConsensusContribution(agentId, teamName, data);
        break;
        
      case 'error':
        console.error(`Agent ${agentId} error:`, data.error);
        break;
    }
  }

  handleWorkCompletion(agentId, teamName, data) {
    const team = this.activeTeams.get(teamName);
    const agent = team.agents.get(agentId);
    
    agent.state = 'completed';
    agent.contributions.push(data.result);
    
    // Check if all agents in current phase are done
    this.checkPhaseCompletion(teamName, data.phase);
  }

  handleFindingsShared(agentId, teamName, data) {
    // Update team shared state
    const team = this.activeTeams.get(teamName);
    if (!team.sharedState.findings) {
      team.sharedState.findings = {};
    }
    
    team.sharedState.findings[data.role] = data.findings;
    this.saveTeamState(teamName, team.sharedState);
  }

  handleConsensusContribution(agentId, teamName, data) {
    // Implement consensus building
    const team = this.activeTeams.get(teamName);
    if (!team.sharedState.consensus) {
      team.sharedState.consensus = { contributions: {} };
    }
    
    team.sharedState.consensus.contributions[data.role] = {
      items: data.items,
      expertise: data.expertise,
      timestamp: Date.now()
    };
    
    this.evaluateConsensus(teamName);
  }

  async executeCollaborativeWorkflow(team, workflow, trigger) {
    console.log(`Executing collaborative workflow: ${workflow.description}`);
    
    // Initialize workflow context
    const workflowContext = {
      trigger,
      phase: workflow.phases[0].name,
      startTime: Date.now()
    };

    // Execute phases in sequence
    for (const phase of workflow.phases) {
      console.log(`Starting phase: ${phase.name}`);
      
      await this.executePhase(team, phase, workflowContext);
      
      // Wait for sync point
      if (phase.syncPoint) {
        await this.waitForSyncPoint(team.name, phase.syncPoint);
      }
    }
    
    console.log(`Collaborative workflow completed for team ${team.name}`);
  }

  async executePhase(team, phase, context) {
    const phaseAgents = team.config.members.filter(member => 
      phase.agents.includes(member.name)
    );

    // Start all agents in this phase
    const startPromises = phaseAgents.map(async (memberConfig) => {
      const agentId = Array.from(team.agents.keys()).find(id => 
        team.agents.get(id).config.name === memberConfig.name
      );
      
      if (agentId) {
        const agent = team.agents.get(agentId);
        agent.process.send({
          type: 'start-collaboration',
          phase: phase.name,
          data: {
            phase: phase.name,
            context: {
              filePath: context.trigger,
              mode: phase.mode,
              ...context
            }
          }
        });
      }
    });

    await Promise.all(startPromises);
  }

  async waitForSyncPoint(teamName, syncPoint) {
    console.log(`Waiting for sync point: ${syncPoint} for team ${teamName}`);
    
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const team = this.activeTeams.get(teamName);
        const allCompleted = Array.from(team.agents.values()).every(agent => 
          agent.state === 'completed' || agent.state === 'ready'
        );
        
        if (allCompleted) {
          console.log(`Sync point ${syncPoint} reached for team ${teamName}`);
          this.collaborationMetrics.synchronizationEvents++;
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      
      checkCompletion();
    });
  }

  checkPhaseCompletion(teamName, phase) {
    const team = this.activeTeams.get(teamName);
    const phaseAgents = Array.from(team.agents.values()).filter(agent => 
      agent.currentPhase === phase
    );
    
    const allCompleted = phaseAgents.every(agent => agent.state === 'completed');
    
    if (allCompleted) {
      console.log(`Phase ${phase} completed for team ${teamName}`);
      this.emit('phase-completed', { teamName, phase });
    }
  }

  evaluateConsensus(teamName) {
    const team = this.activeTeams.get(teamName);
    const consensus = team.sharedState.consensus;
    
    if (!consensus || !consensus.contributions) return;
    
    const contributions = Object.values(consensus.contributions);
    const totalAgents = team.config.members.length;
    
    // Simple consensus: majority agreement
    if (contributions.length >= Math.ceil(totalAgents * 0.6)) {
      console.log(`Consensus reached for team ${teamName}`);
      this.collaborationMetrics.consensusReached++;
      
      // Build final consensus
      this.buildFinalConsensus(teamName, contributions);
    }
  }

  buildFinalConsensus(teamName, contributions) {
    const finalConsensus = {
      timestamp: Date.now(),
      participatingAgents: contributions.length,
      agreements: [],
      recommendations: []
    };
    
    // Aggregate consensus items
    const allItems = contributions.flatMap(c => c.items);
    const itemCounts = {};
    
    allItems.forEach(item => {
      const key = item.description;
      if (!itemCounts[key]) {
        itemCounts[key] = { count: 0, votes: [], item };
      }
      itemCounts[key].count++;
      itemCounts[key].votes.push(item.vote);
    });
    
    // Items with majority support
    Object.values(itemCounts).forEach(({ count, votes, item }) => {
      if (count >= Math.ceil(contributions.length * 0.6)) {
        finalConsensus.agreements.push({
          description: item.description,
          support: count,
          priority: item.priority
        });
      }
    });
    
    const team = this.activeTeams.get(teamName);
    team.sharedState.finalConsensus = finalConsensus;
    
    console.log(`Final consensus built for team ${teamName}:`, finalConsensus);
  }

  async observeCommand(command, teams) {
    console.log(`Observing command: ${command} for teams: ${teams}`);
    
    // Activate debugging team if error-related command
    if (command.includes('error') || command.includes('debug') || command.includes('fail')) {
      await this.activateTeam('debugging-team', command);
    }
  }

  async synchronizeSession(action) {
    console.log(`Synchronizing session - action: ${action}`);
    
    // Graceful shutdown of all active teams
    for (const [teamName, team] of this.activeTeams) {
      await this.shutdownTeam(teamName);
    }
    
    // Save final metrics
    await this.saveMetrics();
  }

  async shutdownTeam(teamName) {
    const team = this.activeTeams.get(teamName);
    if (!team) return;
    
    console.log(`Shutting down team: ${teamName}`);
    
    // Send shutdown signal to all agents
    for (const [agentId, agent] of team.agents) {
      agent.process.send({ type: 'shutdown' });
    }
    
    // Wait for graceful shutdown
    const shutdownPromises = Array.from(team.agents.values()).map(agent => 
      new Promise(resolve => {
        agent.process.on('exit', resolve);
        setTimeout(resolve, 5000); // Force shutdown after 5 seconds
      })
    );
    
    await Promise.all(shutdownPromises);
    console.log(`Team ${teamName} shutdown complete`);
  }

  async getTeamStateFile(teamName) {
    return `.claude/shared/state/${teamName}-state.json`;
  }

  async saveTeamState(teamName, state) {
    const stateFile = await this.getTeamStateFile(teamName);
    try {
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error(`Failed to save team state for ${teamName}:`, error.message);
    }
  }

  async saveMetrics() {
    const metricsData = {
      ...this.collaborationMetrics,
      timestamp: Date.now(),
      activeTeams: Array.from(this.activeTeams.keys()),
      totalAgents: Array.from(this.activeTeams.values())
        .reduce((sum, team) => sum + team.agents.size, 0)
    };

    try {
      await fs.writeFile('.claude/shared/collaboration-metrics.json', 
        JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const coordinator = new CollaborativeTeamCoordinator();
  await coordinator.initialize();
  
  switch (command) {
    case 'activate':
      const team = args.find(arg => arg.startsWith('--team='))?.split('=')[1];
      const trigger = args.find(arg => arg.startsWith('--trigger='))?.split('=')[1];
      
      if (team && trigger) {
        await coordinator.activateTeam(team, trigger);
      }
      break;
      
    case 'observe':
      const cmd = args.find(arg => arg.startsWith('--command='))?.split('=')[1];
      const teams = args.find(arg => arg.startsWith('--teams='))?.split('=')[1];
      
      if (cmd && teams) {
        await coordinator.observeCommand(cmd, teams);
      }
      break;
      
    case 'synchronize':
      const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
      await coordinator.synchronizeSession(action);
      break;
      
    default:
      console.log('Usage: team-coordinator.js [activate|observe|synchronize] [options]');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CollaborativeTeamCoordinator;