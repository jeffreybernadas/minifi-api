# Minifi API Documentation

## Overview

The Minifi API provides comprehensive URL shortening capabilities with advanced features including analytics, QR codes, password protection, scheduling, and tags. The API supports three user tiers: **GUEST** (anonymous), **FREE** (authenticated), and **PRO** (paid subscription).

**Base URL**: `http://localhost:3001` (development)
**API Version**: `v1`
**Authentication**: JWT Bearer tokens (Keycloak)

## Table of Contents

- [Authentication](#authentication)
- [User Profile](#user-profile)
- [User Tiers & Limits](#user-tiers--limits)
- [Link Management](#link-management)
- [Redirect](#redirect)
- [Tag Management](#tag-management)
- [Analytics](#analytics)
- [Email Notifications](#email-notifications)
- [Response Format](#response-format)
- [Error Codes](#error-codes)

---

## Authentication

Most endpoints require authentication via JWT Bearer tokens issued by Keycloak.

### Headers

```http
Authorization: Bearer <jwt_token>
```

### Public Endpoints

The following endpoints do NOT require authentication:

- `POST /v1/links/guest` - Create guest link
- `GET /v1/redirect/:code` - Get redirect info
- `POST /v1/redirect/:code/verify` - Verify password
- `POST /v1/subscriptions/webhook` - Stripe webhook (used by Stripe/Stripe CLI)

### Subscriptions (Stripe)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/subscriptions/me` | Get current subscription (tier/status) | JWT |
| POST | `/v1/subscriptions/checkout` | Create Stripe Checkout session for PRO upgrade; returns `{ url }` | JWT |
| POST | `/v1/subscriptions/portal` | Create Stripe Billing Portal session; returns `{ url }` | JWT |
| POST | `/v1/subscriptions/cancel` | Cancel subscription at period end; reverts to FREE locally | JWT |
| POST | `/v1/subscriptions/webhook` | Stripe webhook to sync subscription state | Public |

**Local testing:** run Stripe CLI and forward webhooks to your local API:
`stripe listen --forward-to http://localhost:3001/api/v1/subscriptions/webhook`
Use the CLI-provided signing secret as `STRIPE_WEBHOOK_SECRET` in your local `.env`.

---

## User Profile

### Get Current User Profile

Retrieve the authenticated user's profile. Creates user record on first access (sync-on-demand from Keycloak).

**Endpoint**: `GET /v1/users/profile`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "keycloak-sub-uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "avatarUrl": "https://...",
    "address": "123 Main St",
    "emailNotificationsEnabled": true,
    "createdAt": "2024-11-29T12:00:00Z",
    "updatedAt": "2024-11-29T12:00:00Z"
  }
}
```

---

### Update User Preferences

Update user's application-specific preferences (email notifications, contact info).

**Endpoint**: `PATCH /v1/users/preferences`
**Auth**: Required

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "emailNotificationsEnabled": false,
  "phoneNumber": "+1234567890",
  "avatarUrl": "https://example.com/avatar.jpg",
  "address": "456 New Address"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "keycloak-sub-uuid",
    "email": "user@example.com",
    "emailNotificationsEnabled": false,
    "phoneNumber": "+1234567890",
    "avatarUrl": "https://example.com/avatar.jpg",
    "address": "456 New Address",
    "updatedAt": "2024-11-29T13:00:00Z"
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - User not found

---

## User Tiers & Limits

| Feature | GUEST | FREE | PRO |
|---------|-------|------|-----|
| **Links per day/month** | 5/day | 25 total | Unlimited |
| **Link retention** | 3 days | 3 months | 2 years |
| **Custom aliases** | ❌ | ❌ | ✅ |
| **Password protection** | ❌ | ✅ | ✅ |
| **Scheduling** | ❌ | ✅ | ✅ |
| **Click limits** | ❌ | ✅ | ✅ |
| **Tags** | ❌ | ✅ | ✅ |
| **QR codes** | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | Basic | Advanced |

---

## Link Management

### Create Link (Authenticated)

Create a shortened link with advanced features.

**Endpoint**: `POST /v1/links`
**Auth**: Required
**Tier**: FREE, PRO

#### Request Body

```json
{
  "originalUrl": "https://example.com/very/long/url",
  "customAlias": "my-link",           // Optional (PRO only)
  "title": "My Link",                 // Optional
  "description": "Link description",  // Optional
  "password": "securepass123",        // Optional (min 6 chars)
  "scheduledAt": "2024-12-31T00:00:00Z", // Optional
  "expiresAt": "2025-01-31T00:00:00Z",   // Optional
  "clickLimit": 100,                  // Optional
  "isOneTime": false,                 // Optional
  "notes": "Internal notes",          // Optional
  "tagIds": ["tag-id-1", "tag-id-2"]  // Optional (max 10)
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "userId": "user-uuid",
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123X",
    "customAlias": "my-link",
    "title": "My Link",
    "description": "Link description",
    "status": "ACTIVE",
    "hasPassword": true,
    "scheduledAt": "2024-12-31T00:00:00Z",
    "expiresAt": "2025-01-31T00:00:00Z",
    "clickLimit": 100,
    "isOneTime": false,
    "isArchived": false,
    "notes": "Internal notes",
    "clickCount": 0,
    "uniqueClickCount": 0,
    "lastClickedAt": null,
    "qrCodeUrl": null,
    "createdAt": "2024-11-29T12:00:00Z",
    "updatedAt": "2024-11-29T12:00:00Z"
  }
}
```

#### Error Responses

- `400` - Validation error (invalid URL, custom alias format, etc.)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (custom aliases require PRO tier)

---

### Create Guest Link

Create a basic shortened link without authentication.

**Endpoint**: `POST /v1/links/guest`
**Auth**: Not required (public)
**Rate Limit**: 5 links per day per IP address

#### Request Body

```json
{
  "originalUrl": "https://example.com/very/long/url"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "userId": null,
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123X",
    "customAlias": null,
    "title": null,
    "description": null,
    "status": "ACTIVE",
    "hasPassword": false,
    "scheduledAt": null,
    "expiresAt": "2024-12-02T12:00:00Z",  // 3 days from creation
    "clickLimit": null,
    "isOneTime": false,
    "isArchived": false,
    "notes": null,
    "clickCount": 0,
    "uniqueClickCount": 0,
    "lastClickedAt": null,
    "qrCodeUrl": null,
    "createdAt": "2024-11-29T12:00:00Z",
    "updatedAt": "2024-11-29T12:00:00Z"
  }
}
```

#### Error Responses

- `400` - Validation error (invalid URL format)
- `429` - Too many requests (5 links per day limit exceeded)

---

### List User Links

Retrieve paginated list of links with filters.

**Endpoint**: `GET /v1/links`
**Auth**: Required

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `page=1` |
| `limit` | number | Items per page (default: 10) | `limit=20` |
| `search` | string | Search in title/description/URL | `search=example` |
| `status` | string | Filter by status | `status=ACTIVE` |
| `isArchived` | boolean | Show archived links | `isArchived=false` |
| `tagIds` | string[] | Filter by tag IDs | `tagIds=tag1,tag2` |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "originalUrl": "https://example.com",
      "shortCode": "abc123X",
      "title": "My Link",
      "status": "ACTIVE",
      "clickCount": 42,
      "createdAt": "2024-11-29T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pageCount": 3
  }
}
```

---

### Get Link by ID

Retrieve detailed information about a specific link.

**Endpoint**: `GET /v1/links/:id`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "userId": "user-uuid",
    "originalUrl": "https://example.com",
    "shortCode": "abc123X",
    "status": "ACTIVE",
    "clickCount": 42,
    "uniqueClickCount": 28
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link not found or user is not the owner

---

### Update Link

Update properties of an existing link.

**Endpoint**: `PATCH /v1/links/:id`
**Auth**: Required

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "customAlias": "new-alias",      // PRO only
  "password": "newpassword",       // Set or change password
  "expiresAt": "2025-12-31T00:00:00Z",
  "clickLimit": 500,
  "notes": "Updated notes",
  "tagIds": ["tag-id-3", "tag-id-4"]
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "title": "Updated Title",
    "updatedAt": "2024-11-29T13:00:00Z"
  }
}
```

#### Error Responses

- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (e.g., custom aliases require PRO)
- `404` - Link not found

---

### Generate QR Code

Generate a QR code for a link.

**Endpoint**: `POST /v1/links/:id/qr`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://storage.example.com/qr-codes/clx1234567890.png",
    "linkId": "clx1234567890",
    "shortCode": "abc123X"
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link not found

---

### Archive Link

Archive a link (soft delete - preserves all data).

**Endpoint**: `PATCH /v1/links/:id/archive`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "isArchived": true,
    "status": "ARCHIVED"
  }
}
```

#### Error Responses

- `400` - Link is already archived
- `401` - Unauthorized
- `404` - Link not found

---

### Unarchive Link

Restore an archived link.

**Endpoint**: `PATCH /v1/links/:id/unarchive`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "isArchived": false,
    "status": "ACTIVE"  // or "SCHEDULED" if scheduledAt is in future
  }
}
```

#### Error Responses

- `400` - Link is not archived
- `401` - Unauthorized
- `404` - Link not found

---

### Delete Link

Permanently delete a link (hard delete - irreversible).

**Endpoint**: `DELETE /v1/links/:id`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link not found

---

## Redirect

### Get Redirect Info

Get link details for client-side redirect pattern.

**Endpoint**: `GET /v1/redirect/:code`
**Auth**: Not required (public)

The `:code` parameter can be either a `shortCode` or `customAlias`.

#### Response - Regular Link (200 OK)

```json
{
  "success": true,
  "data": {
    "requiresPassword": false,
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123X"
  }
}
```

#### Response - Password-Protected Link (200 OK)

```json
{
  "success": true,
  "data": {
    "requiresPassword": true,
    "code": "abc123X"
  }
}
```

#### Error Responses

- `403` - Forbidden (link is archived, disabled, expired, or not yet active)
- `404` - Link not found

#### Implementation Notes

- Frontend should handle the actual redirect via `window.location.href`
- Click tracking is performed asynchronously in the background
- Analytics data is captured automatically

---

### Verify Password

Verify password for a password-protected link.

**Endpoint**: `POST /v1/redirect/:code/verify`
**Auth**: Not required (public)

#### Request Body

```json
{
  "password": "securepass123"
}
```

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true,
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123X"
  }
}
```

#### Response - Failure (200 OK)

```json
{
  "success": true,
  "data": {
    "success": false
  }
}
```

#### Error Responses

- `400` - Link is not password protected
- `404` - Link not found

---

## Tag Management

### Create Tag

Create a new tag with custom colors.

**Endpoint**: `POST /v1/links/tags`
**Auth**: Required

#### Request Body

```json
{
  "name": "Important",
  "backgroundColor": "#3B82F6",  // Optional (default: #3B82F6)
  "textColor": "#FFFFFF"         // Optional (default: #FFFFFF)
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "tag-uuid",
    "userId": "user-uuid",
    "name": "Important",
    "backgroundColor": "#3B82F6",
    "textColor": "#FFFFFF",
    "createdAt": "2024-11-29T12:00:00Z",
    "updatedAt": "2024-11-29T12:00:00Z"
  }
}
```

#### Error Responses

- `401` - Unauthorized

---

### List Tags

Get all tags for the current user.

**Endpoint**: `GET /v1/links/tags`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "tag-uuid-1",
      "name": "Important",
      "backgroundColor": "#3B82F6",
      "textColor": "#FFFFFF",
      "createdAt": "2024-11-29T12:00:00Z"
    },
    {
      "id": "tag-uuid-2",
      "name": "Personal",
      "backgroundColor": "#10B981",
      "textColor": "#FFFFFF",
      "createdAt": "2024-11-28T10:00:00Z"
    }
  ]
}
```

---

### Update Tag

Update tag name or colors.

**Endpoint**: `PATCH /v1/links/tags/:id`
**Auth**: Required

#### Request Body

All fields are optional.

```json
{
  "name": "Very Important",
  "backgroundColor": "#EF4444",
  "textColor": "#FFFFFF"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "tag-uuid",
    "name": "Very Important",
    "backgroundColor": "#EF4444",
    "textColor": "#FFFFFF",
    "updatedAt": "2024-11-29T13:00:00Z"
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Tag not found

---

### Delete Tag

Delete a tag permanently.

**Endpoint**: `DELETE /v1/links/tags/:id`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Tag not found

---

### Assign Tag to Link

Add a tag to a link.

**Endpoint**: `POST /v1/links/:linkId/tags/:tagId`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link or tag not found

---

### Remove Tag from Link

Remove a tag from a link.

**Endpoint**: `DELETE /v1/links/:linkId/tags/:tagId`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link or tag not found

---

## Analytics

### Get Link Analytics (Detailed)

Get paginated click-level analytics for a link.

**Endpoint**: `GET /v1/links/:id/analytics`
**Auth**: Required

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "analytics-uuid",
      "linkId": "link-uuid",
      "clickedAt": "2024-11-29T12:00:00Z",
      "isUnique": true,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "browser": "Chrome",
      "browserVersion": "120.0",
      "os": "Windows",
      "osVersion": "10",
      "device": "desktop",
      "country": "United States",
      "countryCode": "US",
      "city": "New York",
      "region": "NY",
      "referrer": "https://google.com",
      "referrerDomain": "google.com",
      "utmSource": "twitter",
      "utmMedium": "social",
      "utmCampaign": "launch"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pageCount": 5
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link not found

---

### Get Analytics Summary

Get aggregated analytics summary for a link.

**Endpoint**: `GET /v1/links/:id/analytics/summary`
**Auth**: Required

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalClicks": 42,
    "uniqueVisitors": 28,
    "clicksByDate": [
      {
        "date": "2024-11-29",
        "clicks": 15
      },
      {
        "date": "2024-11-28",
        "clicks": 27
      }
    ],
    "topCountries": [
      {
        "country": "United States",
        "countryCode": "US",
        "count": 25
      },
      {
        "country": "Canada",
        "countryCode": "CA",
        "count": 10
      }
    ],
    "topCities": [
      {
        "city": "New York",
        "count": 12
      },
      {
        "city": "Los Angeles",
        "count": 8
      }
    ],
    "topDevices": [
      {
        "device": "desktop",
        "count": 30
      },
      {
        "device": "mobile",
        "count": 12
      }
    ],
    "topBrowsers": [
      {
        "browser": "Chrome",
        "count": 35
      },
      {
        "browser": "Firefox",
        "count": 7
      }
    ],
    "topReferrers": [
      {
        "referrerDomain": "google.com",
        "count": 20
      },
      {
        "referrerDomain": "twitter.com",
        "count": 15
      }
    ]
  }
}
```

#### Error Responses

- `401` - Unauthorized
- `404` - Link not found

---

## Email Notifications

Minifi sends automated email notifications for various events. All notification emails respect the user's `emailNotificationsEnabled` preference - if set to `false`, no emails are sent.

### Notification Types

| Type | Trigger | Recipients | Template |
|------|---------|------------|----------|
| **Welcome Email** | User first profile fetch (account creation) | New users | `welcome-email.tsx` |
| **Security Alert** | Link scan detects non-SAFE status | Link owner | `security-alert-email.tsx` |
| **Links Expiring** | Daily cron (9 AM UTC) | Users with links expiring in 3 days | `link-expiring-email.tsx` |
| **Monthly Report** | Monthly cron (1st of month, 10 AM UTC) | PRO users only | `monthly-report-email.tsx` |
| **Subscription Updated** | User upgrades to PRO | User | `subscription-email.tsx` |
| **Subscription Cancelled** | User cancels subscription | User | `subscription-email.tsx` |

### Cron Schedules

| Cron | Schedule | Description |
|------|----------|-------------|
| **Link Expiring** | Daily 9:00 AM UTC | Finds links expiring within 3 days, groups by user, sends one email per user |
| **Monthly Report** | 1st of month, 10:00 AM UTC | Sends analytics summary to PRO users for previous month |

### Email Opt-Out

Users can disable all email notifications via the preferences endpoint:

```bash
PATCH /v1/users/preferences
{
  "emailNotificationsEnabled": false
}
```

When `emailNotificationsEnabled` is `false`:
- No automated emails are sent
- Transactional emails (password reset, etc. via Keycloak) are not affected

### Monthly Report Contents (PRO Only)

The monthly report includes:
- Total clicks & unique visitors
- Active links count & new links created
- Growth percentage vs previous month
- Top 5 performing links
- Top 5 countries
- Device breakdown (desktop/mobile/tablet)
- Top 5 traffic sources
- Best performing day

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": { /* pagination metadata (if applicable) */ }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |

---

## Link Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Link is active and accessible |
| `SCHEDULED` | Link is scheduled for future activation |
| `DISABLED` | Link has been disabled (expired, click limit reached) |
| `ARCHIVED` | Link has been soft-deleted by user |

---

## Client-Side Redirect Pattern

Minifi uses a **client-side redirect pattern** instead of traditional server-side 302 redirects:

### Flow

1. Frontend requests `GET /v1/redirect/:code`
2. Backend returns JSON with link details
3. Frontend handles redirect via `window.location.href = data.originalUrl`

### Benefits

- Better error handling in frontend
- Easier to add loading states
- Simpler backend code (pure REST JSON responses)
- No server redirect lifecycle issues

### Example Frontend Code

```javascript
async function handleRedirect(code) {
  try {
    const response = await fetch(`/v1/redirect/${code}`);
    const { data } = await response.json();

    if (data.requiresPassword) {
      // Show password input form
      showPasswordForm(code);
    } else {
      // Redirect to original URL
      window.location.href = data.originalUrl;
    }
  } catch (error) {
    // Handle errors (404, 403, etc.)
    showErrorPage(error);
  }
}
```

---

## Rate Limiting

### Guest Users

- **5 links per day** per IP address
- Tracked via `guestIpAddress` field
- Resets every 24 hours from first link creation

### Authenticated Users

- Rate limiting handled by Keycloak and global throttle guards
- See backend configuration for specific limits

---

## Swagger/OpenAPI Documentation

Interactive API documentation is available via Swagger UI:

**URL**: `http://localhost:3001/api/docs`

The Swagger UI provides:
- Interactive API testing
- Request/response schemas
- Authentication setup
- Example requests and responses

---

## Additional Resources

- [Prisma Schema](./minifi-api/src/database/schema.prisma) - Database models
- [PHASE_ONE.MD](./PHASE_ONE.MD) - Implementation plan and progress
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed feature roadmap
- [CLAUDE.md](./CLAUDE.md) - Project overview and conventions

---

**Last Updated**: 2025-11-30
