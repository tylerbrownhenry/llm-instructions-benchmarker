# Test-Driven Development with Claude Code

This project demonstrates TDD workflows automated through Claude Code settings.

## TDD Cycle Automation

### Red-Green-Refactor Process

1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve code while maintaining tests

## Automated TDD Workflow

### Example: Adding a Calculator Function

```bash
claude --workflow tdd-cycle "Add multiply function to calculator"
```

**Step 1: Write Failing Test**
```javascript
// calculator.test.js
describe('Calculator', () => {
  test('should multiply two numbers', () => {
    expect(multiply(3, 4)).toBe(12);
    expect(multiply(-2, 5)).toBe(-10);
    expect(multiply(0, 10)).toBe(0);
  });
});
```

**Step 2: Minimal Implementation**
```javascript
// calculator.js
function multiply(a, b) {
  return a * b;
}
```

**Step 3: Refactor** 
```javascript
// calculator.js
export class Calculator {
  static multiply(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Arguments must be numbers');
    }
    return a * b;
  }
}
```

## Project Structure

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── utils/
│   ├── calculator.js
│   └── calculator.test.js
└── services/
    ├── api.ts
    └── api.test.ts
```

## Testing Configuration

### Jest Setup
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "coverageThreshold": {
      "global": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Coverage Requirements
- **90% minimum coverage** on all metrics
- **Automatic coverage reports** after each test run
- **Coverage-based file protection** (prevents commits below threshold)

## TDD Best Practices

### Test Categories
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Module interactions
- **End-to-End Tests**: Complete user workflows

### Naming Conventions
- Test files: `*.test.{js,ts,tsx}`
- Describe blocks: Feature or component name
- Test cases: "should [expected behavior] when [condition]"

### Example Test Structure
```javascript
describe('UserService', () => {
  describe('createUser', () => {
    test('should create user with valid data', () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      
      // Act
      const result = UserService.createUser(userData);
      
      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: 'John',
        email: 'john@example.com'
      }));
    });

    test('should throw error with invalid email', () => {
      const userData = { name: 'John', email: 'invalid-email' };
      
      expect(() => UserService.createUser(userData))
        .toThrow('Invalid email format');
    });
  });
});
```

## Automated Quality Checks

### Pre-Implementation Validation
- Ensures test file exists before implementation
- Validates test structure and naming

### Post-Edit Automation
- Runs affected tests automatically
- Checks coverage thresholds
- Prevents commits if tests fail

## Advanced TDD Features

### Parameterized Tests
```javascript
test.each([
  [2, 3, 6],
  [0, 5, 0], 
  [-2, 4, -8]
])('multiply(%i, %i) should return %i', (a, b, expected) => {
  expect(multiply(a, b)).toBe(expected);
});
```

### Mock and Spy Usage
```javascript
test('should call external API', async () => {
  const mockFetch = jest.fn().mockResolvedValue({ 
    json: () => Promise.resolve({ success: true }) 
  });
  global.fetch = mockFetch;
  
  await ApiService.getData();
  
  expect(mockFetch).toHaveBeenCalledWith('/api/data');
});
```

## Benefits

- **Confidence**: Comprehensive test coverage
- **Design**: Tests drive better API design
- **Regression**: Prevents breaking changes
- **Documentation**: Tests serve as living documentation
- **Refactoring**: Safe code improvements