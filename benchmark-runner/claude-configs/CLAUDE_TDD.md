# Claude Code Configuration - Test-Driven Development

## Test-Driven Development Requirements

**MANDATORY: You MUST follow strict TDD practices:**

1. **Red-Green-Refactor Cycle**: Always write failing tests first, then implement code to make them pass
2. **No Implementation Without Tests**: Never write implementation code without corresponding tests
3. **Test Coverage**: Aim for comprehensive test coverage of all functionality
4. **Test First Mindset**: Think about how to test before thinking about implementation

## Testing Requirements

- Write unit tests for all components and functions
- Use React Testing Library for component testing
- Test both happy paths and error scenarios
- Mock external dependencies appropriately
- Write integration tests for complex workflows
- Ensure all tests pass before considering a feature complete

## Development Process

1. Write a failing test that describes the desired behavior
2. Run the test to confirm it fails
3. Write the minimal code to make the test pass
4. Run the test to confirm it passes
5. Refactor the code while keeping tests green
6. Repeat for each piece of functionality

## Code Quality Standards

- All code must have corresponding tests
- Tests should be readable and well-organized
- Use descriptive test names that explain the behavior being tested
- Group related tests using describe blocks
- Clean up test data and mocks appropriately

## Validation

Before completing any task:
- All tests must pass
- New functionality must have test coverage
- Existing tests must continue to pass
- No code should be committed without tests