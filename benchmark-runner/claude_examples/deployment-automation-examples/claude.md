# Deployment Automation with Claude Code

This configuration provides end-to-end deployment automation with safety checks, monitoring, and rollback capabilities.

## Deployment Strategy

### Multi-Environment Pipeline
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │───▶│   Staging   │───▶│ Production  │
│ (Auto)      │    │ (Auto)      │    │ (Manual)    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Deployment Triggers
- **Development**: Every commit to main branch
- **Staging**: Successful development deployment
- **Production**: Manual approval required

## Automated Workflows

### Staging Deployment
```bash
claude --workflow deploy-to-staging

# Execution flow:
# 1. Build production assets
# 2. Run end-to-end tests
# 3. Build Docker container
# 4. Deploy to Kubernetes staging
# 5. Verify deployment health
```

### Production Deployment
```bash
claude --workflow production-deploy

# Safety-first approach:
# 1. Production build with optimizations
# 2. Complete test suite execution
# 3. Security vulnerability scan
# 4. Container build with version tag
# 5. Blue-green deployment
# 6. Health checks and smoke tests
```

### Emergency Rollback
```bash
claude --workflow rollback

# Quick recovery:
# 1. Rollback to previous deployment
# 2. Verify rollback success
# 3. Run smoke tests
# 4. Send alerts to team
```

## Container Orchestration

### Kubernetes Configuration
```yaml
# k8s/production/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myregistry/app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run security:scan

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/app:${{ github.sha }} .
          docker push ${{ secrets.DOCKER_REGISTRY }}/app:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/app-staging app=${{ secrets.DOCKER_REGISTRY }}/app:${{ github.sha }}
          kubectl rollout status deployment/app-staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/app-production app=${{ secrets.DOCKER_REGISTRY }}/app:${{ github.sha }}
          kubectl rollout status deployment/app-production
```

## Monitoring and Alerting

### Health Checks
```javascript
// health-check.js
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: checkDatabase(),
      redis: checkRedis(),
      external_apis: checkExternalApis()
    }
  };
  res.json(health);
});

app.get('/ready', (req, res) => {
  // Readiness probe - app ready to receive traffic
  if (isReady()) {
    res.status(200).send('Ready');
  } else {
    res.status(503).send('Not Ready');
  }
});
```

### Metrics Collection
```javascript
// metrics.js
const prometheus = require('prom-client');

const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new prometheus.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Collect default metrics
prometheus.collectDefaultMetrics();

app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Alert Configuration
```yaml
# alerts.yml
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected

  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: High latency detected
```

## Infrastructure as Code

### Terraform Configuration
```hcl
# infrastructure/main.tf
resource "aws_ecs_cluster" "main" {
  name = "app-cluster"
}

resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }
}
```

### Environment Configuration
```bash
# environments/production.env
NODE_ENV=production
LOG_LEVEL=info
REDIS_URL=redis://prod-redis:6379
DATABASE_URL=postgresql://prod-db:5432/app
SENTRY_DSN=$SENTRY_DSN
NEW_RELIC_LICENSE_KEY=$NEW_RELIC_KEY
```

## Deployment Strategies

### Blue-Green Deployment
```bash
# Blue-green deployment script
#!/bin/bash
CURRENT_COLOR=$(kubectl get service app -o jsonpath='{.spec.selector.color}')
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Deploying to $NEW_COLOR environment..."
kubectl set image deployment/app-$NEW_COLOR app=app:$1
kubectl rollout status deployment/app-$NEW_COLOR

echo "Running health checks..."
kubectl exec -it deploy/app-$NEW_COLOR -- npm run health:check

echo "Switching traffic to $NEW_COLOR..."
kubectl patch service app -p '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

echo "Deployment complete!"
```

### Canary Deployment
```yaml
# canary-deployment.yml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - setWeight: 25
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 75
      - pause: {duration: 5m}
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:stable
```

## Security and Compliance

### Secret Management
```yaml
# secrets.yml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  database-url: <base64-encoded>
  api-key: <base64-encoded>
```

### Network Policies
```yaml
# network-policy.yml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
```

## Deployment Examples

### Feature Deployment
```bash
# Deploy new feature to staging
claude "Deploy user profile feature to staging"

# Automated process:
# 1. Builds feature branch
# 2. Runs feature tests
# 3. Deploys to staging
# 4. Runs integration tests
# 5. Notifies team of staging deployment
```

### Hotfix Deployment
```bash
# Emergency production hotfix
claude "Deploy security hotfix to production"

# Fast-track process:
# 1. Builds from hotfix branch
# 2. Runs critical tests only
# 3. Deploys with minimal downtime
# 4. Monitors error rates
# 5. Sends critical alerts
```

### Database Migration
```bash
# Deploy with database changes
claude "Deploy with user table migration"

# Migration-aware deployment:
# 1. Runs database migrations
# 2. Deploys backward-compatible code
# 3. Validates migration success
# 4. Completes code deployment
# 5. Cleans up old migration artifacts
```

## Best Practices

### Deployment Safety
- **Gradual Rollouts**: Use canary or blue-green strategies
- **Health Checks**: Comprehensive application health monitoring
- **Rollback Plans**: Always have automated rollback capability
- **Testing**: Comprehensive test coverage before deployment

### Monitoring
- **Application Metrics**: Performance and error tracking
- **Infrastructure Metrics**: Resource utilization monitoring
- **Business Metrics**: User experience and conversion tracking
- **Alerting**: Proactive notification of issues

### Security
- **Secret Management**: Secure credential handling
- **Network Security**: Proper network isolation
- **Image Scanning**: Container vulnerability assessment
- **Access Control**: Principle of least privilege