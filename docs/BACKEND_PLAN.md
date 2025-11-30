# Minifi - Backend Development Plan

> **Last Updated:** November 30, 2025  
> **Current Phase:** Phase 2D (Admin Module)  
> **Directory:** `minifi-api/`

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** | Project overview & architecture |
| **[FRONTEND_PLAN.md](./FRONTEND_PLAN.md)** | Frontend development plan |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | API endpoint reference |
| **[BACKEND_API_RULES.md](./BACKEND_API_RULES.md)** | Coding standards |

---

## 📊 Progress Overview

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1A** | ✅ Complete | Database schema & foundation |
| **Phase 1B** | ✅ Complete | Core URL shortening |
| **Phase 1C** | ✅ Complete | Tags, QR codes, cron jobs |
| **Phase 1D** | ✅ Complete | Analytics tracking |
| **Phase 1E** | ✅ Complete | Final integration |
| **Phase 2A** | ✅ Complete | OpenAI security scanning |
| **Phase 2B** | ✅ Complete | Stripe subscriptions |
| **Phase 2C** | ✅ Complete | Email notifications |
| **Phase 2D** | 📋 Pending | Admin module |

---

## ✅ Phase 1: Foundation & Core (COMPLETE)

<details>
<summary><strong>Click to expand Phase 1 details</strong></summary>

### Phase 1A: Database & Schema ✅
- [x] Prisma schema with all models (Link, LinkAnalytics, Tag, LinkTag, User)
- [x] Enums: LinkStatus, SecurityStatus, UserType
- [x] Migrations applied and tested
- [x] Prisma client generated

### Phase 1B: Core URL Shortening ✅
- [x] Link CRUD operations
- [x] Guest link creation (5/day, 3-day retention)
- [x] Short code generation (nanoid, base58)
- [x] Custom alias validation (PRO only)
- [x] Password protection (bcrypt)
- [x] Client-side redirect pattern
- [x] Rate limiting (IP-based for guests)

### Phase 1C: Advanced Features ✅
- [x] Tags module (CRUD, assign/remove)
- [x] Tag colors (backgroundColor + textColor)
- [x] QR code generation utility
- [x] Link scheduling (scheduledAt)
- [x] Link expiration (expiresAt)
- [x] Click limits
- [x] One-time links
- [x] Archive/Unarchive separation

### Phase 1D: Analytics ✅
- [x] Click tracking (fire-and-forget)
- [x] Visitor ID hashing (SHA-256)
- [x] Unique visitor tracking
- [x] User-Agent parsing
- [x] GeoIP lookup (geoip-lite)
- [x] UTM parameter capture
- [x] Referrer domain extraction
- [x] Analytics summary endpoint

### Phase 1E: Infrastructure ✅
- [x] Cron jobs (scheduling, expiration, cleanup)
- [x] LinkModule registered in api.module.ts
- [x] Worker module configured
- [x] API documentation

</details>

---

## 🚧 Phase 2A: OpenAI Security Scanning

**Goal:** Automatically detect malicious, suspicious, or adult content URLs.

**Timeline:** 3-5 days

**Current behavior (implemented):**
- Enqueue scan on authenticated link creation; guest links are not scanned.
- Redirects never block; for non-SAFE statuses they return a warning payload (status/score/reasons) so the frontend can show an interstitial.
- Manual rescan endpoint (`POST /links/:id/rescan`) resets scan status to PENDING and enqueues with `force=true`.
- Feature flag `ENABLE_URL_SCAN` (default true) gates enqueue behavior.
- No aging/periodic rescans; updates do not change originalUrl, so no update-triggered scans.

### 2A.1 Configuration Setup

**Files to Create:**
```
src/config/openai/
├── openai.config.ts        # OpenAI configuration
└── openai.config.type.ts   # Type definitions
```

**Environment Variables (.env):**
```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.2
```

**Implementation:**
```typescript
// src/config/openai/openai.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
}));
```

---

### 2A.2 Security Module Structure

**Files to Create:**
```
src/modules/security/
├── security.module.ts
├── security.service.ts
├── openai.service.ts
└── dto/
    ├── scan-url.dto.ts
    ├── scan-result.dto.ts
    └── security-status.dto.ts
```

**OpenAI Service:**
```typescript
// src/modules/security/openai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LoggerService } from '@/shared/logger/logger.service';

export interface SecurityScanResult {
  isSafe: boolean;
  score: number;           // 0.0 to 1.0 (1.0 = completely safe)
  status: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'ADULT_CONTENT';
  threats: string[];
  reasoning: string;
  recommendations: string;
}

@Injectable()
export class OpenAIService {
  private client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow('openai.apiKey'),
    });
  }

  async scanUrl(url: string): Promise<SecurityScanResult> {
    const prompt = this.buildScanPrompt(url);

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.getOrThrow('openai.model'),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.get<number>('openai.maxTokens'),
        temperature: this.config.get<number>('openai.temperature'),
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return JSON.parse(content) as SecurityScanResult;
    } catch (error) {
      this.logger.error('OpenAI scan failed', 'OpenAIService', error?.stack);
      return {
        isSafe: true,
        score: 0.5,
        status: 'SAFE',
        threats: [],
        reasoning: 'Scan failed, defaulting to safe',
        recommendations: 'Manual review recommended',
      };
    }
  }

  private buildScanPrompt(url: string): string {
    return `You are a URL security analyzer. Analyze the following URL for potential security threats.

URL: ${url}

Analyze for:
1. Phishing attempts (fake login pages, brand impersonation, credential theft)
2. Malware distribution (suspicious file downloads, exploit kits)
3. Suspicious URL patterns (unusual characters, homograph attacks, typosquatting)
4. Known malicious domain patterns
5. Adult/NSFW content indicators
6. Social engineering tactics

Respond ONLY with valid JSON in this exact format:
{
  "isSafe": boolean,
  "score": number (0.0 to 1.0, where 1.0 is completely safe),
  "status": "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "ADULT_CONTENT",
  "threats": ["array", "of", "detected", "threats"],
  "reasoning": "brief explanation of the analysis",
  "recommendations": "what action should be taken"
}`;
  }
}
```

---

### 2A.3 Security Queue Processing

**Update Queue Constants:**
```typescript
// src/shared/queues/constants/queue.constant.ts
export const QUEUE_EXCHANGES = {
  EMAIL: 'email.exchange',
  CHAT: 'chat.exchange',
  SECURITY: 'security.exchange',      // NEW
  NOTIFICATION: 'notification.exchange', // NEW
} as const;

export const QUEUE_NAMES = {
  EMAIL_SEND: 'email.send',
  CHAT_UNREAD_DIGEST: 'chat.unread.digest',
  SECURITY_SCAN: 'security.scan',     // NEW
  NOTIFICATION_SEND: 'notification.send', // NEW
} as const;
```

**Files to Create:**
```
src/shared/queues/security/
├── security.module.ts
├── security.producer.ts
├── security.consumer.ts
└── dto/
    └── security-job.dto.ts
```

**Security Consumer:**
```typescript
// src/shared/queues/scan/scan.consumer.ts
@Injectable()
export class ScanConsumer {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  @RabbitSubscribe({
    exchange: QUEUE_EXCHANGES.SECURITY,
    routingKey: QUEUE_ROUTING_KEYS.SECURITY_SCAN,
    queue: QUEUE_NAMES.SECURITY_SCAN,
  })
  async handleSecurityScan(job: SecurityScanJob): Promise<void> {
    const result = await this.openaiService.scanUrl(job.url);

    const statusMap: Record<string, SecurityStatus> = {
      SAFE: SecurityStatus.SAFE,
      SUSPICIOUS: SecurityStatus.SUSPICIOUS,
      MALICIOUS: SecurityStatus.MALICIOUS,
      ADULT_CONTENT: SecurityStatus.ADULT_CONTENT,
    };

    await this.prisma.link.update({
      where: { id: job.linkId },
      data: {
        securityStatus: statusMap[result.status] || SecurityStatus.SAFE,
        securityScore: result.score,
        scannedAt: new Date(),
      },
    });

    // If malicious, trigger notification
    if (!result.isSafe && job.userId) {
      // TODO: Queue notification email
    }
  }
}
```

---

### 2A.4 Integration Points

**Update LinkService (createLink):**
```typescript
// After link creation, queue security scan
await this.securityProducer.queueScan({
  linkId: link.id,
  url: link.originalUrl,
  userId,
});
```

**Redirect behavior:** No blocking. For non-SAFE scan statuses, the redirect response includes a `warning` payload (status/score/reasons/recommendations/scannedAt) so the frontend can show an interstitial.

---

### 2A.5 Tasks Checklist

```
PHASE 2A: Security Scanning
├── [x] Install `openai` package
├── [x] Create OpenAI config module
├── [x] Add env variables
├── [x] Implement OpenAIService (UrlScanService)
├── [x] Create Scan module/queue wiring
├── [x] Update queue constants
├── [x] Create ScanProducer
├── [x] Create ScanConsumer
├── [x] Integrate with LinkService.createLink (guest excluded)
├── [x] Update RedirectController for warning response (no blocking)
├── [x] Add to worker.module.ts
├── [ ] Create security scan cron (rescan old links) — skipped for cost control
├── [x] Add POST /links/:id/rescan endpoint
└── [x] Cache scan results in Redis (24h TTL)
```

---

## ✅ Phase 2B: Subscription System (Stripe)

**Goal:** Implement FREE/PRO tier enforcement and payment processing. **Status:** Complete.

**Decisions/Rules:**
- PRO: unlimited links.
- FREE: cap at 25 active links (no monthly reset). Enforce via guard on create.
- Tier/feature checks belong in guards/decorators (e.g., custom alias for PRO), not in services.
- No monthly usage reset cron; rely on static cap for FREE.
- Webhooks drive subscription state; for local dev use Stripe CLI: `stripe listen --forward-to http://localhost:3001/api/v1/subscriptions/webhook` and set the CLI-provided signing secret as `STRIPE_WEBHOOK_SECRET`.

**Endpoints:**
- `GET /v1/subscriptions/me` – current subscription
- `POST /v1/subscriptions/checkout` – Checkout session for PRO (returns `{ url }`)
- `POST /v1/subscriptions/portal` – Billing Portal session (returns `{ url }`)
- `POST /v1/subscriptions/cancel` – cancel at period end (revert to FREE)
- `POST /v1/subscriptions/webhook` – Stripe webhook (public)

**Enforcement:**
- `UsageLimitGuard` (FREE cap: 25 active links) on link creation.
- `SubscriptionTierGuard` (custom aliases PRO-only) on link creation.
- `user.userType` synced from subscription via webhooks.

**Local Dev (Stripe CLI Setup):**

1. **Install Stripe CLI:** Download from https://stripe.com/docs/stripe-cli
2. **Login to correct account:**
   ```bash
   ./stripe.exe login
   # Ensure you're logged into the same account as your STRIPE_API_KEY
   stripe whoami  # Verify account matches
   ```
3. **Start webhook forwarding:**
   ```bash
   ./stripe.exe listen --forward-to http://localhost:3001/api/v1/subscriptions/webhook
   ```
4. **Copy the webhook secret:** The CLI outputs `whsec_xxxxx` - set this as `STRIPE_WEBHOOK_SECRET` in `.env`
5. **Restart NestJS server** to pick up the new secret
6. **Test with trigger:**
   ```bash
   ./stripe.exe trigger customer.subscription.created
   ```

**Important:** The CLI generates a NEW secret each session. Always update `.env` when restarting `stripe listen`.

### 2B.1 Database Schema

**Add to schema.prisma:**
```prisma
enum SubscriptionTier {
  FREE
  PRO
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  INCOMPLETE
  TRIALING
}

model Subscription {
  id        String             @id @default(uuid())
  userId    String             @unique
  tier      SubscriptionTier   @default(FREE)
  status    SubscriptionStatus @default(ACTIVE)

  // Stripe integration
  stripeCustomerId       String?  @unique
  stripeSubscriptionId   String?  @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?

  // Usage tracking
  linksCreatedThisMonth Int @default(0)
  linksCreatedAllTime   Int @default(0)

  // Preferences
  emailNotifications    Boolean @default(true)
  securityAlertEmails   Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tier, status])
  @@index([stripeCustomerId])
}
```

---

### 2B.2 Module Structure

**Files to Create:**
```
src/modules/subscription/
├── subscription.module.ts
├── subscription.controller.ts
├── subscription.service.ts
├── stripe.service.ts
├── stripe-webhook.controller.ts
└── dto/
    ├── checkout.dto.ts
    ├── subscription-response.dto.ts
    └── webhook-event.dto.ts
```

---

### 2B.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/subscriptions/me` | Get current subscription |
| POST | `/v1/subscriptions/checkout` | Create Stripe checkout session |
| POST | `/v1/subscriptions/portal` | Create billing portal session |
| POST | `/v1/subscriptions/cancel` | Cancel subscription |
| POST | `/v1/subscriptions/webhook` | Stripe webhook (public) |

---

### 2B.4 Guards

**Files to Create:**
```
src/shared/guards/
├── subscription-tier.guard.ts
├── usage-limit.guard.ts
└── admin.guard.ts

src/decorators/
├── requires-tier.decorator.ts
└── current-subscription.decorator.ts
```

**UsageLimitGuard:**
```typescript
@Injectable()
export class UsageLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const subscription = await this.subscriptionService.getSubscription(userId);
    const limits = subscription.tier === 'PRO' ? PRO_LIMITS : FREE_LIMITS;

    if (limits.maxLinks === -1) return true; // Unlimited

    const currentCount = await this.subscriptionService.getCurrentLinkCount(userId);

    if (currentCount >= limits.maxLinks) {
      throw new ForbiddenException({
        code: 'LIMIT_REACHED',
        message: `You've reached your limit of ${limits.maxLinks} links.`,
      });
    }

    return true;
  }
}
```

---

### 2B.5 Tasks Checklist

```
PHASE 2B: Subscriptions ✅ COMPLETE
├── [x] Add Subscription model to schema
├── [x] Run migration
├── [x] Create Stripe config module
├── [x] Install `stripe` + `@golevelup/nestjs-stripe` packages
├── [x] Implement StripeService (checkout, portal, cancel, webhook handling)
├── [x] Implement SubscriptionService (getOrCreate, updateFromStripe, syncUserType)
├── [x] Create SubscriptionController (me, checkout, portal, cancel endpoints)
├── [x] Add webhook endpoint with @Public() decorator (consolidated in SubscriptionController)
├── [x] Add raw body parser for webhooks (rawBody: true in main.ts)
├── [x] Create UsageLimitGuard (FREE: 25 active links cap)
├── [x] Create SubscriptionTierGuard (custom aliases PRO-only)
├── [x] Update LinkController with guards (@UseGuards on createLink)
├── [x] Decision: No monthly usage reset cron (static 25-link cap for FREE)
├── [x] Setup Stripe CLI for local dev webhook forwarding
└── [x] Test checkout → webhook → upgrade flow
```

---

## 📋 Phase 2C: Email Notifications

**Goal:** Notify users of security alerts, expiring links, and account activity.

**Timeline:** 3-4 days

**Rules & Preferences:**
- Users can opt out of all email notifications via `User.emailNotificationsEnabled` (default **true**); every notification flow must check this flag before sending.
- Users update preferences via `PATCH /v1/users/preferences` (emailNotificationsEnabled, phoneNumber, avatarUrl, address).
- When queuing emails for registered users, always include `userId` in the job DTO to enable preference checks.

### 2C.1 Email Templates (React Email)

**Files to Create:**
```
src/shared/mail/templates/
├── welcome-email.tsx
├── security-alert-email.tsx
├── link-expiring-email.tsx
├── monthly-report-email.tsx
└── subscription-email.tsx
```

### 2C.2 Notification Crons

- **Daily 9 AM:** Send expiring link warnings (3 days before)
- **Monthly 1st 10 AM:** Send monthly reports (PRO users)

### 2C.3 Tasks Checklist

```
PHASE 2C: Email Notifications
├── [x] Add emailNotificationsEnabled preference (User model)
├── [x] Create PATCH /users/preferences endpoint
├── [x] Add opt-out check to EmailQueueService (if userId provided)
├── [x] Create WelcomeEmail template (React Email)
├── [x] Create SecurityAlertEmail template
├── [x] Create LinkExpiringEmail template
├── [x] Create MonthlyReportEmail template
├── [x] Create SubscriptionEmail template
├── [x] Update EmailRenderer with new templates
├── [x] Create NotificationCron (expiring links + monthly reports)
├── [x] Integrate with ScanConsumer (security alerts)
├── [x] Integrate with UserService (welcome email)
└── [x] Integrate with SubscriptionService (upgrade/cancel emails)
```

**Architecture Decision:** Using single email queue with opt-out check instead of separate notification queue. Simpler, less latency, same functionality.

---

## 📋 Phase 2D: Admin Module

**Goal:** Internal tools for platform management, user/link moderation, and audit logging.

**Timeline:** 5-7 days

**Authentication & Authorization:**
- All admin endpoints require valid Keycloak JWT (via global AuthGuard)
- Additional `AdminGuard` checks for `admin` or `superadmin` role in JWT

### 2D.1 Database Schema Changes

**Add to User model:**
```prisma
model User {
  // ... existing fields
  isBlocked      Boolean   @default(false)
  blockedAt      DateTime?
  blockedReason  String?
}
```

**Add BLOCKED status to LinkStatus enum:**
```prisma
enum LinkStatus {
  ACTIVE
  SCHEDULED
  DISABLED
  ARCHIVED
  BLOCKED      // Admin-blocked
}
```

### 2D.2 Module Structure

**Files to Create:**
```
src/modules/admin/
├── admin.module.ts
├── admin.controller.ts          # Stats, analytics, audit
├── admin-user.controller.ts     # User management
├── admin-link.controller.ts     # Link management
├── admin.service.ts             # Stats, analytics
├── admin-user.service.ts        # User CRUD, block/unblock
├── admin-link.service.ts        # Link CRUD, block/unblock, rescan
└── dto/
    ├── admin-stats.dto.ts
    ├── platform-analytics.dto.ts
    ├── security-overview.dto.ts
    ├── user-list-filter.dto.ts
    ├── user-detail.dto.ts
    ├── change-tier.dto.ts
    ├── block-user.dto.ts
    ├── link-list-filter.dto.ts
    ├── link-detail.dto.ts
    ├── edit-link.dto.ts
    ├── block-link.dto.ts
src/shared/guards/
└── admin.guard.ts
```

### 2D.3 API Endpoints

**User Management:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/users` | List users (paginated + search by email/username/id) |
| GET | `/v1/admin/users/:id` | User details (includes links count, subscription, stats) |
| PATCH | `/v1/admin/users/:id/tier` | Change user tier (FREE/PRO) |
| PATCH | `/v1/admin/users/:id/block` | Block user (disable account) |
| PATCH | `/v1/admin/users/:id/unblock` | Unblock user |
| DELETE | `/v1/admin/users/:id` | Delete user + all their data (hard delete) |

**Link Management:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/links` | List all links (paginated + search by shortCode/originalUrl/userId) |
| GET | `/v1/admin/links/:id` | Link details (includes analytics summary, owner info) |
| PATCH | `/v1/admin/links/:id` | Edit any link (title, description, status, expiry, etc.) |
| PATCH | `/v1/admin/links/:id/block` | Block link (set status to BLOCKED) |
| PATCH | `/v1/admin/links/:id/unblock` | Unblock link (set status to ACTIVE) |
| POST | `/v1/admin/links/:id/rescan` | Force security rescan |
| DELETE | `/v1/admin/links/:id` | Hard delete link + analytics |

**Platform Stats & Analytics:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/stats` | Dashboard stats (total users, links, clicks, revenue, growth) |
| GET | `/v1/admin/analytics` | Platform analytics (daily/monthly trends, top links, geo distribution) |
| GET | `/v1/admin/security` | Security overview (flagged links by status, scan queue, recent alerts) |

### 2D.4 Admin Guard

```typescript
// src/shared/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    
    // Check Keycloak realm roles
    const realmRoles = user.realm_access?.roles || [];
    // Also check resource roles if configured
    const resourceRoles = user.resource_access?.['minifi-api']?.roles || [];
    const allRoles = [...realmRoles, ...resourceRoles];
    
    const isAdmin = allRoles.includes('admin') || allRoles.includes('superadmin');
    
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    
    return true;
  }
}
```

**Usage on controller:**
```typescript
@Controller('admin')
@UseGuards(AdminGuard)  // Applied to all endpoints in controller
@ApiTags('Admin')
export class AdminController {
  // All endpoints require admin role
}
```

### 2D.5 Tasks Checklist

```
PHASE 2D: Admin Module
├── Database Schema
│   ├── [ ] Add isBlocked, blockedAt, blockedReason to User model
│   ├── [ ] Add BLOCKED to LinkStatus enum
│   └── [ ] Run migration
├── Guards & Core
│   ├── [ ] Create AdminGuard (check admin/superadmin role)
│   ├── [ ] Create AdminModule
│   └── [ ] Register in api.module.ts
├── User Management
│   ├── [ ] Create AdminUserController
│   ├── [ ] Create AdminUserService
│   ├── [ ] GET /admin/users (paginated + search)
│   ├── [ ] GET /admin/users/:id (with stats)
│   ├── [ ] PATCH /admin/users/:id/tier
│   ├── [ ] PATCH /admin/users/:id/block
│   ├── [ ] PATCH /admin/users/:id/unblock
│   └── [ ] DELETE /admin/users/:id
├── Link Management
│   ├── [ ] Create AdminLinkController
│   ├── [ ] Create AdminLinkService
│   ├── [ ] GET /admin/links (paginated + search)
│   ├── [ ] GET /admin/links/:id (with analytics)
│   ├── [ ] PATCH /admin/links/:id (edit)
│   ├── [ ] PATCH /admin/links/:id/block
│   ├── [ ] PATCH /admin/links/:id/unblock
│   ├── [ ] POST /admin/links/:id/rescan
│   └── [ ] DELETE /admin/links/:id
├── Stats & Analytics
│   ├── [ ] Create AdminController
│   ├── [ ] Create AdminService
│   ├── [ ] GET /admin/stats (dashboard)
│   ├── [ ] GET /admin/analytics (trends)
│   └── [ ] GET /admin/security (flagged links)
└── DTOs
    ├── [ ] Create all request/response DTOs
    └── [ ] Add Swagger documentation
```

**Total Tasks:** ~28 tasks  
**Estimated Time:** 4-5 days

---

## 📋 Complete Task Tracker

```
PHASE 2A: Security Scanning (13 tasks)
├── [x] Install openai package
├── [x] Create OpenAI config module
├── [x] Add env variables
├── [x] Implement OpenAIService (UrlScanService)
├── [x] Create Scan module/queue wiring
├── [x] Update queue constants
├── [x] Create ScanProducer
├── [x] Create ScanConsumer
├── [x] Integrate with LinkService (guest excluded)
├── [x] Update RedirectController (warning, no blocking)
├── [x] Add to worker module
├── [ ] Create security scan cron — skipped for cost control
└── [x] Add rescan endpoint

PHASE 2B: Subscriptions (15 tasks) ✅ COMPLETE
├── [x] Add Subscription model
├── [x] Run migration
├── [x] Create Stripe config
├── [x] Install stripe + @golevelup/nestjs-stripe packages
├── [x] Implement StripeService
├── [x] Implement SubscriptionService
├── [x] Create SubscriptionController
├── [x] Add webhook endpoint (consolidated in SubscriptionController)
├── [x] Add raw body parser (rawBody: true)
├── [x] Create UsageLimitGuard
├── [x] Create SubscriptionTierGuard
├── [x] Update LinkController with guards
├── [x] Decision: No usage reset cron (static cap)
├── [x] Setup Stripe CLI for local dev
└── [x] Test checkout → webhook → upgrade flow

PHASE 2C: Email Notifications (11 tasks) ✅ COMPLETE
├── [x] Create PATCH /users/preferences endpoint
├── [x] Add opt-out check to EmailQueueService
├── [x] Create WelcomeEmail template
├── [x] Create SecurityAlertEmail template
├── [x] Create LinkExpiringEmail template
├── [x] Create MonthlyReportEmail template
├── [x] Create SubscriptionEmail template
├── [x] Update EmailRenderer with new templates
├── [x] Create NotificationCrons (expiring links + monthly reports)
├── [x] Integrate with UserService (welcome email)
├── [x] Integrate with ScanConsumer (security alerts)
└── [x] Integrate with SubscriptionService (upgrade/cancel emails)

PHASE 2D: Admin Module (~28 tasks)
├── Database Schema (3 tasks)
│   ├── [ ] Add isBlocked, blockedAt, blockedReason to User
│   ├── [ ] Add BLOCKED to LinkStatus enum
│   └── [ ] Run migration
├── Guards & Core (3 tasks)
│   ├── [ ] Create AdminGuard
│   ├── [ ] Create AdminModule
│   └── [ ] Register in api.module.ts
├── User Management (7 tasks)
│   ├── [ ] Create AdminUserController + Service
│   ├── [ ] GET /admin/users (paginated + search)
│   ├── [ ] GET /admin/users/:id
│   ├── [ ] PATCH /admin/users/:id/tier
│   ├── [ ] PATCH /admin/users/:id/block
│   ├── [ ] PATCH /admin/users/:id/unblock
│   └── [ ] DELETE /admin/users/:id
├── Link Management (8 tasks)
│   ├── [ ] Create AdminLinkController + Service
│   ├── [ ] GET /admin/links (paginated + search)
│   ├── [ ] GET /admin/links/:id
│   ├── [ ] PATCH /admin/links/:id (edit)
│   ├── [ ] PATCH /admin/links/:id/block
│   ├── [ ] PATCH /admin/links/:id/unblock
│   ├── [ ] POST /admin/links/:id/rescan
│   └── [ ] DELETE /admin/links/:id
├── Stats & Analytics (4 tasks)
│   ├── [ ] Create AdminController + Service
│   ├── [ ] GET /admin/stats
│   ├── [ ] GET /admin/analytics
│   └── [ ] GET /admin/security
└── DTOs & Swagger (3 tasks)
    └── [ ] Create all DTOs with validation + Swagger docs
```

**Total Phase 2 Tasks:** ~51 tasks  
**Estimated Time:** 2-3 weeks

---

## 👤 User Module

The user module manages user profiles with sync-on-demand pattern from Keycloak.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/users/profile` | Get current user profile (creates user on first access) |
| PATCH | `/v1/users/preferences` | Update user preferences (email opt-out, phone, avatar, address) |

### Email Notification Preferences

Users can opt out of email notifications via the preferences endpoint:

```typescript
// PATCH /v1/users/preferences
{
  "emailNotificationsEnabled": false,  // Opt out of all emails
  "phoneNumber": "+1234567890",        // Optional
  "avatarUrl": "https://...",          // Optional
  "address": "123 Main St"             // Optional
}
```

**Important:** When queuing emails for registered users, always include `userId` in the job DTO. The email service checks `emailNotificationsEnabled` and skips sending if false.

---

## 💬 Chat Module (Existing)

The chat module is **already implemented** and provides real-time messaging capabilities.

### Current Features

| Feature | Status | Description |
|---------|--------|-------------|
| Direct Chats | ✅ | 1-on-1 private messaging |
| Group Chats | ✅ | Multi-user chat rooms |
| Real-time Messages | ✅ | WebSocket via Socket.IO |
| Typing Indicators | ✅ | "User is typing..." |
| Read Receipts | ✅ | Message read tracking |
| Message Editing | ✅ | Edit within 10 min |
| Message Deletion | ✅ | Soft delete within 10 min |
| Member Management | ✅ | Add members to groups |
| Unread Digest | ✅ | Email cron for unread messages |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat` | Create chat (DIRECT/GROUP) |
| GET | `/v1/chat` | List user's chats |
| GET | `/v1/chat/:chatId` | Get chat details |
| GET | `/v1/chat/:chatId/messages` | Get message history (cursor paginated) |
| POST | `/v1/chat/:chatId/messages` | Send message |
| PUT | `/v1/chat/:chatId/messages/:messageId` | Edit message |
| DELETE | `/v1/chat/:chatId/messages/:messageId` | Delete message |
| POST | `/v1/chat/:chatId/members` | Add member to group |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:user-typing` | Client → Server | User started typing |
| `chat:user-stopped-typing` | Client → Server | User stopped typing |
| `chat:message-read` | Client → Server | Mark message as read |
| `chat:messages-read` | Client → Server | Bulk mark as read |
| `chat:new-message` | Server → Client | New message in chat |
| `chat:message-updated` | Server → Client | Message was edited |
| `chat:message-deleted` | Server → Client | Message was deleted |

### File Structure

```
src/modules/chat/
├── chat.module.ts
├── chat.controller.ts        # REST endpoints
├── chat.gateway.ts           # WebSocket handlers
├── chat.service.ts           # Business logic
└── dto/
    ├── create-chat.dto.ts
    ├── send-message.dto.ts
    ├── chat-response.dto.ts
    └── message-response.dto.ts

src/shared/queues/chat/
├── chat.module.ts
├── chat.service.ts
├── chat-unread-digest.cron.ts  # Daily unread email
└── dto/chat-job.dto.ts
```

---

## 📋 Phase 3: Enhanced Features (Planned)

**Goal:** Add premium features and enhanced functionality.

### Phase 3A: Support Chat System

Adapt existing chat module for PRO user → Admin support.

**Changes Required:**

| Change | Description |
|--------|-------------|
| Add `SUPPORT` chat type | New enum value for support chats |
| Auto-assign admin | New support chat auto-adds available admin |
| Priority/Status fields | `OPEN`, `PENDING`, `RESOLVED`, `CLOSED` |
| PRO-only guard | Restrict live support to PRO tier |
| Admin dashboard | View/manage all support chats |

**Database Changes:**
```prisma
enum ChatType {
  DIRECT
  GROUP
  SUPPORT  // NEW
}

// Add to Chat model
enum SupportStatus {
  OPEN
  PENDING
  RESOLVED
  CLOSED
}

model Chat {
  // ... existing fields
  supportStatus  SupportStatus?
  supportPriority Int?
  assignedAdminId String?
}
```

### Phase 3B: Bulk Link Operations

| Feature | Description |
|---------|-------------|
| Bulk Archive | Archive multiple links at once |
| Bulk Delete | Delete multiple links |
| Bulk Tag | Add/remove tags from multiple links |
| Bulk Export | Export links to CSV/JSON |

### Phase 3C: API Keys & Webhooks

| Feature | Tier | Description |
|---------|------|-------------|
| API Keys | PRO | Generate API keys for programmatic access |
| Click Webhooks | PRO | HTTP callback on link clicks |
| Rate Limiting | PRO | Higher limits for API access |

### Phase 3D: Custom Domains

| Feature | Tier | Description |
|---------|------|-------------|
| Domain Verification | PRO | Verify custom domain ownership |
| DNS Configuration | PRO | Guide for CNAME setup |
| SSL Certificates | PRO | Auto-provision via Let's Encrypt |
| Branded Links | PRO | `yourbrand.com/sale` |

### Phase 3 Task Tracker

```
PHASE 3A: Support Chat (~8 tasks)
├── [ ] Add SUPPORT chat type enum
├── [ ] Add support status/priority fields
├── [ ] Create SupportGuard (PRO-only)
├── [ ] Implement auto-assign admin logic
├── [ ] Create support chat endpoints
├── [ ] Add admin support dashboard endpoints
├── [ ] Integrate with notification system
└── [ ] Add support chat to admin module

PHASE 3B: Bulk Operations (~6 tasks)
├── [ ] Create BulkOperationDto
├── [ ] Implement bulk archive
├── [ ] Implement bulk delete
├── [ ] Implement bulk tag operations
├── [ ] Implement CSV/JSON export
└── [ ] Add rate limiting for bulk ops

PHASE 3C: API Keys & Webhooks (~8 tasks)
├── [ ] Create ApiKey model
├── [ ] Create ApiKeyService
├── [ ] Create ApiKeyController
├── [ ] Implement key generation/revocation
├── [ ] Create Webhook model
├── [ ] Implement webhook delivery
├── [ ] Add webhook retry logic
└── [ ] Create webhook management endpoints

PHASE 3D: Custom Domains (~6 tasks)
├── [ ] Create CustomDomain model
├── [ ] Implement domain verification
├── [ ] Create DNS check service
├── [ ] Integrate SSL provisioning
├── [ ] Update redirect logic for custom domains
└── [ ] Create domain management endpoints
```

**Total Phase 3 Tasks:** ~28 tasks  
**Estimated Time:** 3-4 weeks

---

## 🔧 Development Commands

```bash
cd minifi-api

# Development
npm run start:dev          # Start API (port 3001)
npm run start:worker:dev   # Start background worker

# Database
npm run db:migrate:dev     # Run Prisma migrations
npm run db:studio          # Open Prisma Studio
npm run db:seed            # Seed database

# Testing
npm test                   # Unit tests
npm run test:e2e           # E2E tests
npm run test:cov           # Coverage

# Linting
npm run lint               # ESLint
npm run format             # Prettier
```

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `src/database/schema.prisma` | Database models |
| `src/modules/api.module.ts` | Module aggregator |
| `src/worker/worker.module.ts` | Worker config |
| `src/shared/queues/constants/queue.constant.ts` | Queue definitions |
| `src/constants/link.constant.ts` | Tier limits |
| `src/shared/guards/` | Auth & permission guards |

---

**End of Backend Development Plan**

> Update this document as phases are completed.  
> Mark tasks with [x] when done.

