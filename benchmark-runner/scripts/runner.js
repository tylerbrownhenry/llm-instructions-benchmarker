#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '../config/ClaudeMapper.json');
const PROMPT_PATH = path.join(__dirname, '../config/Prompt.md');
const SAMPLES_PATH = path.join(__dirname, '../samples');
const RESULTS_PATH = path.join(__dirname, '../results');

class ClaudeSessionRunner {
  constructor() {
    this.config = null;
    this.prompt = '';
    this.results = [];
    this.runId = new Date().toISOString().replace(/[:.]/g, '-');
    this.runDir = null;
  }

  async initialize() {
    // Load configuration
    this.config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    // Load default prompt
    this.defaultPrompt = fs.readFileSync(PROMPT_PATH, 'utf8');
    
    // Ensure results directory exists
    await fs.ensureDir(RESULTS_PATH);
    
    // Create run-specific directory
    this.runDir = path.join(RESULTS_PATH, `run-${this.runId}`);
    await fs.ensureDir(this.runDir);
    
    console.log('🤖 Claude Code Session Runner initialized');
    console.log(`📋 Found ${this.config.scenarios.length} scenarios to run`);
    console.log(`📁 Run directory: ${this.runDir}`);
  }

  async spawnClaudeSession(projectPath, scenarioId, customPrompt = null) {
    return new Promise(async (resolve, reject) => {
      console.log(`🚀 Starting Claude Code session for ${scenarioId}...`);
      
      const startTime = Date.now();
      const logFile = path.join(this.runDir, `${scenarioId}-session.log`);
      const changeLogFile = path.join(this.runDir, `${scenarioId}-changes.log`);
      const logStream = fs.createWriteStream(logFile);
      const changeLogStream = fs.createWriteStream(changeLogFile);
      
      // Capture initial git state
      const { spawn: gitSpawn } = require('child_process');
      const captureGitState = (label) => {
        return new Promise((resolve) => {
          const gitProcess = gitSpawn('git', ['status', '--porcelain'], { cwd: projectPath });
          let gitOutput = '';
          
          gitProcess.stdout.on('data', (data) => {
            gitOutput += data.toString();
          });
          
          gitProcess.on('close', () => {
            changeLogStream.write(`\n=== ${label} ===\n`);
            changeLogStream.write(`Timestamp: ${new Date().toISOString()}\n`);
            changeLogStream.write(`Git Status:\n${gitOutput}\n`);
            resolve(gitOutput);
          });
        });
      };
      
      // Capture initial state
      await captureGitState('BEFORE Claude Session');
      changeLogStream.write(`\n=== SCENARIO: ${scenarioId} ===\n`);
      
      // Spawn Claude Code process
      const claudeProcess = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectPath,
        env: { ...process.env }
      });

      let outputBuffer = '';
      let errorBuffer = '';
      let sessionCompleted = false;
      
      // Send prompt via stdin (use custom prompt if provided)
      const promptToUse = customPrompt || this.defaultPrompt;
      claudeProcess.stdin.write(promptToUse);
      claudeProcess.stdin.end();
      
      // Handle stdout
      claudeProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputBuffer += chunk;
        logStream.write(`[STDOUT] ${chunk}`);
        console.log(`[DEBUG ${scenarioId}] STDOUT:`, chunk.trim());
        
        
        // Look for completion indicators
        if (chunk.includes('Task completed') || chunk.includes('✓') || chunk.includes('Generated with')) {
          sessionCompleted = true;
        }
      });
      
      // Handle stderr
      claudeProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorBuffer += chunk;
        logStream.write(`[STDERR] ${chunk}`);
        console.log(`[DEBUG ${scenarioId}] STDERR:`, chunk.trim());
      });
      
      console.log(`📝 Prompt sent to ${scenarioId} via command line`);
      
      // Set timeout
      const timeout = setTimeout(() => {
        console.log(`⏰ Timeout reached for ${scenarioId}, terminating session...`);
        claudeProcess.kill('SIGTERM');
        reject(new Error(`Session timeout for ${scenarioId}`));
      }, this.config.settings.timeoutMinutes * 60 * 1000);
      
      // Handle process completion
      claudeProcess.on('close', async (code) => {
        clearTimeout(timeout);
        logStream.end();
        
        // Capture final git state and generate diff
        await captureGitState('AFTER Claude Session');
        
        // Generate diff showing all changes made by Claude (excluding package-lock.json)
        const diffProcess = gitSpawn('git', ['diff', 'HEAD', '--', '.', ':(exclude)package-lock.json'], { cwd: projectPath });
        let diffOutput = '';
        
        diffProcess.stdout.on('data', (data) => {
          diffOutput += data.toString();
        });
        
        diffProcess.on('close', () => {
          changeLogStream.write(`\n=== CHANGES MADE BY CLAUDE ===\n`);
          if (diffOutput.trim()) {
            changeLogStream.write(diffOutput);
          } else {
            changeLogStream.write('No changes detected\n');
          }
          
          // Also show list of modified files
          const statusProcess = gitSpawn('git', ['diff', '--name-status', 'HEAD'], { cwd: projectPath });
          let statusOutput = '';
          
          statusProcess.stdout.on('data', (data) => {
            statusOutput += data.toString();
          });
          
          statusProcess.on('close', () => {
            changeLogStream.write(`\n=== MODIFIED FILES ===\n`);
            if (statusOutput) {
              // Filter out package-lock.json from the file list display
              const filteredStatus = statusOutput.split('\n')
                .filter(line => !line.includes('package-lock.json'))
                .join('\n');
              changeLogStream.write(filteredStatus || 'No relevant files modified\n');
            } else {
              changeLogStream.write('No files modified\n');
            }
            changeLogStream.end();
          });
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const result = {
          scenarioId,
          projectPath,
          startTime,
          endTime,
          duration,
          exitCode: code,
          completed: sessionCompleted,
          outputLength: outputBuffer.length,
          errorLength: errorBuffer.length,
          logFile,
          changeLogFile
        };
        
        console.log(`${code === 0 ? '✅' : '❌'} Session ${scenarioId} completed in ${Math.round(duration/1000)}s`);
        resolve(result);
      });
      
      claudeProcess.on('error', (error) => {
        clearTimeout(timeout);
        logStream.end();
        console.error(`❌ Error running session ${scenarioId}:`, error.message);
        reject(error);
      });
    });
  }

  async runSingleScenario(scenarioId) {
    const scenario = this.config.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }
    
    const projectPath = path.join(SAMPLES_PATH, scenarioId);
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Sample directory for ${scenarioId} not found. Run setup.js first.`);
    }
    
    try {
      // Check if scenario has a custom prompt file
      let customPrompt = null;
      if (scenario.claudeFolder) {
        // Look for a prompt.md file in the scenario directory
        const promptPath = path.join(projectPath, 'prompt.md');
        if (fs.existsSync(promptPath)) {
          customPrompt = fs.readFileSync(promptPath, 'utf8');
          console.log(`📝 Using custom prompt for ${scenarioId}`);
        }
      }
      
      const result = await this.spawnClaudeSession(projectPath, scenarioId, customPrompt);
      this.results.push(result);
      return result;
    } catch (error) {
      console.error(`Failed to run scenario ${scenarioId}:`, error.message);
      throw error;
    }
  }

  async runAllScenarios() {
    console.log('🎯 Running all benchmark scenarios...');
    
    if (this.config.settings.parallelExecution) {
      // Run scenarios in parallel
      const promises = this.config.scenarios.map(scenario => 
        this.runSingleScenario(scenario.id).catch(error => ({
          scenarioId: scenario.id,
          error: error.message
        }))
      );
      
      const results = await Promise.all(promises);
      this.results = results.filter(r => !r.error);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.warn(`⚠️  ${errors.length} scenarios failed`);
        errors.forEach(e => console.warn(`   - ${e.scenarioId}: ${e.error}`));
      }
    } else {
      // Run scenarios sequentially
      for (const scenario of this.config.scenarios) {
        try {
          await this.runSingleScenario(scenario.id);
          
          // Add delay between sessions
          if (scenario !== this.config.scenarios[this.config.scenarios.length - 1]) {
            console.log('⏱️  Waiting 5 seconds before next session...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.warn(`⚠️  Skipping ${scenario.id} due to error: ${error.message}`);
        }
      }
    }
    
    return this.results;
  }

  async saveResults() {
    const resultsFile = path.join(this.runDir, 'benchmark-results.json');
    
    const summary = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      totalScenarios: this.config.scenarios.length,
      completedScenarios: this.results.length,
      results: this.results,
      config: this.config
    };
    
    await fs.writeJson(resultsFile, summary, { spaces: 2 });
    console.log(`💾 Results saved to: ${resultsFile}`);
    
    return resultsFile;
  }

  printSummary() {
    console.log('\\n📊 Benchmark Summary:');
    console.log(`   Total scenarios: ${this.config.scenarios.length}`);
    console.log(`   Completed: ${this.results.length}`);
    console.log(`   Failed: ${this.config.scenarios.length - this.results.length}`);
    
    if (this.results.length > 0) {
      const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
      console.log(`   Average duration: ${Math.round(avgDuration/1000)}s`);
      
      console.log('\\n📋 Individual Results:');
      this.results.forEach(result => {
        const status = result.completed ? '✅' : '⚠️ ';
        console.log(`   ${status} ${result.scenarioId}: ${Math.round(result.duration/1000)}s`);
      });
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const scenarioId = args[1];
  
  const runner = new ClaudeSessionRunner();
  
  try {
    await runner.initialize();
    
    switch (command) {
      case 'scenario':
        if (!scenarioId) {
          console.error('❌ Please specify a scenario ID');
          process.exit(1);
        }
        await runner.runSingleScenario(scenarioId);
        break;
        
      case 'all':
      default:
        await runner.runAllScenarios();
        break;
        
      case 'list':
        console.log('📋 Available scenarios:');
        runner.config.scenarios.forEach(s => {
          console.log(`   - ${s.id}: ${s.name}`);
        });
        return;
        
      case 'help':
        console.log(`
Claude Code Benchmark Runner Usage:

Commands:
  all                    Run all scenarios (default)
  scenario <id>         Run specific scenario
  list                  List available scenarios
  help                  Show this help message

Examples:
  node runner.js                    # Run all scenarios
  node runner.js scenario tdd-strict  # Run TDD scenario only
  node runner.js list               # List scenarios
        `);
        return;
    }
    
    await runner.saveResults();
    runner.printSummary();
    
  } catch (error) {
    console.error('❌ Runner failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ClaudeSessionRunner;