#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../config/ClaudeMapper.json');
const TEMPLATE_PATH = path.join(__dirname, '../templates/react-app');
const SAMPLES_PATH = path.join(__dirname, '../samples');
const CLAUDE_CONFIGS_PATH = path.join(__dirname, '../claude-configs');

async function createSampleDirectories() {
  console.log('🚀 Setting up benchmark sample directories...');
  
  try {
    // Load configuration
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    // Ensure samples directory exists
    await fs.ensureDir(SAMPLES_PATH);
    
    // Create a sample directory for each scenario
    for (const scenario of config.scenarios) {
      console.log(`📁 Creating sample for scenario: ${scenario.name}`);
      
      const sampleDir = path.join(SAMPLES_PATH, scenario.id);
      
      // Remove existing directory if it exists
      if (fs.existsSync(sampleDir)) {
        await fs.remove(sampleDir);
      }
      
      // Copy template to sample directory
      await fs.copy(TEMPLATE_PATH, sampleDir);
      
      // Copy the appropriate CLAUDE.md file
      const claudeConfigSource = path.join(CLAUDE_CONFIGS_PATH, scenario.claudeFile);
      const claudeConfigDest = path.join(sampleDir, 'CLAUDE.md');
      
      if (fs.existsSync(claudeConfigSource)) {
        await fs.copy(claudeConfigSource, claudeConfigDest);
        console.log(`   ✅ Copied ${scenario.claudeFile} to CLAUDE.md`);
      } else {
        console.warn(`   ⚠️  Warning: ${scenario.claudeFile} not found`);
      }
      
      // Install dependencies
      console.log(`   📦 Installing dependencies for ${scenario.id}...`);
      try {
        execSync('npm install', { 
          cwd: sampleDir, 
          stdio: 'pipe' 
        });
        console.log(`   ✅ Dependencies installed for ${scenario.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to install dependencies for ${scenario.id}:`, error.message);
      }
      
      // Initialize git repository for change tracking
      console.log(`   🔧 Initializing git repository for ${scenario.id}...`);
      try {
        execSync('git init', { cwd: sampleDir, stdio: 'pipe' });
        execSync('git add .', { cwd: sampleDir, stdio: 'pipe' });
        execSync('git commit -m "Initial commit - template setup"', { 
          cwd: sampleDir, 
          stdio: 'pipe',
          env: { ...process.env, GIT_AUTHOR_NAME: 'Benchmark', GIT_AUTHOR_EMAIL: 'benchmark@test.com', GIT_COMMITTER_NAME: 'Benchmark', GIT_COMMITTER_EMAIL: 'benchmark@test.com' }
        });
        console.log(`   ✅ Git repository initialized for ${scenario.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize git for ${scenario.id}:`, error.message);
      }
    }
    
    console.log('✨ Sample directories created successfully!');
    console.log(`📍 Samples location: ${SAMPLES_PATH}`);
    
    // List created directories
    const sampleDirs = fs.readdirSync(SAMPLES_PATH);
    console.log('📋 Created samples:');
    sampleDirs.forEach(dir => {
      console.log(`   - ${dir}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up sample directories:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create':
    case 'setup':
    default:
      createSampleDirectories();
      break;
      
    case 'clean':
      console.log('🧹 Cleaning up sample directories...');
      if (fs.existsSync(SAMPLES_PATH)) {
        fs.removeSync(SAMPLES_PATH);
        console.log('✅ Sample directories cleaned');
      } else {
        console.log('ℹ️  No sample directories to clean');
      }
      break;
      
    case 'help':
      console.log(`
Benchmark Setup Script Usage:

Commands:
  setup, create  Create sample directories for all scenarios (default)
  clean         Remove all sample directories
  help          Show this help message

Examples:
  node setup.js           # Create sample directories
  node setup.js create    # Create sample directories
  node setup.js clean     # Clean up sample directories
  node setup.js help      # Show help
      `);
      break;
  }
}

module.exports = { createSampleDirectories };