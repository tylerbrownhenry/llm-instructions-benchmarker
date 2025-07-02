# Multi-Agent Development Setup

This project uses multiple specialized agents working concurrently to handle different aspects of development.

## Agent Specializations

### Frontend Specialist
- Handles React/TypeScript development
- Focuses on component architecture and UI/UX
- Manages frontend testing with Jest/React Testing Library

### Backend Specialist  
- Manages Node.js/Express API development
- Handles database operations and migrations
- Implements authentication and middleware

### Test Specialist
- Writes comprehensive test suites
- Ensures code coverage standards
- Runs automated testing pipelines

## Workflow Examples

### Concurrent Feature Development
```bash
claude --agent frontend-specialist "Create user profile component"
claude --agent backend-specialist "Create user profile API endpoints" 
claude --agent test-specialist "Write tests for user profile feature"
```

### Sequential Quality Pipeline
```bash
claude --workflow full-stack-feature "Implement user authentication"
```

## Project Structure
```
src/
├── components/     # Frontend components (frontend-specialist)
├── api/           # Backend routes (backend-specialist)  
├── tests/         # Test files (test-specialist)
└── types/         # Shared TypeScript types
```

## Commands
- `npm run dev` - Start development servers
- `npm run test` - Run test suite
- `npm run build` - Production build
- `npm run lint` - Code linting