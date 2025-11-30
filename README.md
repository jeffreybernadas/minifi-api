# Minifi API

> Backend API for Minifi - an enterprise-grade URL shortener platform.

## ✨ Features

| Category | Features |
|----------|----------|
| **URL Shortening** | Custom aliases (PRO), password protection, scheduling, click limits, one-time links, QR codes |
| **Analytics** | Click tracking, geo/device/browser stats, UTM params, referrer tracking, unique visitors |
| **Security** | AI-powered URL scanning (OpenAI GPT-4o-mini), malicious link detection, Helmet headers |
| **Subscriptions** | Stripe integration, FREE/PRO tiers, usage limits, billing portal, webhook handling |
| **Email Notifications** | Welcome, security alerts, expiring links, monthly reports (React Email + Resend) |
| **Tags** | Custom colors, organize links, filter by tags |
| **Authentication** | Keycloak JWT, role-based access, user sync-on-demand pattern |
| **Real-time Chat** | WebSocket (Socket.IO), direct & group chats, typing indicators, read receipts, message editing |
| **Pagination** | Offset-based for lists, cursor-based for real-time data, consistent meta format |
| **Logging** | Winston structured logging, Elasticsearch aggregation, Kibana dashboards |
| **Monitoring** | Elastic APM (distributed tracing), Sentry (error tracking), health checks |
| **Rate Limiting** | Global + per-endpoint throttling, Redis-backed storage |
| **Caching** | Redis caching, cache invalidation strategies |
| **File Storage** | MinIO S3-compatible storage, pre-signed URLs, secure uploads |
| **Background Jobs** | RabbitMQ queues, scheduled cron jobs, retry logic |
| **API** | Versioned endpoints (/v1), Swagger docs, standardized responses |

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Framework |
| **TypeScript** | Language |
| **PostgreSQL** | Database |
| **Prisma** | ORM |
| **Redis** | Caching, rate limiting, WebSocket adapter |
| **RabbitMQ** | Message queues |
| **MinIO** | S3-compatible object storage |
| **Keycloak** | Authentication |
| **Stripe** | Payments |
| **Resend** | Email delivery |
| **OpenAI** | URL security scanning |

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- RabbitMQ
- MinIO
- Keycloak

Or use Docker Compose to run all infrastructure:

```bash
docker-compose up -d database redis rabbitmq minio keycloak keycloak-db
```

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
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

# (Optional) Seed database
npm run db:seed
```

### 4. Run the Application

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

## 📖 API Documentation

- **Swagger UI**: http://localhost:3001/api/docs
- **API Docs**: See [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

## 🧪 Testing

```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
npm run test:watch    # Watch mode
```

## 📁 Project Structure

```
src/
├── modules/              # Feature modules
│   ├── admin/            # Admin management (2D - pending)
│   ├── chat/             # WebSocket chat
│   ├── file/             # File uploads
│   ├── health/           # Health checks
│   ├── link/             # URL shortening + analytics
│   ├── subscription/     # Stripe subscriptions
│   └── user/             # User profiles
├── shared/               # Shared infrastructure
│   ├── guards/           # Auth & permission guards
│   ├── keycloak/         # Keycloak integration
│   ├── logger/           # Winston logger
│   ├── mail/             # Email templates (React Email)
│   ├── queues/           # RabbitMQ queues + crons
│   ├── scan/             # URL security scanning
│   ├── storage/          # MinIO storage
│   └── websocket/        # Socket.IO gateway
├── config/               # Configuration modules
├── database/             # Prisma schema & migrations
├── worker/               # Background worker module
├── main.ts               # API entry point
└── main.worker.ts        # Worker entry point
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start API in development mode |
| `npm run start:worker:dev` | Start worker in development mode |
| `npm run pm2:dev` | Build + start both with PM2 |
| `npm run pm2:prod` | Build + start both with PM2 (production) |
| `npm run pm2:logs` | View PM2 logs |
| `npm run pm2:status` | View PM2 process status |
| `npm run pm2:stop` | Stop all PM2 processes |
| `npm run build` | Build for production |
| `npm run db:migrate:dev` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |
| `npm run email:dev` | Preview email templates |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

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

### User Tiers

| Feature | GUEST | FREE | PRO |
|---------|-------|------|-----|
| Links | 5/day | 25 total | Unlimited |
| Retention | 3 days | 3 months | 2 years |
| Custom aliases | ❌ | ❌ | ✅ |
| Analytics | ❌ | Basic | Full |
| Email notifications | ❌ | ✅ | ✅ |

## 📄 License

MIT
