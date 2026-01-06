<div align="center">

# Minifi API

Backend API for Minifi - an enterprise-grade URL shortener platform.

🔗 **https://minifi.thecodebit.online**

**Frontend:** [minifi](https://github.com/jeffreybernadas/minifi)

</div>

## ✨ Features

| Category                | Features                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **URL Shortening**      | Custom aliases (PRO), password protection, scheduling, click limits, one-time links, QR codes            |
| **Analytics**           | Click tracking, geo/device/browser stats, UTM params, referrer tracking, unique visitors                 |
| **Security**            | AI-powered URL scanning (OpenAI GPT-4o-mini), malicious link detection, Helmet headers                   |
| **Subscriptions**       | Stripe integration, FREE/PRO tiers, usage limits, billing portal, webhook handling                       |
| **Email Notifications** | Welcome, security alerts, expiring links, monthly reports (React Email + Resend)                         |
| **Tags**                | Custom colors, organize links, filter by tags                                                            |
| **Authentication**      | Keycloak JWT, role-based access, user sync-on-demand pattern                                             |
| **Real-time Chat**      | WebSocket (Socket.IO), direct chats, typing indicators, read receipts, message editing, message deletion |
| **Pagination**          | Offset-based for lists, cursor-based for real-time data, consistent meta format                          |
| **Logging**             | Winston structured logging, Elasticsearch aggregation, Kibana dashboards                                 |
| **Monitoring**          | Elastic APM (distributed tracing), Sentry (error tracking), health checks                                |
| **Rate Limiting**       | Global + per-endpoint throttling, Redis-backed storage                                                   |
| **Caching**             | Redis caching, cache invalidation strategies                                                             |
| **File Storage**        | MinIO S3-compatible storage, pre-signed URLs, secure uploads                                             |
| **Background Jobs**     | RabbitMQ queues, scheduled cron jobs, retry logic                                                        |
| **API**                 | Versioned endpoints (/v1), Swagger docs, standardized responses and custom app error handling            |

## 🛠️ Tech Stack

### Core

| Technology     | Purpose                                   |
| -------------- | ----------------------------------------- |
| **NestJS**     | Framework                                 |
| **TypeScript** | Language                                  |
| **PostgreSQL** | Database                                  |
| **Prisma**     | ORM & migrations                          |
| **Redis**      | Caching, rate limiting, WebSocket adapter |
| **RabbitMQ**   | Message queues & background jobs          |
| **Socket.IO**  | WebSocket real-time communication         |

### Infrastructure

| Technology        | Purpose                        |
| ----------------- | ------------------------------ |
| **MinIO**         | S3-compatible object storage   |
| **Keycloak**      | Authentication & authorization |
| **Elasticsearch** | Log aggregation & search       |
| **Kibana**        | Log visualization              |

### Monitoring & Logging

| Technology      | Purpose                           |
| --------------- | --------------------------------- |
| **Winston**     | Structured logging                |
| **Elastic APM** | Distributed tracing & performance |
| **Sentry**      | Error tracking & monitoring       |

### External Services

| Service    | Purpose                             |
| ---------- | ----------------------------------- |
| **Stripe** | Payment processing & subscriptions  |
| **Resend** | Transactional email delivery        |
| **OpenAI** | URL security scanning (GPT-4o-mini) |

### Email & Templates

| Technology      | Purpose                   |
| --------------- | ------------------------- |
| **React Email** | Email template components |
| **Resend**      | Email delivery API        |

## 📋 Prerequisites

- Node.js 24 LTS+
- PostgreSQL
- Redis
- RabbitMQ
- MinIO
- Keycloak

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd minifi-api
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npm run db:migrate:dev
```

### 4. Seed Database (Optional)

The seeder creates demo data for testing. Since users are managed by Keycloak, you must provide existing Keycloak user IDs. For roles, `admin` or `superadmin` are utilized for administrator accounts.

```bash
# Add to .env - comma-separated Keycloak user UUIDs
SEED_USER_IDS=uuid-1,uuid-2

# Run seeder
npm run db:seed
```

**What gets seeded per user:**

| Data         | Count          | Details                                                                |
| ------------ | -------------- | ---------------------------------------------------------------------- |
| Tags         | 5              | Work, Personal, Marketing, Social, Important                           |
| Links        | 15             | 10 active, 2 suspicious, 1 scheduled, 1 disabled, 1 password-protected |
| Analytics    | 30-60 per link | Clicks over 30 days with geo/device/browser data                       |
| Subscription | 1              | FREE tier                                                              |

### 5. Run the Application

**Option A: Two terminals (development)**

```bash
# Terminal 1 - API server
npm run start:dev

# Terminal 2 - Background worker
npm run start:worker:dev
```

**Option B: PM2 (recommended)**

```bash
# Install PM2 globally (first time only)
npm install -g pm2

# Build and start both processes
npm run pm2:dev

# View logs
npm run pm2:logs

# Check status
npm run pm2:status
```

The API will be available at `http://localhost:3001`.

## 📜 Available Scripts

| Script                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `npm run start:dev`        | Start API in development mode            |
| `npm run start:worker:dev` | Start worker in development mode         |
| `npm run pm2:dev`          | Build + start both with PM2              |
| `npm run pm2:prod`         | Build + start both with PM2 (production) |
| `npm run pm2:logs`         | View PM2 logs                            |
| `npm run pm2:status`       | View PM2 process status                  |
| `npm run pm2:stop`         | Stop all PM2 processes                   |
| `npm run build`            | Build for production                     |
| `npm run db:migrate:dev`   | Run Prisma migrations                    |
| `npm run db:studio`        | Open Prisma Studio                       |
| `npm run db:seed`          | Seed database                            |
| `npm run email:dev`        | Preview email templates                  |
| `npm run lint`             | Run ESLint                               |
| `npm run format`           | Run Prettier                             |
| `npm test`                 | Run unit tests                           |
| `npm run test:e2e`         | Run E2E tests                            |
| `npm run test:cov`         | Run tests with coverage                  |

## 📚 API Documentation

Swagger UI: http://localhost:3001/docs

## 🏗️ Architecture

### Dual Process Pattern

```
┌─────────────────────┐    ┌─────────────────────┐
│   MAIN APP          │    │   WORKER            │
│   (main.ts)         │    │   (main.worker.ts)  │
├─────────────────────┤    ├─────────────────────┤
│ • HTTP REST API     │    │ • RabbitMQ consumers│
│ • WebSocket (chat)  │    │ • Cron jobs         │
│ • Rate limiting     │    │ • Email sending     │
│                     │    │ • Security scanning │
└─────────────────────┘    └─────────────────────┘
          │                          │
          └──────────┬───────────────┘
                     │
                RabbitMQ
```

### 👤 User Tiers

| Feature                       | GUEST  | FREE     | PRO       |
| ----------------------------- | ------ | -------- | --------- |
| Links                         | 5/day  | 25 total | Unlimited |
| Retention                     | 3 days | 90 days  | 2 years   |
| Custom aliases                | -      | -        | Yes       |
| Password protection           | -      | Yes      | Yes       |
| Tags                          | -      | Yes      | Yes       |
| QR codes                      | -      | Yes      | Yes       |
| Basic analytics               | -      | Yes      | Yes       |
| Full analytics (geo, devices) | -      | -        | Yes       |
| Click log history             | -      | -        | Yes       |
| Chat support                  | -      | -        | Yes       |
| Email notifications           | -      | Yes      | Yes       |

## 🔗 Endpoints Summary

| Module       | Count  | Description                                         |
| ------------ | ------ | --------------------------------------------------- |
| Health       | 1      | Health check                                        |
| User         | 2      | Profile management                                  |
| Link         | 12     | URL shortening & management                         |
| Redirect     | 2      | Public redirect & password verify                   |
| Tags         | 6      | Tag CRUD & assignment                               |
| Subscription | 5      | Stripe integration                                  |
| File Upload  | 2      | Single & multiple uploads                           |
| Chat         | 7      | PRO-to-admin messaging                              |
| Admin        | 16     | Platform management                                 |
| Advisory     | 8      | System advisories (admin CRUD + user fetch/dismiss) |
| **Total**    | **61** |                                                     |

## ⏰ Cron Jobs

All scheduled jobs run in **Philippine Time (Asia/Manila)**.

| Job                           | Schedule (PHT)    | Purpose                       |
| ----------------------------- | ----------------- | ----------------------------- |
| activateScheduledLinks        | Every hour        | SCHEDULED → ACTIVE            |
| disableExpiredLinks           | Every hour        | Expire old links              |
| deleteExpiredGuestLinks       | Daily 3 AM        | Clean guest links (3 days)    |
| deleteOldFreeLinks            | Daily 3 AM        | Clean FREE links (90 days)    |
| sendFreeLinkDeletionWarnings  | Daily 9 AM        | Warn FREE users 7 days before |
| sendExpiringLinkNotifications | Daily 9 AM        | Warn links expiring in 3 days |
| sendMonthlyReports            | 1st of month 9 AM | Monthly stats to PRO + FREE   |
| handleUnreadDigest            | Daily 8 PM        | Chat unread digest            |

## 📬 Queue Consumers

| Consumer      | Queue        | Purpose                  |
| ------------- | ------------ | ------------------------ |
| EmailConsumer | `email.send` | Send emails via Resend   |
| ScanConsumer  | `scan.url`   | OpenAI URL security scan |

## ✉️ Email Templates

| Trigger               | Template                      |
| --------------------- | ----------------------------- |
| New user              | `welcome-email`               |
| PRO upgrade           | `subscription-email`          |
| Subscription cancel   | `subscription-email`          |
| Security threat       | `security-alert-email`        |
| Link expiring         | `link-expiring-email`         |
| FREE link deletion    | `link-deletion-warning-email` |
| Monthly report (PRO)  | `monthly-report-email`        |
| Monthly report (FREE) | `free-monthly-report-email`   |
| Chat unread digest    | `chat-unread-digest`          |

## 📖 Development Guidelines

### Path Aliases

Always use `@/` path alias:

```typescript
// Correct
import { LoggerService } from '@/shared/logger/logger.service';

// Wrong
import { LoggerService } from '../../../shared/logger/logger.service';
```

### Guards

| Guard                 | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| Keycloak AuthGuard    | JWT validation (global)                            |
| BlockedUserGuard      | Prevents blocked users from accessing API (global) |
| AdminGuard            | Admin/superadmin role check                        |
| ProTierGuard          | PRO subscription check                             |
| UsageLimitGuard       | FREE tier link cap (25)                            |
| SubscriptionTierGuard | PRO-only features (custom alias)                   |

```typescript
@Public()  // Skip auth (also skips BlockedUserGuard)
@UseGuards(AdminGuard)  // Require admin role
@UseGuards(ProTierGuard)  // Require PRO tier
```

### Response Format

All responses are wrapped by the interceptor:

```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/v1/links",
  "timestamp": "2025-11-29T12:00:00.000Z",
  "data": {},
  "meta": {}
}
```

### Logging

```typescript
constructor(private readonly logger: LoggerService) {}

this.logger.log('Message', 'ContextName', { meta });
this.logger.warn('Warning', 'ContextName', { details });
this.logger.error('Error', 'ContextName', error?.stack);
```

## 📄 License

MIT
