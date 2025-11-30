# Minifi - Project Overview

> **Last Updated:** November 30, 2025  
> **Status:** Backend Phase 2C Complete ✅ | Backend Phase 2D Next 🚧 | Frontend Pending 📋

---

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** | Project overview & onboarding | Start here for context |
| **[BACKEND_PLAN.md](./BACKEND_PLAN.md)** | Backend API development plan | When working on `minifi-api/` |
| **[BACKEND_API_RULES.md](./BACKEND_API_RULES.md)** | Backend coding standards | Code review & development |
| **[FRONTEND_PLAN.md](./FRONTEND_PLAN.md)** | Frontend development plan | When working on `minifi/` |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | Complete API endpoint docs | API reference |
| **[CLAUDE.md](./CLAUDE.md)** | AI assistant context | AI pair programming |
| **[AGENTS.md](./AGENTS.md)** | AI assistant context | AI pair programming |

---

## 🎯 What is Minifi?

**Minifi** is an enterprise-grade URL shortener platform designed for:

- **Individual users** who need quick, reliable link shortening
- **Marketers** who need analytics and tracking
- **Businesses** who need branded, secure short links

### Core Value Proposition

| Value | Description |
|-------|-------------|
| **🚀 Performance** | Sub-100ms redirects with async analytics processing |
| **🔒 Security** | AI-powered malicious URL detection (OpenAI GPT-4) |
| **📊 Analytics** | Deep insights: geo, device, browser, UTM, referrers |
| **💳 Monetization** | Freemium model with Stripe-powered PRO tier |
| **🔐 Authentication** | Enterprise-grade auth via Keycloak |

---

## 🏗️ Architecture Overview

### Monorepo Structure

```
minifi/                         # Root directory
│
├── minifi/                     # 🎨 FRONTEND
│   ├── src/
│   │   ├── app/                # Redux store & RTK Query
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Redux slices
│   │   ├── pages/              # Route pages
│   │   ├── router/             # React Router config
│   │   ├── lib/                # Utilities, Keycloak
│   │   └── theme/              # Mantine theme
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── minifi-api/                 # 🔧 BACKEND
│   ├── src/
│   │   ├── modules/            # Feature modules
│   │   │   ├── health/         # Health checks
│   │   │   ├── user/           # User profiles
│   │   │   ├── file/           # File uploads
│   │   │   ├── chat/           # WebSocket chat ✅
│   │   │   ├── link/           # URL shortening ✅
│   │   │   ├── subscription/   # Stripe subscriptions ✅
│   │   │   └── admin/          # Admin APIs (pending)
│   │   ├── shared/             # Shared infrastructure
│   │   ├── config/             # Configuration modules
│   │   ├── database/           # Prisma schema & migrations
│   │   └── worker/             # Background worker process
│   ├── prisma/
│   └── package.json
│
└── [Documentation Files]
    ├── PROJECT_OVERVIEW.md     # This file
    ├── BACKEND_PLAN.md         # Backend development plan
    ├── FRONTEND_PLAN.md        # Frontend development plan
    ├── API_DOCUMENTATION.md    # API reference
    └── ...
```

---

## 🛠️ Tech Stack

### Backend (`minifi-api/`)

| Technology | Purpose |
|------------|---------|
| **NestJS** | Framework (modular architecture) |
| **TypeScript** | Type safety |
| **PostgreSQL** | Primary database |
| **Prisma** | ORM & migrations |
| **Redis** | Caching, rate limiting, WebSocket adapter |
| **RabbitMQ** | Message queues (async processing) |
| **MinIO** | S3-compatible object storage |
| **Keycloak** | Authentication & authorization |

### Backend External Services

| Service | Purpose |
|---------|---------|
| **OpenAI** | Security scanning (GPT-4o-mini) |
| **Stripe** | Payment processing |
| **Resend** | Transactional emails |
| **ipdata.co** | Enhanced geolocation |

### Frontend (`minifi/`)

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool & dev server |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Mantine** | Component library & theming |
| **Redux Toolkit** | State management |
| **RTK Query** | API data fetching & caching |
| **React Router** | Client-side routing |
| **Zod** | Schema validation |
| **Keycloak-js** | SPA authentication |
| **Recharts** | Charts & analytics visualization |

---

## 👥 User Tiers & Features

### Tier Comparison

| Feature | GUEST | FREE | PRO |
|---------|-------|------|-----|
| **Cost** | Free | Free | $19/month |
| **Auth Required** | ❌ No | ✅ Yes | ✅ Yes |
| **Link Creation** | 5/day (IP limit) | 25 active links | Unlimited |
| **Link Retention** | 3 days | 3 months | 2 years |
| **Custom Aliases** | ❌ | ❌ | ✅ `minifi.link/sale` |
| **Password Protection** | ❌ | ✅ | ✅ |
| **Scheduling** | ❌ | ✅ | ✅ |
| **Click Limits** | ❌ | ✅ | ✅ |
| **One-Time Links** | ❌ | ✅ | ✅ |
| **Tags** | ❌ | ✅ | ✅ |
| **QR Codes** | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | Basic (count) | Full (geo, device, UTM) |
| **Security Scanning** | ❌ | ✅ | ✅ |
| **Email Notifications** | ❌ | ✅ (opt-out) | ✅ (opt-out) |
| **Support** | None | Standard | Priority |

### Guest User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     GUEST USER JOURNEY                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Visit landing page (no login required)                 │
│              ↓                                               │
│   2. Paste long URL → Click "Shorten"                       │
│              ↓                                               │
│   3. Receive short link (auto 3-day expiry)                 │
│              ↓                                               │
│   4. Rate limit: 5 links/day per IP                         │
│              ↓                                               │
│   5. Prompt: "Sign up for more features!"                   │
│                                                              │
│   Restrictions:                                              │
│   • No custom aliases, passwords, scheduling                │
│   • No tags, QR codes, analytics                            │
│   • Links auto-deleted after 3 days                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Architectural Patterns

### 1. Client-Side Redirect Pattern

The API does NOT issue HTTP 302 redirects. Instead:

```
┌──────────────────────────────────────────────────────────────┐
│                    REDIRECT FLOW                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   1. User clicks: minifi.link/abc123                         │
│              ↓                                                │
│   2. Frontend calls: GET /v1/redirect/abc123                 │
│              ↓                                                │
│   3. API returns JSON:                                        │
│      { originalUrl: "https://...", shortCode: "abc123" }     │
│              ↓                                                │
│   4. Frontend redirects: window.location.href = originalUrl  │
│                                                               │
│   Benefits:                                                   │
│   • No server-side redirect lifecycle issues                 │
│   • Can show interstitials (password, warnings)              │
│   • Better error handling in frontend                        │
│   • Easier analytics integration                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 2. Dual Process Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND PROCESSES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐        │
│   │   MAIN APP          │    │   WORKER APP        │        │
│   │   (main.ts)         │    │   (main.worker.ts)  │        │
│   ├─────────────────────┤    ├─────────────────────┤        │
│   │ • HTTP REST API     │    │ • RabbitMQ consumers│        │
│   │ • WebSocket (chat)  │    │ • Cron jobs         │        │
│   │ • Request handling  │    │ • Email sending     │        │
│   │ • Rate limiting     │    │ • Security scanning │        │
│   │                     │    │ • Analytics proc.   │        │
│   └─────────────────────┘    └─────────────────────┘        │
│              │                          │                    │
│              └──────────┬───────────────┘                    │
│                         │                                    │
│                    RabbitMQ                                  │
│              (message broker)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Async Analytics Processing

Click tracking is "fire-and-forget" to ensure fast redirects:

```
┌─────────────────────────────────────────────────────────────┐
│                 ANALYTICS PIPELINE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. User clicks link                                        │
│              ↓                                                │
│   2. API immediately returns redirect info (<100ms)          │
│              ↓ (async)                                        │
│   3. Publish click event to RabbitMQ                         │
│              ↓                                                │
│   4. Worker consumes event:                                  │
│      • Parse User-Agent                                      │
│      • Lookup GeoIP                                          │
│      • Extract UTM params                                    │
│      • Hash visitor ID                                       │
│      • Write to LinkAnalytics table                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Keycloak Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTH FLOW                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. User logs in via Keycloak                              │
│              ↓                                                │
│   2. Keycloak issues JWT token                              │
│              ↓                                                │
│   3. Frontend stores token (memory/refresh)                  │
│              ↓                                                │
│   4. API requests include: Authorization: Bearer <JWT>       │
│              ↓                                                │
│   5. Backend validates JWT via nest-keycloak-connect         │
│              ↓                                                │
│   6. First profile fetch → User synced to PostgreSQL         │
│                                                              │
│   User Data Split:                                           │
   │   • Keycloak: email, roles, password (source of truth)      │
   │   • PostgreSQL: phoneNumber, avatarUrl, userType, links,    │
   │     emailNotificationsEnabled (user preferences)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Overview

### Core Models

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE MODELS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   User                                                       │
   │   ├── id (Keycloak sub)                                     │
   │   ├── email, username, firstName, lastName                  │
   │   ├── emailNotificationsEnabled (opt-out flag)              │
   │   ├── phoneNumber?, avatarUrl?, address?                    │
   │   ├── userType: GUEST | FREE | PRO                          │
   │   ├── links: Link[]                                         │
   │   ├── tags: Tag[]                                           │
   │   └── subscription: Subscription?                           │
│                                                              │
│   Link                                                       │
│   ├── id, userId?, originalUrl, shortCode, customAlias?     │
│   ├── status: ACTIVE | SCHEDULED | DISABLED | ARCHIVED      │
│   ├── securityStatus: PENDING | SAFE | SUSPICIOUS | ...     │
│   ├── password?, scheduledAt?, expiresAt?, clickLimit?      │
│   ├── isGuest, isOneTime, isArchived                        │
│   ├── clickCount, uniqueClickCount, lastClickedAt           │
│   ├── analytics: LinkAnalytics[]                            │
│   └── tags: LinkTag[]                                       │
│                                                              │
│   LinkAnalytics                                              │
│   ├── id, linkId, clickedAt                                 │
│   ├── visitorId (SHA-256 hash), isUnique                    │
│   ├── country, city, region, latitude, longitude            │
│   ├── browser, browserVersion, os, osVersion, device        │
│   ├── referrer, referrerDomain                              │
│   └── utmSource, utmMedium, utmCampaign, utmTerm, utmContent│
│                                                              │
│   Tag                                                        │
│   ├── id, userId, name                                      │
│   ├── backgroundColor, textColor                            │
│   └── links: LinkTag[]                                      │
│                                                              │
│   Subscription                                               │
│   ├── id, userId, tier: FREE | PRO                          │
│   ├── status: ACTIVE | CANCELLED | PAST_DUE | ...           │
│   ├── stripeCustomerId, stripeSubscriptionId                │
│   ├── cancelAtPeriodEnd, stripeCancelAt                     │
│   └── emailNotifications, securityAlertEmails               │
│                                                              │
│   Chat & Messaging                                           │
│   ├── Chat: id, name?, type (DIRECT|GROUP), creatorId       │
│   ├── ChatMember: chatId, userId, joinedAt                  │
│   ├── Message: chatId, senderId, content, isEdited/Deleted  │
│   └── MessageRead: messageId, userId, readAt                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💬 Chat Module

### Overview

Real-time chat system built with WebSockets (Socket.IO) for user communication.

### Current Features

| Feature | Status | Description |
|---------|--------|-------------|
| Direct Chats | ✅ | 1-on-1 private messaging |
| Group Chats | ✅ | Multi-user chat rooms |
| Real-time Messages | ✅ | WebSocket-based instant delivery |
| Typing Indicators | ✅ | "User is typing..." notifications |
| Read Receipts | ✅ | Message read tracking |
| Message Editing | ✅ | Edit within 10 min window |
| Message Deletion | ✅ | Soft delete within 10 min |
| Member Management | ✅ | Add/remove members from groups |
| Unread Digest | ✅ | Email notification for unread messages |

### Planned: Support Chat (Phase 3A)

| Feature | Description |
|---------|-------------|
| Support Chat Type | New `SUPPORT` category for PRO users → Admin |
| Auto-assign Admin | Support chats auto-assigned to available admin |
| Priority/Status | `OPEN`, `PENDING`, `RESOLVED`, `CLOSED` |
| PRO-only Access | Live support restricted to PRO tier |
| Ticket Fallback | FREE users get async ticket system |

---

## 🚦 Project Status

### Backend Progress

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
| **Phase 2D** | 🚧 In Progress | Admin module (user/link management, audit logs) |
| **Phase 3A** | 📋 Planned | Support chat system |
| **Phase 3B** | 📋 Planned | Bulk link operations |
| **Phase 3C** | 📋 Planned | API keys & webhooks |
| **Phase 3D** | 📋 Planned | Custom domains |

### Frontend Progress

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase F1** | 📋 Pending | Vite + Redux + Keycloak setup |
| **Phase F2** | 📋 Pending | Core features (links, redirect) |
| **Phase F3** | 📋 Pending | Analytics & settings |

---

## 🛠️ Development Commands

### Backend (`minifi-api/`)

```bash
cd minifi-api

# Development
npm run start:dev          # Start API (port 3001)
npm run start:worker:dev   # Start background worker

# Database
npm run db:migrate:dev     # Run Prisma migrations
npm run db:studio          # Open Prisma Studio GUI
npm run db:seed            # Seed database

# Testing
npm test                   # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Coverage report

# Docker
npm run docker:start       # Start all services
```

### Frontend (`minifi/`)

```bash
cd minifi

# Development
npm run dev                # Start Vite dev server (port 3000)
npm run build              # Production build
npm run preview            # Preview production build

# Quality
npm run lint               # ESLint check
npm run type-check         # TypeScript check
```

---

## 🔗 Quick Links

### Local Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/v1 |
| Swagger Docs | http://localhost:3001/api/docs |
| Prisma Studio | http://localhost:5555 |
| Keycloak | http://localhost:8080 |
| RabbitMQ | http://localhost:15672 |
| MinIO | http://localhost:9001 |

### Key Files

| File | Purpose |
|------|---------|
| `minifi-api/src/database/schema.prisma` | Database models |
| `minifi-api/src/modules/api.module.ts` | Module aggregator |
| `minifi-api/src/worker/worker.module.ts` | Worker config |
| `minifi-api/src/constants/link.constant.ts` | Tier limits |
| `minifi/src/app/store.ts` | Redux store |
| `minifi/src/lib/keycloak.ts` | Auth config |

---

## 📖 Development Guides

### For Backend Development
→ See **[BACKEND_PLAN.md](./BACKEND_PLAN.md)**

### For Frontend Development
→ See **[FRONTEND_PLAN.md](./FRONTEND_PLAN.md)**

### Backend Coding Standards
→ See **[BACKEND_API_RULES.md](./BACKEND_API_RULES.md)**

### API Reference
→ See **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

---

**End of Project Overview**

> This document should be updated when major architectural decisions are made.

