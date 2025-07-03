#!/usr/bin/env node

const { createSampleDirectories } = require('./scripts/setup');
const ClaudeSessionRunner = require('./scripts/runner');
const BenchmarkAnalyzer = require('./scripts/analyzer');
const fs = require('fs-extra');
const path = require('path');

class BenchmarkOrchestrator {
  constructor() {
    this.runner = new ClaudeSessionRunner();
    this.analyzer = new BenchmarkAnalyzer();
  }

  async runFullBenchmark(options = {}) {
    console.log('🚀 Starting Claude Code Benchmark Suite');
    console.log('=====================================');
    
    const startTime = Date.now();
    
    try {
      // Step 1: Clear and setup sample directories
      if (!options.skipSetup) {
        console.log('\\n📁 Step 1: Setting up sample directories...');
        
        // Clear existing samples first
        const samplesPath = path.join(__dirname, 'samples');
        if (fs.existsSync(samplesPath)) {
          console.log('   🧹 Clearing existing samples...');
          await fs.remove(samplesPath);
          console.log('   ✅ Existing samples cleared');
        }
        
        await createSampleDirectories();
      } else {
        console.log('\\n📁 Step 1: Skipping setup (--skip-setup flag)');
      }
      
      // Step 2: Initialize runner
      console.log('\\n🤖 Step 2: Initializing Claude Code sessions...');
      await this.runner.initialize();
      
      // Step 3: Run scenarios
      console.log('\\n🎯 Step 3: Running benchmark scenarios...');
      const results = await this.runner.runAllScenarios();
      
      // Step 4: Save results
      console.log('\\n💾 Step 4: Saving results...');
      const resultsFile = await this.runner.saveResults();
      this.runner.printSummary();
      
      // Step 5: Analyze results
      if (!options.skipAnalysis) {
        console.log('\\n📊 Step 5: Analyzing results...');
        await this.analyzer.loadLatestResults();
        const validationResults = await this.analyzer.runValidationTests();
        const comparison = this.analyzer.generateComparison(validationResults);
        const report = this.analyzer.generateReport(comparison, validationResults);
        const reportFile = await this.analyzer.saveReport(report);
        this.analyzer.printSummary(report);
        
        console.log('\\n📄 Files Generated:');
        console.log(`   - Results: ${path.basename(resultsFile)}`);
        console.log(`   - Analysis: ${path.basename(reportFile)}`);
      } else {
        console.log('\\n📊 Step 5: Skipping analysis (--skip-analysis flag)');
      }
      
      // Step 6: Cleanup
      if (options.cleanup) {
        console.log('\\n🧹 Step 6: Cleaning up sample directories...');
        const samplesPath = path.join(__dirname, 'samples');
        if (fs.existsSync(samplesPath)) {
          await fs.remove(samplesPath);
          console.log('   ✅ Sample directories cleaned');
        }
      }
      
      const endTime = Date.now();
      const totalDuration = Math.round((endTime - startTime) / 1000);
      
      console.log('\\n✨ Benchmark Complete!');
      console.log(`   Total Duration: ${totalDuration}s`);
      console.log(`   Scenarios Run: ${results.length}`);
      
      return { results, totalDuration };
      
    } catch (error) {
      console.error('\\n❌ Benchmark failed:', error.message);
      throw error;
    }
  }

  async runSingleScenario(scenarioId, options = {}) {
    console.log(`🎯 Running single scenario: ${scenarioId}`);
    
    try {
      // Setup if needed
      if (!options.skipSetup) {
        // Clear existing samples first
        const samplesPath = path.join(__dirname, 'samples');
        if (fs.existsSync(samplesPath)) {
          await fs.remove(samplesPath);
        }
        await createSampleDirectories();
      }
      
      // Initialize and run
      await this.runner.initialize();
      const result = await this.runner.runSingleScenario(scenarioId);
      await this.runner.saveResults();
      
      // Analyze if requested
      if (!options.skipAnalysis) {
        await this.analyzer.loadLatestResults();
        const validationResults = await this.analyzer.runValidationTests();
        const comparison = this.analyzer.generateComparison(validationResults);
        const report = this.analyzer.generateReport(comparison, validationResults);
        await this.analyzer.saveReport(report);
        this.analyzer.printSummary(report);
      }
      
      console.log(`\\n✅ Scenario ${scenarioId} completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`\\n❌ Scenario ${scenarioId} failed:`, error.message);
      throw error;
    }
  }

  async listScenarios() {
    const configPath = path.join(__dirname, 'config/ClaudeMapper.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('📋 Available Benchmark Scenarios:');
    console.log('');
    
    config.scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. **${scenario.name}** (${scenario.id})`);
      console.log(`   ${scenario.description}`);
      
      if (scenario.claudeFile) {
        console.log(`   Config: ${scenario.claudeFile}`);
      } else if (scenario.claudeFolder) {
        console.log(`   Config Folder: ${scenario.claudeFolder}`);
      } else {
        console.log(`   Config: Not specified`);
      }
      
      console.log('');
    });
    
    console.log('Settings:');
    console.log(`   Parallel Execution: ${config.settings.parallelExecution}`);
    console.log(`   Timeout: ${config.settings.timeoutMinutes} minutes`);
    console.log(`   Cleanup After Run: ${config.settings.cleanupAfterRun}`);
  }

  async getStatus() {
    const samplesPath = path.join(__dirname, 'samples');
    const resultsPath = path.join(__dirname, 'results');
    
    console.log('📊 Benchmark Status:');
    console.log('');
    
    // Check sample directories
    if (fs.existsSync(samplesPath)) {
      const samples = fs.readdirSync(samplesPath);
      console.log(`✅ Sample directories: ${samples.length} found`);
      samples.forEach(sample => console.log(`   - ${sample}`));
    } else {
      console.log('❌ No sample directories found (run setup first)');
    }
    
    console.log('');
    
    // Check results
    if (fs.existsSync(resultsPath)) {
      const resultFiles = fs.readdirSync(resultsPath)
        .filter(file => file.endsWith('.json') && file.startsWith('benchmark-results-'));
      const analysisFiles = fs.readdirSync(resultsPath)
        .filter(file => file.endsWith('.json') && file.startsWith('analysis-report-'));
      
      console.log(`📊 Results: ${resultFiles.length} benchmark runs found`);
      console.log(`📈 Analysis: ${analysisFiles.length} analysis reports found`);
      
      if (resultFiles.length > 0) {
        console.log('   Latest results:');
        resultFiles.slice(-3).forEach(file => console.log(`   - ${file}`));
      }
    } else {
      console.log('❌ No results found');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Parse options
  const options = {
    skipSetup: args.includes('--skip-setup'),
    skipAnalysis: args.includes('--skip-analysis'),
    cleanup: args.includes('--cleanup'),
    scenario: args.find(arg => arg.startsWith('--scenario='))?.split('=')[1],
    prompt: args.find(arg => arg.startsWith('--prompt='))?.split('=')[1]
  };
  
  const orchestrator = new BenchmarkOrchestrator();
  
  try {
    switch (command) {
      case 'run':
      case 'benchmark':
      default:
        if (options.scenario) {
          await orchestrator.runSingleScenario(options.scenario, options);
        } else {
          await orchestrator.runFullBenchmark(options);
        }
        break;
        
      case 'scenario':
        const scenarioId = args[1];
        if (!scenarioId) {
          console.error('❌ Please specify a scenario ID');
          console.log('Use: node benchmark.js scenario <scenario-id>');
          process.exit(1);
        }
        await orchestrator.runSingleScenario(scenarioId, options);
        break;
        
      case 'setup':
        console.log('📁 Setting up sample directories...');
        await createSampleDirectories();
        break;
        
      case 'analyze':
        console.log('📊 Running analysis on latest results...');
        await orchestrator.analyzer.loadLatestResults();
        const validationResults = await orchestrator.analyzer.runValidationTests();
        const comparison = orchestrator.analyzer.generateComparison(validationResults);
        const report = orchestrator.analyzer.generateReport(comparison, validationResults);
        await orchestrator.analyzer.saveReport(report);
        orchestrator.analyzer.printSummary(report);
        break;
        
      case 'list':
        await orchestrator.listScenarios();
        break;
        
      case 'status':
        await orchestrator.getStatus();
        break;
        
      case 'help':
        console.log(`
Claude Code Benchmark Suite

Usage: node benchmark.js [command] [options]

Commands:
  run, benchmark    Run full benchmark suite (default)
  scenario <id>     Run specific scenario only
  setup            Setup sample directories only
  analyze          Analyze latest results only
  list             List available scenarios
  status           Show current benchmark status
  help             Show this help message

Options:
  --skip-setup      Skip sample directory setup
  --skip-analysis   Skip result analysis
  --cleanup         Clean up sample directories after run
  --scenario=<id>   Run specific scenario (alternative to 'scenario' command)
  --prompt=<file>   Use custom prompt file

Examples:
  node benchmark.js                           # Run full benchmark
  node benchmark.js --skip-setup              # Run without setup
  node benchmark.js scenario tdd-strict       # Run TDD scenario only
  node benchmark.js --scenario=minimal        # Run minimal scenario
  node benchmark.js setup                     # Setup only
  node benchmark.js analyze                   # Analyze latest results
  node benchmark.js list                      # List scenarios
  node benchmark.js status                    # Check status

For more information, see the README or visit the project repository.
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Benchmark orchestrator failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BenchmarkOrchestrator;