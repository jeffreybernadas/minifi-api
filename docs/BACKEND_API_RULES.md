# Backend API Development Rules

> **Purpose:** Standardized patterns and rules for backend development in `minifi-api/`  
> **Last Updated:** November 29, 2025  
> **Rule:** DO NOT create new utilities, helpers, or abstractions if they already exist!

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** | Project overview & architecture |
| **[BACKEND_PLAN.md](./BACKEND_PLAN.md)** | Backend development plan |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | API endpoint reference |
| **[CLAUDE.md](./CLAUDE.md)** | AI assistant context |

---

## ⚠️ CRITICAL RULE: Use What Already Exists

**Before creating ANYTHING new, check if it already exists!**

The codebase already has:
- ✅ LoggerService (Winston + Elasticsearch)
- ✅ Response transformation interceptor
- ✅ Exception filter (HTTP + WebSocket + Prisma)
- ✅ Custom error exception
- ✅ Swagger decorators (standard, error, paginated)
- ✅ Pagination utilities (offset & cursor)
- ✅ Pagination DTOs
- ✅ Password utilities (bcrypt)
- ✅ Short code generator (nanoid)
- ✅ Visitor ID hasher
- ✅ QR code generator
- ✅ MinIO storage service
- ✅ Resend email service
- ✅ RabbitMQ queue producers/consumers

**DO NOT:**
- ❌ Create a new logger
- ❌ Create new response wrappers
- ❌ Create new error classes (unless truly unique)
- ❌ Create new pagination helpers
- ❌ Duplicate existing utilities

---

## 📁 Existing Infrastructure Reference

### Logging

**Location:** `src/shared/logger/logger.service.ts`

```typescript
// CORRECT: Inject and use LoggerService
constructor(private readonly logger: LoggerService) {}

// Usage - always include context and optional meta
this.logger.log('Message here', 'ControllerName', { userId, linkId });
this.logger.warn('Warning message', 'ServiceName', { details });
this.logger.error('Error message', 'ServiceName', error?.stack);
```

**DO NOT:**
```typescript
// ❌ WRONG: Using console or creating new logger
console.log('...');
const logger = new Logger('MyService');
```

---

### Response Transformation

**Location:** `src/interceptors/transform-response.interceptor.ts`

The interceptor automatically wraps all responses in:
```json
{
  "success": true,
  "statusCode": 200,
  "path": "/v1/links",
  "timestamp": "2025-11-29T12:00:00.000Z",
  "data": { /* your data */ },
  "meta": { /* pagination meta if present */ }
}
```

**You don't need to wrap responses manually!** Just return the data:

```typescript
// CORRECT: Just return the data
async getLink(id: string): Promise<LinkResponseDto> {
  return this.prisma.link.findUnique({ where: { id } });
}

// CORRECT: Return paginated data with { data, meta }
async getLinks(filters): Promise<OffsetPaginatedDto<LinkResponseDto>> {
  return offsetPaginateWithPrisma(this.prisma.link, filters, { where });
}
```

**DO NOT:**
```typescript
// ❌ WRONG: Manual wrapping
return { success: true, data: link };
return { statusCode: 200, data: links };
```

---

### Error Handling

**Location:** `src/filters/exceptions.filter.ts`

**Custom Error Exception:** `src/filters/exceptions/custom-error.exception.ts`

```typescript
// CORRECT: Use existing exceptions
import { CustomErrorException } from '@/filters/exceptions/custom-error.exception';
import { CustomErrorCode } from '@/enums/custom-error-enum';

// Throw custom error
throw new CustomErrorException(
  'Link not found',
  HttpStatus.NOT_FOUND,
  CustomErrorCode.RECORD_NOT_FOUND,
);

// Or use NestJS built-in exceptions
throw new NotFoundException('Link not found');
throw new ForbiddenException('PRO subscription required');
throw new BadRequestException('Invalid URL format');
```

**Error Response Format (automatic):**
```json
{
  "success": false,
  "statusCode": 404,
  "path": "/v1/links/123",
  "timestamp": "2025-11-29T12:00:00.000Z",
  "error": {
    "code": "RECORD_NOT_FOUND",
    "message": "Link not found"
  }
}
```

**DO NOT:**
```typescript
// ❌ WRONG: Creating new error classes or manual formatting
class MyCustomError extends Error {}
return res.status(404).json({ error: 'Not found' });
```

---

### Swagger Decorators

**Location:** `src/decorators/swagger.decorator.ts`

**Available Decorators:**

| Decorator | Purpose |
|-----------|---------|
| `@ApiStandardResponse()` | Standard success response |
| `@ApiStandardErrorResponse()` | Error response |
| `@ApiPaginatedResponse()` | Offset paginated response |
| `@ApiCursorPaginatedResponse()` | Cursor paginated response |

```typescript
// CORRECT: Use shared decorators
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';

@Get(':id')
@ApiOperation({ summary: 'Get link by ID' })
@ApiStandardResponse({
  status: 200,
  description: 'Link retrieved successfully',
  type: LinkResponseDto,
})
@ApiStandardErrorResponse({
  status: 404,
  description: 'Link not found',
  errorCode: 'NOT_FOUND',
})
async getLinkById(@Param('id') id: string): Promise<LinkResponseDto> {
  return this.linkService.getLinkById(id);
}

@Get()
@ApiOperation({ summary: 'List links with pagination' })
@ApiPaginatedResponse(LinkResponseDto)
async getLinks(@Query() filters: LinkFilterDto): Promise<OffsetPaginatedDto<LinkResponseDto>> {
  return this.linkService.getLinks(filters);
}
```

**DO NOT:**
```typescript
// ❌ WRONG: Using raw @ApiResponse with manual schema
@ApiResponse({
  status: 200,
  schema: {
    type: 'object',
    properties: { /* ... */ }
  }
})
```

---

### Pagination

**Location:** `src/utils/pagination/prisma-pagination.util.ts`

**DTOs:**
- `src/common/dto/offset-pagination/` - Offset-based
- `src/common/dto/cursor-pagination/` - Cursor-based

**Offset Pagination (for standard lists):**
```typescript
import { OffsetPageOptionsDto, OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';

async getUserLinks(
  userId: string,
  pageOptions: OffsetPageOptionsDto,
): Promise<OffsetPaginatedDto<Link>> {
  return offsetPaginateWithPrisma(
    this.prisma.link,
    pageOptions,
    {
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: { tags: { include: { tag: true } } },
    },
  );
}
```

**Cursor Pagination (for real-time feeds):**
```typescript
import { CursorPageOptionsDto, CursorPaginatedDto } from '@/common/dto/cursor-pagination';
import { cursorPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';

async getAnalytics(
  linkId: string,
  pageOptions: CursorPageOptionsDto,
): Promise<CursorPaginatedDto<LinkAnalytics>> {
  return cursorPaginateWithPrisma(
    this.prisma.linkAnalytics,
    pageOptions,
    {
      where: { linkId },
      orderBy: { clickedAt: 'desc' },
    },
    'id', // cursor field
  );
}
```

**DO NOT:**
```typescript
// ❌ WRONG: Manual pagination
const skip = (page - 1) * limit;
const data = await this.prisma.link.findMany({ skip, take: limit });
const total = await this.prisma.link.count();
return { data, total, page, limit };
```

---

### Password Utilities

**Location:** `src/utils/password/password.util.ts`

```typescript
import { hashPassword, verifyPassword } from '@/utils/password/password.util';

// Hash password before saving
const hashedPassword = await hashPassword(dto.password);

// Verify password
const isValid = await verifyPassword(inputPassword, storedHash);
```

---

### Short Code Generation

**Location:** `src/utils/shortcode/shortcode.util.ts`

```typescript
import { generateShortCode } from '@/utils/shortcode/shortcode.util';

// Generate 7-character base58 code
const shortCode = generateShortCode(); // e.g., "abc123X"
```

---

### QR Code Generation

**Location:** `src/utils/qrcode/qrcode.util.ts`

```typescript
import { generateQRCodeBuffer } from '@/utils/qrcode/qrcode.util';

const buffer = await generateQRCodeBuffer(shortUrl);
// Upload buffer to MinIO
```

---

### Visitor ID Hashing

**Location:** `src/utils/visitor/visitor-id.util.ts`

```typescript
import { generateVisitorId } from '@/utils/visitor/visitor-id.util';

// Generate privacy-preserving visitor ID
const visitorId = generateVisitorId(ipAddress, userAgent);
```

---

### MinIO Storage

**Location:** `src/shared/storage/minio.service.ts`

```typescript
constructor(private readonly minioService: MinioService) {}

// Upload file
const url = await this.minioService.uploadFile(
  buffer,
  `qr-codes/${linkId}.png`,
  'image/png',
);

// Get file URL
const url = this.minioService.getFileUrl('qr-codes/abc123.png');
```

---

### Email (Resend)

**Location:** `src/shared/mail/resend.service.ts`

```typescript
constructor(private readonly resendService: ResendService) {}

await this.resendService.sendEmail({
  to: user.email,
  subject: 'Security Alert',
  template: SecurityAlertEmail,
  props: { userName, linkDetails },
});
```

---

### Queue (RabbitMQ)

**Location:** `src/shared/queues/`

```typescript
// Producer (publish to queue)
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { QUEUE_EXCHANGES, QUEUE_ROUTING_KEYS } from '@/shared/queues/constants/queue.constant';

await this.amqpConnection.publish(
  QUEUE_EXCHANGES.SECURITY,
  QUEUE_ROUTING_KEYS.SECURITY_SCAN,
  { linkId, url },
);

// Consumer (subscribe to queue)
@RabbitSubscribe({
  exchange: QUEUE_EXCHANGES.SECURITY,
  routingKey: QUEUE_ROUTING_KEYS.SECURITY_SCAN,
  queue: QUEUE_NAMES.SECURITY_SCAN,
})
async handleSecurityScan(job: SecurityScanJob): Promise<void> {
  // Process job
}
```

---

## 🎯 Controller Design Pattern

Every controller MUST follow this pattern:

### 1. Controller Structure

```typescript
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

@ApiTags('feature-name')           // Swagger tag
@ApiBearerAuth('JWT')              // Auth requirement
@Controller({ path: 'feature-name', version: '1' })  // API versioning
export class FeatureController {
  constructor(
    private readonly featureService: FeatureService,
    private readonly logger: LoggerService,  // Always inject logger
  ) {}

  // Endpoints here...
}
```

### 2. Endpoint Pattern

```typescript
@Post()
@ApiOperation({
  summary: 'Short description',
  description: 'Detailed description of what this endpoint does.',
})
@ApiStandardResponse({
  status: 201,
  description: 'Success description',
  type: ResponseDto,
})
@ApiStandardErrorResponse({
  status: 400,
  description: 'Validation Error',
  errorCode: 'VALIDATION_ERROR',
})
@ApiStandardErrorResponse({
  status: 401,
  description: 'Unauthorized',
  errorCode: 'UNAUTHORIZED',
})
async createSomething(
  @AuthenticatedUser() user: KeycloakJWT,
  @Body() dto: CreateDto,
): Promise<ResponseDto> {
  return this.featureService.create(user.sub, dto);
}
```

### 3. Public Endpoint Pattern

```typescript
@Public()  // Mark as public (no auth required)
@Post('guest')
@ApiOperation({ summary: 'Public endpoint description' })
@ApiStandardResponse({ status: 201, type: ResponseDto })
@ApiStandardErrorResponse({ status: 429, errorCode: 'TOO_MANY_REQUESTS' })
async publicAction(@Body() dto: PublicDto): Promise<ResponseDto> {
  return this.featureService.publicAction(dto);
}
```

### 4. Paginated Endpoint Pattern

```typescript
@Get()
@ApiOperation({ summary: 'List items with pagination' })
@ApiPaginatedResponse(ItemResponseDto)
@ApiStandardErrorResponse({ status: 401, errorCode: 'UNAUTHORIZED' })
async getItems(
  @AuthenticatedUser() user: KeycloakJWT,
  @Query() filters: ItemFilterDto,
): Promise<OffsetPaginatedDto<ItemResponseDto>> {
  return this.featureService.getItems(user.sub, filters);
}
```

---

## 📦 Service Design Pattern

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    // Other dependencies...
  ) {}

  async create(userId: string, dto: CreateDto): Promise<ResponseDto> {
    this.logger.log('Creating item', 'FeatureService', { userId });

    try {
      const item = await this.prisma.item.create({
        data: { ...dto, userId },
      });

      this.logger.log('Item created', 'FeatureService', { itemId: item.id });
      return this.mapToResponseDto(item);
    } catch (error) {
      this.logger.error('Failed to create item', 'FeatureService', error?.stack);
      throw error; // Let exception filter handle it
    }
  }

  async getItems(
    userId: string,
    filters: ItemFilterDto,
  ): Promise<OffsetPaginatedDto<ResponseDto>> {
    const where = this.buildWhereClause(userId, filters);
    
    return offsetPaginateWithPrisma(
      this.prisma.item,
      filters,
      { where, orderBy: { createdAt: 'desc' } },
    );
  }
}
```

---

## 📝 DTO Design Pattern

**Location:** `src/modules/<feature>/dto/`

```typescript
// create-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'https://example.com' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'My item' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}

// item-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() title?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// item-filter.dto.ts (extends pagination)
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class ItemFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'ARCHIVED'])
  status?: string;
}
```

---

## 🔐 Guard Usage

```typescript
// Built-in from nest-keycloak-connect
import { AuthenticatedUser, Public, Roles } from 'nest-keycloak-connect';

// Public endpoint (no auth)
@Public()
@Get('public')
async publicEndpoint() {}

// Authenticated endpoint (default)
@Get('protected')
async protectedEndpoint(@AuthenticatedUser() user: KeycloakJWT) {}

// Role-based (Keycloak roles)
@Roles({ roles: ['admin'] })
@Get('admin-only')
async adminEndpoint() {}
```

---

## 🗂️ Module Registration

**Always register new modules in `api.module.ts`:**

```typescript
// src/modules/api.module.ts
import { Module } from '@nestjs/common';
import { FeatureModule } from './feature/feature.module';

@Module({
  imports: [
    // Existing modules
    HealthModule,
    UserModule,
    LinkModule,
    // New module
    FeatureModule,
  ],
})
export class ApiModule {}
```

**Register cron jobs in `worker.module.ts`:**

```typescript
// src/worker/worker.module.ts
providers: [
  // Existing crons
  LinkSchedulerCron,
  // New cron
  FeatureCron,
],
```

---

## 📁 Path Aliases

**Always use `@/` path alias:**

```typescript
// CORRECT
import { LoggerService } from '@/shared/logger/logger.service';
import { PrismaService } from '@/database/database.service';
import { LinkResponseDto } from '@/modules/link/dto/link-response.dto';

// ❌ WRONG
import { LoggerService } from '../../../shared/logger/logger.service';
import { LoggerService } from 'src/shared/logger/logger.service';
```

---

## ✅ Pre-Commit Checklist

Before committing any backend code:

- [ ] Used existing utilities (logger, pagination, etc.)
- [ ] Followed controller pattern (versioning, swagger, decorators)
- [ ] Used shared Swagger decorators
- [ ] Used pagination utilities for list endpoints
- [ ] Used existing exception classes
- [ ] Injected LoggerService and added logs
- [ ] Used `@/` path aliases
- [ ] Registered module in api.module.ts
- [ ] Ran `npm run lint`
- [ ] Ran `npm test`

---

**End of Backend API Rules**

> Reference this document before writing any new backend code!

