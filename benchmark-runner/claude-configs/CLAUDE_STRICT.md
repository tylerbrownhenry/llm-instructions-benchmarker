# Claude Code Configuration - Strict Standards

## Mandatory Code Quality Standards

**CRITICAL: All code must meet these strict requirements:**

## Code Structure & Organization

- **File Organization**: Each component must be in its own file with clear naming conventions
- **Import Order**: Group imports logically (React, third-party, local) with proper spacing
- **Component Structure**: Use functional components with hooks, avoid class components
- **Single Responsibility**: Each function/component should have one clear purpose
- **No Magic Numbers**: Use named constants for all numeric values
- **No Dead Code**: Remove all unused imports, variables, and functions

## Performance Requirements

- **Memoization**: Use React.memo, useMemo, and useCallback where appropriate
- **Lazy Loading**: Implement code splitting for large components
- **Efficient Re-renders**: Minimize unnecessary component re-renders
- **Memory Management**: Properly clean up event listeners and subscriptions

## Error Handling & Validation

- **Comprehensive Error Boundaries**: Implement error boundaries for all major sections
- **Input Validation**: Validate all user inputs with proper error messages
- **Graceful Degradation**: Handle network failures and edge cases
- **Type Safety**: Use PropTypes or TypeScript for type checking
- **Error Logging**: Log errors appropriately for debugging

## Code Style & Formatting

- **Consistent Formatting**: Use Prettier with strict configuration
- **ESLint Compliance**: Code must pass ESLint with no warnings
- **Naming Conventions**: Use camelCase for variables, PascalCase for components
- **Documentation**: JSDoc comments for all functions and complex logic
- **Line Length**: Maximum 80 characters per line
- **No Console Logs**: Remove all console.log statements from production code

## Security Requirements

- **Input Sanitization**: Sanitize all user inputs to prevent XSS
- **Secure Storage**: Use secure methods for sensitive data storage
- **Access Control**: Implement proper authorization checks
- **Dependency Security**: Use only trusted, up-to-date dependencies

## Testing Requirements

- **Unit Tests**: 90%+ code coverage required
- **Integration Tests**: Test all user workflows
- **Accessibility Tests**: Ensure WCAG 2.1 AA compliance
- **Performance Tests**: Measure and optimize load times
- **Cross-browser Testing**: Support all modern browsers

## Documentation Requirements

- **README Updates**: Document all new features and changes
- **API Documentation**: Document all functions and their parameters
- **Architecture Decisions**: Document significant design choices
- **Deployment Guide**: Provide clear deployment instructions

## Validation Checklist

Before submitting code, verify:
- [ ] All tests pass with 90%+ coverage
- [ ] ESLint shows no errors or warnings
- [ ] Prettier formatting applied
- [ ] No console.log statements
- [ ] All imports used
- [ ] Error handling implemented
- [ ] Performance optimizations applied
- [ ] Security measures in place
- [ ] Documentation updated
- [ ] Cross-browser compatibility verified

**NON-COMPLIANCE WILL RESULT IN CODE REJECTION**