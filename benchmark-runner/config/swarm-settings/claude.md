## Development Rules and Standards

### Test-Driven Development (TDD)
- **MANDATORY**: Write tests BEFORE implementing any functionality
- Write failing tests first, then implement code to make them pass
- Maintain minimum 90% code coverage for all new features
- Run tests continuously during development
- All tests must pass before considering any task complete

### Strictly Enforced Architecture
- Follow established architectural patterns without deviation
- Maintain clear separation of concerns (presentation, business logic, data)
- Use dependency injection for all external dependencies
- Implement proper error boundaries and fallback mechanisms
- Enforce single responsibility principle for all components and functions

### Component-Based Design
- Create reusable, composable components with clear interfaces
- Follow atomic design principles (atoms, molecules, organisms)
- Implement proper prop typing and validation
- Use composition over inheritance
- Ensure all components are pure and predictable

### Documentation Requirements
- Update relevant documentation AFTER completing each task
- Document all new APIs, components, and architectural decisions
- Update README files with new features and usage examples
- Create or update inline code documentation for complex logic
- Maintain architecture decision records (ADRs) for significant changes

## Implementation Workflow

1. **Requirements Analysis**: Have the requirements analyst define user stories for the request
2. **Test Planning**: Define test scenarios and acceptance criteria before implementation
3. **API Design**: If applicable, Design RESTful endpoints for user profile CRUD operations
4. **Frontend Architecture**: Create React components if applicable, ensuring they follow the existing design patterns
5. **Security Review**: Ensure proper security measures
6. **Integration Testing**: Verify all components work together seamlessly
7. **Documentation Update**: Update all relevant documentation post-implementation
