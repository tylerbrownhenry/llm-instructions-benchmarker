const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const validationTests = {
  // Check if todo component was created
  todoComponentExists: (projectPath) => {
    const possiblePaths = [
      path.join(projectPath, 'src/TodoList.js'),
      path.join(projectPath, 'src/Todo.js'),
      path.join(projectPath, 'src/components/TodoList.js'),
      path.join(projectPath, 'src/components/Todo.js')
    ];
    return possiblePaths.some(todoPath => fs.existsSync(todoPath));
  },

  // Check if tests were written
  testsWritten: (projectPath) => {
    const testDir = path.join(projectPath, 'tests');
    if (!fs.existsSync(testDir)) return false;
    
    const testFiles = fs.readdirSync(testDir);
    return testFiles.some(file => 
      file.toLowerCase().includes('todo') && 
      (file.endsWith('.test.js') || file.endsWith('.spec.js'))
    );
  },

  // Check if code passes linting
  passesLinting: async (projectPath) => {
    try {
      // Try common linting commands
      const lintCommands = ['npm run lint', 'npx eslint .', 'yarn lint'];
      
      for (const command of lintCommands) {
        try {
          execSync(command, { cwd: projectPath, stdio: 'pipe' });
          return true;
        } catch (e) {
          // Try next command
          continue;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // Check if tests pass
  testsPass: async (projectPath) => {
    try {
      execSync('npm test', { cwd: projectPath, stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Count lines of code added
  linesOfCodeAdded: (projectPath, originalPath) => {
    try {
      const getLineCount = (dir) => {
        let count = 0;
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
            count += getLineCount(fullPath);
          } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.jsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            count += content.split('\n').length;
          }
        }
        return count;
      };

      const originalLines = getLineCount(originalPath);
      const newLines = getLineCount(projectPath);
      return newLines - originalLines;
    } catch (error) {
      return 0;
    }
  },

  // Check if local storage is implemented
  hasLocalStorageImplementation: (projectPath) => {
    const searchForLocalStorage = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          if (searchForLocalStorage(fullPath)) return true;
        } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.jsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('localStorage')) return true;
        }
      }
      return false;
    };

    return searchForLocalStorage(projectPath);
  },

  // Check if error handling is implemented
  hasErrorHandling: (projectPath) => {
    const searchForErrorHandling = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          if (searchForErrorHandling(fullPath)) return true;
        } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.jsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('try') || content.includes('catch') || content.includes('error')) {
            return true;
          }
        }
      }
      return false;
    };

    return searchForErrorHandling(projectPath);
  }
};

module.exports = validationTests;