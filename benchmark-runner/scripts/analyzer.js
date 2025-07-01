#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const validationTests = require('../config/ValidationTests');

const RESULTS_PATH = path.join(__dirname, '../results');
const SAMPLES_PATH = path.join(__dirname, '../samples');
const TEMPLATE_PATH = path.join(__dirname, '../templates/react-app');

class BenchmarkAnalyzer {
  constructor() {
    this.results = null;
    this.analysis = {};
    this.runDir = null;
  }

  async loadLatestResults() {
    // Find the latest run directory
    const runDirs = fs.readdirSync(RESULTS_PATH)
      .filter(dir => dir.startsWith('run-') && fs.statSync(path.join(RESULTS_PATH, dir)).isDirectory())
      .sort()
      .reverse();
    
    if (runDirs.length === 0) {
      throw new Error('No benchmark run directories found. Run the benchmark first.');
    }
    
    const latestRunDir = path.join(RESULTS_PATH, runDirs[0]);
    const resultsFile = path.join(latestRunDir, 'benchmark-results.json');
    
    if (!fs.existsSync(resultsFile)) {
      throw new Error(`No benchmark results found in ${runDirs[0]}. Run the benchmark first.`);
    }
    
    this.results = await fs.readJson(resultsFile);
    this.runDir = latestRunDir;
    
    console.log(`📊 Analyzing results from: ${runDirs[0]}`);
    return this.results;
  }

  async runValidationTests() {
    console.log('🔍 Running validation tests on all scenarios...');
    
    const validationResults = {};
    
    for (const result of this.results.results) {
      console.log(`  Testing ${result.scenarioId}...`);
      
      const projectPath = result.projectPath;
      const validation = {};
      
      try {
        // Run each validation test
        validation.todoComponentExists = validationTests.todoComponentExists(projectPath);
        validation.testsWritten = validationTests.testsWritten(projectPath);
        validation.hasLocalStorageImplementation = validationTests.hasLocalStorageImplementation(projectPath);
        validation.hasErrorHandling = validationTests.hasErrorHandling(projectPath);
        validation.linesOfCodeAdded = validationTests.linesOfCodeAdded(projectPath, TEMPLATE_PATH);
        
        // Async tests
        validation.passesLinting = await validationTests.passesLinting(projectPath);
        validation.testsPass = await validationTests.testsPass(projectPath);
        
        // Calculate overall score
        const scores = [
          validation.todoComponentExists ? 1 : 0,
          validation.testsWritten ? 1 : 0,
          validation.hasLocalStorageImplementation ? 1 : 0,
          validation.hasErrorHandling ? 1 : 0,
          validation.passesLinting ? 1 : 0,
          validation.testsPass ? 1 : 0
        ];
        
        validation.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        validation.featuresImplemented = scores.slice(0, 4).reduce((sum, score) => sum + score, 0);
        validation.codeQuality = scores.slice(4).reduce((sum, score) => sum + score, 0) / 2;
        
      } catch (error) {
        console.warn(`  ⚠️  Error validating ${result.scenarioId}: ${error.message}`);
        validation.error = error.message;
        validation.overallScore = 0;
      }
      
      validationResults[result.scenarioId] = validation;
    }
    
    return validationResults;
  }

  generateComparison(validationResults) {
    console.log('📈 Generating comparative analysis...');
    
    const scenarios = Object.keys(validationResults);
    const comparison = {
      summary: {
        totalScenarios: scenarios.length,
        avgCompletionTime: 0,
        avgScore: 0,
        avgLinesAdded: 0
      },
      rankings: {
        byOverallScore: [],
        byCompletionTime: [],
        byLinesAdded: [],
        byFeatureCompletion: []
      },
      detailed: {}
    };
    
    // Calculate averages
    const completionTimes = this.results.results.map(r => r.duration);
    const scores = scenarios.map(s => validationResults[s].overallScore || 0);
    const linesAdded = scenarios.map(s => validationResults[s].linesOfCodeAdded || 0);
    
    comparison.summary.avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    comparison.summary.avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    comparison.summary.avgLinesAdded = linesAdded.reduce((sum, lines) => sum + lines, 0) / linesAdded.length;
    
    // Generate rankings
    const scenarioData = scenarios.map(scenarioId => {
      const result = this.results.results.find(r => r.scenarioId === scenarioId);
      const validation = validationResults[scenarioId];
      
      return {
        scenarioId,
        duration: result?.duration || 0,
        overallScore: validation?.overallScore || 0,
        linesOfCodeAdded: validation?.linesOfCodeAdded || 0,
        featuresImplemented: validation?.featuresImplemented || 0,
        validation,
        result
      };
    });
    
    comparison.rankings.byOverallScore = [...scenarioData]
      .sort((a, b) => b.overallScore - a.overallScore);
    
    comparison.rankings.byCompletionTime = [...scenarioData]
      .sort((a, b) => a.duration - b.duration);
    
    comparison.rankings.byLinesAdded = [...scenarioData]
      .sort((a, b) => b.linesOfCodeAdded - a.linesOfCodeAdded);
    
    comparison.rankings.byFeatureCompletion = [...scenarioData]
      .sort((a, b) => b.featuresImplemented - a.featuresImplemented);
    
    // Detailed analysis
    scenarios.forEach(scenarioId => {
      const scenario = this.results.config.scenarios.find(s => s.id === scenarioId);
      const result = this.results.results.find(r => r.scenarioId === scenarioId);
      const validation = validationResults[scenarioId];
      
      comparison.detailed[scenarioId] = {
        name: scenario?.name || scenarioId,
        description: scenario?.description || '',
        performance: {
          completionTime: result?.duration || 0,
          completed: result?.completed || false,
          exitCode: result?.exitCode || -1
        },
        validation,
        strengths: [],
        weaknesses: []
      };
      
      // Identify strengths and weaknesses
      if (validation) {
        if (validation.todoComponentExists) comparison.detailed[scenarioId].strengths.push('Successfully implemented todo component');
        if (validation.testsWritten) comparison.detailed[scenarioId].strengths.push('Wrote comprehensive tests');
        if (validation.hasLocalStorageImplementation) comparison.detailed[scenarioId].strengths.push('Implemented local storage persistence');
        if (validation.hasErrorHandling) comparison.detailed[scenarioId].strengths.push('Added proper error handling');
        if (validation.passesLinting) comparison.detailed[scenarioId].strengths.push('Code passes linting standards');
        if (validation.testsPass) comparison.detailed[scenarioId].strengths.push('All tests pass successfully');
        
        if (!validation.todoComponentExists) comparison.detailed[scenarioId].weaknesses.push('Failed to implement todo component');
        if (!validation.testsWritten) comparison.detailed[scenarioId].weaknesses.push('No tests written');
        if (!validation.hasLocalStorageImplementation) comparison.detailed[scenarioId].weaknesses.push('Missing local storage implementation');
        if (!validation.hasErrorHandling) comparison.detailed[scenarioId].weaknesses.push('Lacks error handling');
        if (!validation.passesLinting) comparison.detailed[scenarioId].weaknesses.push('Code fails linting standards');
        if (!validation.testsPass) comparison.detailed[scenarioId].weaknesses.push('Tests fail or missing');
      }
    });
    
    return comparison;
  }

  generateReport(comparison, validationResults) {
    console.log('📝 Generating analysis report...');
    
    const timestamp = new Date().toISOString();
    const report = {
      metadata: {
        generatedAt: timestamp,
        benchmarkResults: this.results.timestamp,
        analyzer: 'Claude Code Benchmarker v1.0'
      },
      summary: comparison.summary,
      rankings: comparison.rankings,
      detailed: comparison.detailed,
      insights: this.generateInsights(comparison),
      rawValidation: validationResults
    };
    
    return report;
  }

  generateInsights(comparison) {
    const insights = {
      topPerformer: null,
      fastestCompletion: null,
      mostThorough: null,
      recommendations: []
    };
    
    // Top performer (best overall score)
    if (comparison.rankings.byOverallScore.length > 0) {
      insights.topPerformer = comparison.rankings.byOverallScore[0];
    }
    
    // Fastest completion
    if (comparison.rankings.byCompletionTime.length > 0) {
      insights.fastestCompletion = comparison.rankings.byCompletionTime[0];
    }
    
    // Most thorough (most lines added)
    if (comparison.rankings.byLinesAdded.length > 0) {
      insights.mostThorough = comparison.rankings.byLinesAdded[0];
    }
    
    // Generate recommendations
    const scenarios = Object.keys(comparison.detailed);
    
    // Check if TDD approach performed better
    const tddResults = scenarios.filter(s => s.includes('tdd'));
    const nonTddResults = scenarios.filter(s => !s.includes('tdd'));
    
    if (tddResults.length > 0 && nonTddResults.length > 0) {
      const tddAvgScore = tddResults.reduce((sum, s) => 
        sum + (comparison.detailed[s].validation?.overallScore || 0), 0) / tddResults.length;
      const nonTddAvgScore = nonTddResults.reduce((sum, s) => 
        sum + (comparison.detailed[s].validation?.overallScore || 0), 0) / nonTddResults.length;
      
      if (tddAvgScore > nonTddAvgScore) {
        insights.recommendations.push('TDD approach shows better overall results');
      } else {
        insights.recommendations.push('Non-TDD approaches perform comparably or better');
      }
    }
    
    // Check for correlation between completion time and quality
    const timeVsQuality = comparison.rankings.byOverallScore.map(item => ({
      time: item.duration,
      score: item.overallScore
    }));
    
    // Simple correlation check
    const fastFinishers = timeVsQuality.filter(item => item.time < comparison.summary.avgCompletionTime);
    const slowFinishers = timeVsQuality.filter(item => item.time >= comparison.summary.avgCompletionTime);
    
    if (fastFinishers.length > 0 && slowFinishers.length > 0) {
      const fastAvgScore = fastFinishers.reduce((sum, item) => sum + item.score, 0) / fastFinishers.length;
      const slowAvgScore = slowFinishers.reduce((sum, item) => sum + item.score, 0) / slowFinishers.length;
      
      if (slowAvgScore > fastAvgScore) {
        insights.recommendations.push('Longer completion times correlate with higher quality output');
      } else {
        insights.recommendations.push('Faster completion does not compromise output quality');
      }
    }
    
    return insights;
  }

  async saveReport(report) {
    const reportFile = path.join(this.runDir, 'analysis-report.json');
    
    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log(`💾 Analysis report saved to: ${reportFile}`);
    
    // Also generate a human-readable summary
    await this.generateHumanReadableReport(report);
    
    return reportFile;
  }

  async generateHumanReadableReport(report) {
    const summaryFile = path.join(this.runDir, 'analysis-summary.md');
    
    let markdown = `# Claude Code Benchmark Analysis Report

Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}

## Summary

- **Total Scenarios**: ${report.summary.totalScenarios}
- **Average Completion Time**: ${Math.round(report.summary.avgCompletionTime / 1000)}s
- **Average Score**: ${(report.summary.avgScore * 100).toFixed(1)}%
- **Average Lines Added**: ${Math.round(report.summary.avgLinesAdded)}

## Top Performers

### Overall Best Score
**${report.insights.topPerformer?.scenarioId}** - ${(report.insights.topPerformer?.overallScore * 100).toFixed(1)}%

### Fastest Completion
**${report.insights.fastestCompletion?.scenarioId}** - ${Math.round(report.insights.fastestCompletion?.duration / 1000)}s

### Most Code Generated
**${report.insights.mostThorough?.scenarioId}** - ${report.insights.mostThorough?.linesOfCodeAdded} lines

## Detailed Results

| Scenario | Score | Time | Features | Tests | Linting | Storage | Errors |
|----------|-------|------|----------|-------|---------|---------|--------|
`;

    report.rankings.byOverallScore.forEach(item => {
      const val = item.validation;
      markdown += `| ${item.scenarioId} | ${(item.overallScore * 100).toFixed(1)}% | ${Math.round(item.duration / 1000)}s | ${val?.featuresImplemented || 0}/4 | ${val?.testsWritten ? '✅' : '❌'} | ${val?.passesLinting ? '✅' : '❌'} | ${val?.hasLocalStorageImplementation ? '✅' : '❌'} | ${val?.hasErrorHandling ? '✅' : '❌'} |
`;
    });

    markdown += `

## Key Insights

`;

    report.insights.recommendations.forEach(rec => {
      markdown += `- ${rec}
`;
    });

    markdown += `

## Individual Scenario Analysis

`;

    Object.entries(report.detailed).forEach(([scenarioId, details]) => {
      markdown += `### ${details.name}

**Description**: ${details.description}

**Performance**:
- Completion Time: ${Math.round(details.performance.completionTime / 1000)}s
- Success: ${details.performance.completed ? '✅' : '❌'}

**Strengths**:
${details.strengths.map(s => `- ${s}`).join('\\n')}

**Areas for Improvement**:
${details.weaknesses.map(w => `- ${w}`).join('\\n')}

---

`;
    });

    await fs.writeFile(summaryFile, markdown);
    console.log(`📄 Human-readable summary saved to: ${summaryFile}`);
    
    return summaryFile;
  }

  printSummary(report) {
    console.log('\\n📊 Analysis Summary:');
    console.log(`   Average Score: ${(report.summary.avgScore * 100).toFixed(1)}%`);
    console.log(`   Average Time: ${Math.round(report.summary.avgCompletionTime / 1000)}s`);
    console.log(`   Average Lines: ${Math.round(report.summary.avgLinesAdded)}`);
    
    console.log('\\n🏆 Top Performers:');
    if (report.insights.topPerformer) {
      console.log(`   Best Score: ${report.insights.topPerformer.scenarioId} (${(report.insights.topPerformer.overallScore * 100).toFixed(1)}%)`);
    }
    if (report.insights.fastestCompletion) {
      console.log(`   Fastest: ${report.insights.fastestCompletion.scenarioId} (${Math.round(report.insights.fastestCompletion.duration / 1000)}s)`);
    }
    
    console.log('\\n💡 Key Insights:');
    report.insights.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const analyzer = new BenchmarkAnalyzer();
  
  try {
    switch (command) {
      case 'analyze':
      default:
        await analyzer.loadLatestResults();
        const validationResults = await analyzer.runValidationTests();
        const comparison = analyzer.generateComparison(validationResults);
        const report = analyzer.generateReport(comparison, validationResults);
        await analyzer.saveReport(report);
        analyzer.printSummary(report);
        break;
        
      case 'help':
        console.log(`
Claude Code Benchmark Analyzer Usage:

Commands:
  analyze     Run full analysis on latest results (default)
  help        Show this help message

Examples:
  node analyzer.js           # Analyze latest benchmark results
  node analyzer.js analyze   # Same as above
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BenchmarkAnalyzer;