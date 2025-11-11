# Monitoring & Observability - The Blue Harvest

## Overview

Enterprise-grade observability stack implementing the **Three Pillars**: Logs, Metrics, and Traces.

```
┌──────────────────────────────────────────────────────────────┐
│                   Application Layer                           │
│  - Express backend                                            │
│  - Next.js frontend                                           │
└───────────────┬──────────────────────────────────────────────┘
                │
                │ Instrumentation
                │
    ┌───────────┼───────────┬───────────────┐
    │           │           │               │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐  ┌───────▼────────┐
│ Logs   │ │Metrics │ │ Traces │  │ Error Tracking │
│Winston │ │Prome-  │ │OpenTel │  │ Sentry         │
│        │ │theus   │ │        │  │                │
└───┬────┘ └───┬────┘ └───┬────┘  └───────┬────────┘
    │          │          │               │
    │          │          │               │
┌───▼──────────▼──────────▼───────────────▼────────┐
│          Data Collection & Storage                │
│  - CloudWatch (AWS logs & metrics)               │
│  - Grafana Loki (log aggregation)                │
│  - Grafana (visualization)                       │
│  - Jaeger (trace visualization)                  │
└───────────────────────┬──────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────┐
│              Alerting & Notification              │
│  - PagerDuty (on-call)                           │
│  - Slack (team notifications)                    │
│  - Email (reports)                               │
└──────────────────────────────────────────────────┘
```

---

# 1. Logging

## Structured Logging with Winston

### Logger Configuration

**File**: `apps/backend/src/utils/logger.ts`

```typescript
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Format for development (human-readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  );

  // Add CloudWatch transport
  transports.push(
    new WinstonCloudWatch({
      logGroupName: '/blue-harvest/backend',
      logStreamName: `${process.env.NODE_ENV}-${process.env.INSTANCE_ID}`,
      awsRegion: 'us-east-1',
      jsonMessage: true
    })
  );
}

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports
});

// Sanitize sensitive data
logger.on('data', (log) => {
  if (log.password) delete log.password;
  if (log.token) log.token = '***REDACTED***';
  if (log.authorization) log.authorization = '***REDACTED***';
});
```

### Logging Middleware

```typescript
// middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate request ID
  const requestId = uuidv4();
  req.requestId = requestId;

  // Log request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    accountId: req.user?.accountId
  });

  // Capture start time
  const startTime = Date.now();

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.http('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length')
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        url: req.url,
        duration
      });
    }
  });

  next();
}
```

### Application-level Logging

```typescript
// Usage in services
export class AuthService {
  async login(dto: LoginDto): Promise<AuthResponse> {
    logger.info('Login attempt', {
      email: dto.email,
      ip: dto.ipAddress
    });

    try {
      const account = await this.accountRepo.findByEmail(dto.email);

      if (!account) {
        logger.warn('Login failed: account not found', {
          email: dto.email
        });
        throw new AuthError('Invalid credentials');
      }

      const isValid = await this.passwordService.verify(
        account.hashed_password,
        dto.password
      );

      if (!isValid) {
        logger.warn('Login failed: invalid password', {
          accountId: account.account_id,
          email: dto.email
        });
        throw new AuthError('Invalid credentials');
      }

      logger.info('Login successful', {
        accountId: account.account_id,
        username: account.username
      });

      // ... generate tokens
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        email: dto.email
      });
      throw error;
    }
  }
}
```

### Log Levels & Usage

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Application errors, exceptions | Database connection failed |
| `warn` | Warning conditions, degraded performance | Slow query (>1s) |
| `info` | Important business events | User logged in, post created |
| `http` | HTTP requests/responses | GET /api/posts 200 150ms |
| `debug` | Detailed debugging information | Query execution details |

---

## Log Aggregation with CloudWatch

### CloudWatch Logs Setup

```typescript
// config/cloudwatch.ts
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

export function createCloudWatchTransport() {
  return new WinstonCloudWatch({
    logGroupName: '/blue-harvest/backend',
    logStreamName: () => {
      const date = new Date().toISOString().split('T')[0];
      return `${date}/${process.env.INSTANCE_ID}`;
    },
    awsRegion: process.env.AWS_REGION,
    jsonMessage: true,
    messageFormatter: (log) => {
      return JSON.stringify({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        ...log.meta,
        environment: process.env.NODE_ENV,
        service: 'backend',
        version: process.env.APP_VERSION
      });
    }
  });
}
```

### Log Insights Queries

**Common queries for troubleshooting**:

```sql
-- Find all errors in last hour
fields @timestamp, level, message, error, requestId
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Slow requests (>1s)
fields @timestamp, url, duration, statusCode
| filter duration > 1000
| sort duration desc
| limit 50

-- Failed login attempts by IP
fields @timestamp, ip, email
| filter message = "Login failed: invalid password"
| stats count() by ip
| sort count desc

-- Average response time by endpoint
fields url, duration
| filter level = "http"
| stats avg(duration) as avg_duration by url
| sort avg_duration desc

-- Error rate over time
fields @timestamp
| filter level = "error"
| stats count() as error_count by bin(5m)
```

---

# 2. Metrics

## Prometheus Metrics

### Setup

**Install**:
```bash
npm install prom-client
```

**Configuration**:
```typescript
// utils/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP request duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// Database query duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Active users
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

// Cache hit rate
export const cacheHitCounter = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

export const cacheMissCounter = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

// Business metrics
export const userSignups = new Counter({
  name: 'user_signups_total',
  help: 'Total number of user signups'
});

export const postsCreated = new Counter({
  name: 'posts_created_total',
  help: 'Total number of posts created',
  labelNames: ['post_type']
});
```

### Metrics Middleware

```typescript
// middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import {
  httpRequestCounter,
  httpRequestDuration
} from '../utils/metrics';

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode
      },
      duration
    );
  });

  next();
}
```

### Metrics Endpoint

```typescript
// routes/metrics.ts
import { Router, Request, Response } from 'express';
import { register } from '../utils/metrics';

const router = Router();

router.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

### Database Query Metrics

```typescript
// database/interceptors/metricsInterceptor.ts
import { Interceptor } from 'slonik';
import { dbQueryDuration } from '../../utils/metrics';

export const metricsInterceptor: Interceptor = {
  transformQuery: (context, query) => {
    const startTime = Date.now();

    // Extract table name from query
    const tableMatch = query.sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : 'unknown';

    // Determine operation
    const operation = query.sql.trim().split(' ')[0].toLowerCase();

    return {
      ...query,
      sql: query.sql,
      values: query.values,
      onComplete: () => {
        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe({ operation, table }, duration);
      }
    };
  }
};
```

### Application Metrics

```typescript
// Usage in services
export class AuthService {
  async signup(dto: SignupDto): Promise<AuthResponse> {
    // Increment signup counter
    userSignups.inc();

    // ... rest of signup logic
  }
}

export class PostService {
  async createPost(dto: CreatePostDto): Promise<Post> {
    const post = await this.postRepo.create(dto);

    // Increment post creation counter
    postsCreated.inc({ post_type: post.post_type_id });

    return post;
  }
}

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (value) {
      cacheHitCounter.inc({ cache_type: 'redis' });
    } else {
      cacheMissCounter.inc({ cache_type: 'redis' });
    }

    return value;
  }
}
```

---

## Grafana Dashboards

### Dashboard Configuration

**Key Dashboards**:

1. **Application Overview**
   - Request rate (requests/sec)
   - Error rate (errors/sec)
   - Response time (p50, p95, p99)
   - Active users
   - CPU & Memory usage

2. **Database Performance**
   - Query duration (by operation)
   - Slow queries (>100ms)
   - Connection pool usage
   - Cache hit rate

3. **Business Metrics**
   - User signups per day
   - Posts created per day
   - Active users per hour
   - Engagement metrics

4. **Infrastructure**
   - Container CPU usage
   - Container memory usage
   - Network I/O
   - Disk usage

**Example PromQL Queries**:

```promql
# Request rate (5-minute average)
rate(http_requests_total[5m])

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
sum(rate(cache_hits_total[5m])) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Database query duration by table
histogram_quantile(0.95,
  sum(rate(db_query_duration_seconds_bucket[5m])) by (table, le)
)
```

---

# 3. Distributed Tracing

## OpenTelemetry Setup

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger
```

### Configuration

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'blue-harvest-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false // Disable file system instrumentation (too noisy)
      }
    })
  ]
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

### Custom Spans

```typescript
// services/auth/AuthService.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('auth-service');

export class AuthService {
  async login(dto: LoginDto): Promise<AuthResponse> {
    return tracer.startActiveSpan('authService.login', async (span) => {
      try {
        span.setAttribute('account.email', dto.email);

        // Nested span for database lookup
        const account = await tracer.startActiveSpan(
          'authService.findAccount',
          async (dbSpan) => {
            const result = await this.accountRepo.findByEmail(dto.email);
            dbSpan.end();
            return result;
          }
        );

        if (!account) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Account not found'
          });
          throw new AuthError('Invalid credentials');
        }

        // Password verification span
        const isValid = await tracer.startActiveSpan(
          'authService.verifyPassword',
          async (pwSpan) => {
            const result = await this.passwordService.verify(
              account.hashed_password,
              dto.password
            );
            pwSpan.end();
            return result;
          }
        );

        if (!isValid) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Invalid password'
          });
          throw new AuthError('Invalid credentials');
        }

        span.setAttribute('account.id', account.account_id);
        span.setStatus({ code: SpanStatusCode.OK });

        // ... generate tokens

        span.end();
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        span.end();
        throw error;
      }
    });
  }
}
```

### Trace Context Propagation

```typescript
// Automatically propagated through HTTP headers by OpenTelemetry
// Frontend → Backend → Database all in same trace

// Manual propagation for background jobs
import { propagation, context } from '@opentelemetry/api';

export async function enqueueJob(jobData: any) {
  const carrier = {};
  propagation.inject(context.active(), carrier);

  await jobQueue.add({
    ...jobData,
    traceContext: carrier
  });
}

// In job processor
jobQueue.process(async (job) => {
  const ctx = propagation.extract(context.active(), job.data.traceContext);

  return context.with(ctx, async () => {
    // Job logic here - will be part of parent trace
  });
});
```

---

# 4. Error Tracking

## Sentry Integration

### Setup

```typescript
// utils/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export function initSentry(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `blue-harvest-backend@${process.env.APP_VERSION}`,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
      new Tracing.Integrations.Postgres()
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove passwords from event
      if (event.request?.data) {
        delete event.request.data.password;
      }

      // Don't send health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }

      return event;
    }
  });

  // Request handler must be first
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Error handler must be last
  app.use(Sentry.Handlers.errorHandler());
}
```

### Error Context

```typescript
// Capture errors with context
import * as Sentry from '@sentry/node';

export class AuthService {
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      // ... login logic
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: 'auth',
          operation: 'login'
        },
        user: {
          email: dto.email
        },
        extra: {
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent
        }
      });

      throw error;
    }
  }
}
```

### Performance Monitoring

```typescript
// Transaction tracking
export async function createPost(dto: CreatePostDto) {
  const transaction = Sentry.startTransaction({
    op: 'post.create',
    name: 'Create Post'
  });

  try {
    const span1 = transaction.startChild({ op: 'db.query', description: 'Insert post' });
    const post = await postRepo.create(dto);
    span1.finish();

    const span2 = transaction.startChild({ op: 's3.upload', description: 'Upload media' });
    if (dto.media) {
      await uploadMedia(dto.media);
    }
    span2.finish();

    transaction.setStatus('ok');
    return post;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

---

# 5. Health Checks

## Endpoint Implementation

```typescript
// routes/health.ts
import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/connection';
import { redis } from '../database/redis';

const router = Router();

// Simple liveness check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed readiness check
router.get('/health/ready', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
    overall: false
  };

  try {
    // Check database
    checks.database = await checkDatabaseHealth();

    // Check Redis
    await redis.ping();
    checks.redis = true;

    checks.overall = checks.database && checks.redis;

    const statusCode = checks.overall ? 200 : 503;

    res.status(statusCode).json({
      status: checks.overall ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Startup probe
router.get('/health/startup', async (req: Request, res: Response) => {
  // Check if app is initialized
  const isInitialized = await checkAppInitialization();

  res.status(isInitialized ? 200 : 503).json({
    status: isInitialized ? 'started' : 'starting',
    timestamp: new Date().toISOString()
  });
});

export default router;
```

### Kubernetes Health Checks

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: backend
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/ready
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /health/startup
              port: 4000
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 30
```

---

# 6. Alerting

## Alert Rules

### Prometheus Alerting Rules

**File**: `monitoring/alerts.yml`

```yaml
groups:
  - name: application
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "95th percentile response time is {{ $value }}s"

      # Database connection pool exhaustion
      - alert: DatabasePoolExhaustion
        expr: db_pool_active_connections / db_pool_max_connections > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool nearly exhausted"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: |
          sum(rate(cache_hits_total[5m])) /
          (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 0.5
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "Low cache hit rate"

      # Service down
      - alert: ServiceDown
        expr: up{job="backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend service is down"

  - name: business
    interval: 1m
    rules:
      # Spike in signups (potential bot attack)
      - alert: SignupSpike
        expr: |
          rate(user_signups_total[5m]) >
          avg_over_time(rate(user_signups_total[5m])[1h:5m]) * 3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Unusual spike in user signups"

      # No posts created in last hour (potential issue)
      - alert: NoPostsCreated
        expr: increase(posts_created_total[1h]) == 0
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "No posts created in the last hour"
```

### PagerDuty Integration

```typescript
// utils/alerting.ts
import { EventsAPIClient } from '@pagerduty/pdjs';

const pd = new EventsAPIClient({
  token: process.env.PAGERDUTY_TOKEN
});

export async function triggerAlert(
  severity: 'critical' | 'warning' | 'info',
  summary: string,
  details: any
) {
  if (severity === 'critical') {
    await pd.sendEvent({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY!,
      event_action: 'trigger',
      payload: {
        summary,
        severity,
        source: 'blue-harvest-backend',
        custom_details: details
      }
    });
  }

  // Also send to Slack
  await sendSlackAlert(severity, summary, details);
}

// Usage
if (errorRate > 0.05) {
  await triggerAlert(
    'critical',
    'High error rate detected',
    { errorRate, timestamp: new Date() }
  );
}
```

---

# 7. Performance Monitoring

## Application Performance Monitoring (APM)

### Custom Performance Marks

```typescript
// utils/performance.ts
import { performance, PerformanceObserver } from 'perf_hooks';

export class PerformanceMonitor {
  private observer: PerformanceObserver;

  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        logger.debug('Performance measurement', {
          name: entry.name,
          duration: entry.duration
        });

        // Track in Prometheus
        performanceDuration.observe(
          { operation: entry.name },
          entry.duration / 1000
        );
      }
    });

    this.observer.observe({ entryTypes: ['measure'] });
  }

  mark(name: string) {
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark?: string) {
    performance.measure(name, startMark, endMark);
  }
}

export const perfMonitor = new PerformanceMonitor();

// Usage
export class PostService {
  async getPostWithComments(postId: number) {
    perfMonitor.mark('getPost-start');

    const post = await this.postRepo.findById(postId);

    perfMonitor.mark('getPost-db-end');

    const comments = await this.commentRepo.findByPostId(postId);

    perfMonitor.mark('getPost-end');

    perfMonitor.measure('getPost-total', 'getPost-start', 'getPost-end');
    perfMonitor.measure('getPost-db', 'getPost-start', 'getPost-db-end');

    return { post, comments };
  }
}
```

---

## Real User Monitoring (RUM)

### Frontend Performance Tracking

```typescript
// frontend/utils/analytics.ts
import { sendToAnalytics } from './analytics';

// Track page load performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];

  sendToAnalytics('page-load', {
    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
    tcp: perfData.connectEnd - perfData.connectStart,
    request: perfData.responseStart - perfData.requestStart,
    response: perfData.responseEnd - perfData.responseStart,
    domParse: perfData.domContentLoadedEventEnd - perfData.responseEnd,
    total: perfData.loadEventEnd - perfData.fetchStart
  });
});

// Track API call performance
export async function apiCall(url: string, options: RequestInit) {
  const start = performance.now();

  try {
    const response = await fetch(url, options);
    const end = performance.now();

    sendToAnalytics('api-call', {
      url,
      method: options.method,
      duration: end - start,
      status: response.status
    });

    return response;
  } catch (error) {
    const end = performance.now();

    sendToAnalytics('api-call-error', {
      url,
      method: options.method,
      duration: end - start,
      error: error.message
    });

    throw error;
  }
}
```

---

# 8. Debugging Tools

## Debug Logging

```typescript
// Use debug package for verbose logging
import debug from 'debug';

const dbDebug = debug('app:database');
const authDebug = debug('app:auth');
const cacheDebug = debug('app:cache');

// Enable with: DEBUG=app:* npm run dev

export class AccountRepository {
  async findById(id: number): Promise<Account | null> {
    dbDebug('Finding account by ID: %d', id);

    const account = await this.readPool.maybeOne(
      sql.type(AccountSchema)`
        SELECT * FROM accounts WHERE account_id = ${id}
      `
    );

    dbDebug('Account found: %O', account);
    return account;
  }
}
```

## Request Debugging

```typescript
// middleware/requestDebug.ts
import { Request, Response, NextFunction } from 'express';

export function requestDebugMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.DEBUG_REQUESTS === 'true') {
    console.log('=== Request Debug ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('User:', req.user);
    console.log('===================');
  }

  next();
}
```

---

# 9. Monitoring Stack Deployment

## Docker Compose for Local Development

**File**: `docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=redis-datasource
    volumes:
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'

volumes:
  prometheus-data:
  grafana-data:
```

---

## Summary: Observability Checklist

### Logs ✅
- [x] Structured logging with Winston
- [x] Request/response logging
- [x] Error logging with stack traces
- [x] CloudWatch integration
- [x] Log aggregation

### Metrics ✅
- [x] Prometheus metrics collection
- [x] HTTP request metrics
- [x] Database query metrics
- [x] Business metrics
- [x] Grafana dashboards

### Traces ✅
- [x] OpenTelemetry setup
- [x] Distributed tracing
- [x] Custom spans
- [x] Jaeger visualization

### Error Tracking ✅
- [x] Sentry integration
- [x] Error context capture
- [x] Performance monitoring

### Health & Alerts ✅
- [x] Health check endpoints
- [x] Alerting rules
- [x] PagerDuty integration
- [x] Slack notifications

### Performance ✅
- [x] APM metrics
- [x] Real user monitoring
- [x] Performance profiling
- [x] Debug tools
