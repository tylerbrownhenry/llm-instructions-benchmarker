# Monorepo Management with Claude Code

This configuration provides intelligent workspace management for large-scale monorepo development with multiple packages and applications.

## Workspace Structure

```
monorepo/
├── apps/
│   ├── web/              # Next.js web app
│   ├── mobile/           # React Native app  
│   ├── admin/            # Admin dashboard
│   ├── api/              # REST API service
│   ├── auth/             # Authentication service
│   └── notifications/    # Notification service
├── packages/
│   ├── ui/               # Shared UI components
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript definitions
└── tools/
    ├── eslint-config/    # Shared linting rules
    └── build-scripts/    # Build utilities
```

## Agent Specialization

### Frontend Apps Agent
**Scope**: `apps/web`, `apps/mobile`, `apps/admin`
- React/Next.js expertise
- Component development
- State management
- Frontend testing

### Backend Services Agent  
**Scope**: `apps/api`, `apps/auth`, `apps/notifications`
- Node.js/Express development
- Database operations
- API design
- Service communication

### Shared Packages Agent
**Scope**: `packages/ui`, `packages/utils`, `packages/types`
- Library development
- Cross-package dependencies
- Version management
- Breaking change analysis

## Automated Workflows

### Cross-Package Development
```bash
# Implement user profile feature across all layers
claude --workflow full-stack-feature "Add user profile management"

# Agents work concurrently:
# - shared-packages: Updates types and utilities
# - backend-services: Creates profile API endpoints
# - frontend-apps: Builds profile UI components
```

### Package Update Propagation
```bash
# Update shared UI package and test dependents
claude --workflow package-update "Update Button component API"

# Sequential execution:
# 1. Updates packages/ui/Button component
# 2. Rebuilds all packages
# 3. Runs tests in dependent apps
# 4. Reports breaking changes
```

## Intelligent Build System

### Dependency-Aware Building
```json
{
  "build": {
    "dependency_graph": true,    // Build in dependency order
    "parallel_builds": true,     // Parallel where possible
    "cache_enabled": true,       // Reuse previous builds
    "affected_only": true        // Build only changed packages
  }
}
```

### Example Build Flow
```bash
# Change packages/utils/validation.ts
claude "Add email validation function"

# Automatic build chain:
# 1. packages/utils builds first
# 2. packages/ui builds (depends on utils)
# 3. apps/* build in parallel (depend on packages)
# 4. Only affected packages rebuild
```

## Package Management

### PNPM Integration
```json
{
  "scripts": {
    "build": "pnpm build --filter=packages/*",
    "test": "pnpm test --recursive",
    "dev": "pnpm dev --parallel",
    "lint": "pnpm lint --recursive"
  }
}
```

### Workspace Commands
```bash
# Install dependencies across workspace
pnpm install

# Build specific package and dependents
pnpm build --filter=@repo/ui...

# Run tests for affected packages only
pnpm test --filter=[HEAD^1]

# Start all development servers
pnpm dev --parallel
```

## Cross-Package Workflows

### Feature Development
```bash
# Add authentication to mobile app
claude "Implement OAuth login for mobile app"

# Execution flow:
# 1. shared-packages agent: Updates auth types
# 2. backend-services agent: Creates auth endpoints
# 3. frontend-apps agent: Implements mobile login UI
# 4. All changes tested together
```

### Refactoring
```bash
# Rename API endpoint across all consumers
claude "Rename getUserProfile to fetchUserProfile"

# Smart refactoring:
# 1. Updates backend service definition
# 2. Finds all frontend consumers
# 3. Updates import statements
# 4. Rebuilds affected packages
# 5. Runs integration tests
```

## Testing Strategy

### Affected Testing
```json
{
  "testing": {
    "parallel": true,           // Run tests in parallel
    "affected_tests": true,     // Test only affected code
    "coverage_aggregation": true // Combine coverage reports
  }
}
```

### Test Execution Flow
```bash
# Change packages/utils/date.ts
claude "Fix timezone handling in date utilities"

# Smart testing:
# 1. Run unit tests for packages/utils
# 2. Run integration tests for apps using date utils
# 3. Skip unaffected test suites
# 4. Generate combined coverage report
```

## Version Management

### Semantic Versioning
```json
{
  "versioning": {
    "strategy": "independent",
    "conventional_commits": true,
    "auto_changelog": true,
    "publish_on_merge": false
  }
}
```

### Release Workflow
```bash
# Prepare release for UI package
claude "Prepare v2.1.0 release for UI package"

# Release process:
# 1. Analyzes commits for version bump
# 2. Updates package.json versions
# 3. Generates changelog
# 4. Updates dependent package versions
# 5. Creates release PR
```

## Development Tools

### Package Scripts
```json
{
  "scripts": {
    "new:app": "pnpm create next-app apps/$1",
    "new:package": "mkdir packages/$1 && cp templates/package.json packages/$1/",
    "graph": "pnpm nx graph",
    "affected": "pnpm nx affected:apps"
  }
}
```

### Workspace Utilities
```bash
# Create new package
claude "Create new analytics package"

# Automatic setup:
# 1. Creates packages/analytics/
# 2. Initializes package.json
# 3. Sets up build configuration
# 4. Adds to workspace dependencies
```

## Performance Optimization

### Build Cache
```bash
# Turborepo integration
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "test/**/*.ts"]
    }
  }
}
```

### Development Speed
- **Incremental builds**: Only rebuild changed packages
- **Parallel execution**: Multiple packages build simultaneously  
- **Smart caching**: Reuse previous build artifacts
- **Affected analysis**: Skip unaffected packages

## Best Practices

### Code Organization
- **Shared packages**: Common utilities and components
- **App-specific code**: Keep application logic separate
- **Clear boundaries**: Well-defined package interfaces
- **Consistent structure**: Standardized package layout

### Dependency Management
- **Workspace protocols**: Use `workspace:*` for internal deps
- **Version alignment**: Keep external deps synchronized
- **Peer dependencies**: Avoid duplicate packages
- **Regular updates**: Automated dependency updates

### Development Workflow
- **Feature branches**: Work on isolated branches
- **Integration testing**: Test cross-package changes
- **Gradual rollout**: Deploy packages incrementally
- **Documentation**: Keep package docs updated

## Troubleshooting

### Common Issues
```bash
# Dependency resolution problems
pnpm install --force

# Build failures
pnpm build --filter=@repo/failing-package

# Test issues
pnpm test --filter=@repo/package --verbose

# Cache problems
pnpm cache clean
```

### Debug Commands
```bash
# Visualize dependency graph
pnpm nx graph

# Check affected packages
pnpm nx affected:libs

# Analyze bundle size
pnpm analyze --filter=@repo/web
```