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

- Node.js 24 LTS+
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

---

## 📐 Development Guidelines

### Utilities

| Utility | Location |
|---------|----------|
| LoggerService | `src/shared/logger/logger.service.ts` |
| Response Interceptor | `src/interceptors/transform-response.interceptor.ts` |
| Exception Filter | `src/filters/exceptions.filter.ts` |
| Swagger Decorators | `src/decorators/swagger.decorator.ts` |
| Pagination Utils | `src/utils/pagination/prisma-pagination.util.ts` |
| Password Utils | `src/utils/password/password.util.ts` |
| Short Code Generator | `src/utils/shortcode/shortcode.util.ts` |
| QR Code Generator | `src/utils/qrcode/qrcode.util.ts` |
| MinIO Storage | `src/shared/storage/minio.service.ts` |
| Email Service | `src/shared/mail/resend.service.ts` |

### Response Format

The interceptor automatically wraps all responses:

```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/v1/links",
  "timestamp": "2025-11-29T12:00:00.000Z",
  "data": { },
  "meta": { }
}
```

### Path Aliases

```typescript
import { LoggerService } from '@/shared/logger/logger.service';
```

---

## 🏛️ Architecture Overview

### Dual Process Pattern

- **Main Application** (`main.ts`) - HTTP REST API + WebSocket
- **Worker Process** (`main.worker.ts`) - RabbitMQ consumers + Cron jobs

---

## 🔧 Existing Infrastructure

### Logging

```typescript
constructor(private readonly logger: LoggerService) {}

this.logger.log('Message', 'ContextName', { meta });
this.logger.warn('Warning', 'ContextName', { details });
this.logger.error('Error', 'ContextName', error?.stack);
```

### Pagination

**Offset (for standard lists):**

```typescript
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';

return offsetPaginateWithPrisma(this.prisma.link, pageOptions, {
  where: { userId },
  orderBy: { createdAt: 'desc' },
});
```

**Cursor (for real-time feeds):**

```typescript
import { cursorPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';

return cursorPaginateWithPrisma(this.prisma.message, pageOptions, {
  where: { chatId },
}, 'id');
```

### Swagger Decorators

```typescript
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';

@ApiStandardResponse({ status: 200, type: LinkResponseDto })
@ApiStandardErrorResponse({ status: 404, errorCode: 'NOT_FOUND' })
@ApiPaginatedResponse(LinkResponseDto)
```

### Guards

| Guard | Purpose |
|-------|---------|
| Keycloak AuthGuard | JWT validation (global) |
| AdminGuard | Admin/superadmin role check |
| ProTierGuard | PRO subscription check |
| UsageLimitGuard | FREE tier link cap (25) |
| SubscriptionTierGuard | PRO-only features (custom alias) |

```typescript
@Public()  // Skip auth
@UseGuards(AdminGuard)  // Require admin role
@UseGuards(ProTierGuard)  // Require PRO tier
```

---

## 📝 Code Patterns

### Controller Pattern

```typescript
@ApiTags('feature')
@ApiBearerAuth('JWT')
@Controller({ path: 'feature', version: '1' })
export class FeatureController {
  constructor(
    private readonly service: FeatureService,
    private readonly logger: LoggerService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get item' })
  @ApiStandardResponse({ status: 200, type: ResponseDto })
  @ApiStandardErrorResponse({ status: 404, errorCode: 'NOT_FOUND' })
  async getItem(@Param('id') id: string): Promise<ResponseDto> {
    return this.service.getItem(id);
  }
}
```

### Service Pattern

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async getItem(id: string): Promise<ResponseDto> {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}
```

### DTO Pattern

```typescript
// Request DTO
export class CreateItemDto {
  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

// Filter DTO (extends pagination)
export class ItemFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;
}
```

---

## 📊 Endpoints Summary

| Module | Count | Description |
|--------|-------|-------------|
| Health | 1 | Health check |
| User | 2 | Profile management |
| Link | 12 | URL shortening & management |
| Redirect | 2 | Public redirect & password verify |
| Tags | 6 | Tag CRUD & assignment |
| Subscription | 5 | Stripe integration |
| File Upload | 2 | Single & multiple uploads |
| Chat | 7 | PRO-to-admin messaging |
| Admin | 16 | Platform management |
| **Total** | **53** | |

---

## ⏰ Cron Jobs

All scheduled jobs run in **Philippine Time (Asia/Manila)**.

| Job | Schedule (PHT) | Purpose |
|-----|----------------|---------|
| activateScheduledLinks | Every hour | SCHEDULED → ACTIVE |
| disableExpiredLinks | Every hour | Expire old links |
| deleteExpiredGuestLinks | Daily 3 AM | Clean guest links (3 days) |
| deleteOldFreeLinks | Daily 3 AM | Clean FREE links (90 days) |
| sendFreeLinkDeletionWarnings | Daily 9 AM | Warn FREE users 7 days before |
| sendExpiringLinkNotifications | Daily 9 AM | Warn links expiring in 3 days |
| sendMonthlyReports | 1st of month 9 AM | Monthly stats to PRO + FREE |
| handleUnreadDigest | Daily 8 PM | Chat unread digest |

---

## 📬 Queue Consumers

| Consumer | Queue | Purpose |
|----------|-------|---------|
| EmailConsumer | `email.send` | Send emails via Resend |
| ScanConsumer | `scan.url` | OpenAI URL security scan |

---

## 📧 Email Templates

| Trigger | Template |
|---------|----------|
| New user | `welcome-email` |
| PRO upgrade | `subscription-email` |
| Subscription cancel | `subscription-email` |
| Security threat | `security-alert-email` |
| Link expiring | `link-expiring-email` |
| FREE link deletion | `link-deletion-warning-email` |
| Monthly report (PRO) | `monthly-report-email` |
| Monthly report (FREE) | `free-monthly-report-email` |
| Chat unread digest | `chat-unread-digest` |

---

## 📄 License

MIT
