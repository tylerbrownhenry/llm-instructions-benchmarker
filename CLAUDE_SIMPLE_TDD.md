# Development Guidelines for SimpleReactApp

## Development Philosophy

## Core Development Philosophy

### Test-Driven Development (TDD)
- **ALWAYS write tests before implementation code**
- Follow the Red-Green-Refactor cycle:
  1. **Red**: Write a failing test first
  2. **Green**: Write minimal code to make the test pass
  3. **Refactor**: Clean up code while keeping tests green
- Test behavior, not implementation details
- Keep tests simple, focused, and readable

## Development Tools & Quality

### Code Quality
- Follow ESLint rules strictly
- Use consistent formatting with Prettier
- Keep functions small and focused (single responsibility)
- Use descriptive variable and function names

### Testing Guidelines
- Use vitest and react-testing-library for testing

- Follow TDD practices: write tests first

- Aim for high test coverage (>90% for critical paths)
- Use descriptive test names that explain behavior
- Mock external dependencies appropriately

## Quality Assurance

### Accessibility
- Follow WCAG 2.1 AA guidelines
- Include proper alt text for images
- Ensure keyboard navigation works
- Use semantic HTML elements
- Test with screen readers

Generated on 7/1/2025 for javascript project