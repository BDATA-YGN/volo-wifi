# Audit Logger

A centralized audit logging utility for tracking user actions and system events.

## Installation

No additional installation required. The audit logger uses the existing Prisma client.

## Import

```typescript
import { auditLogger } from '@/lib/auditlogger';
```

## Types

```typescript
type AuditLogType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER' | 'SYSTEM';
type AuditLogSeverity = 'INFO' | 'WARNING' | 'ERROR';
```

## Methods

### `log(input: AuditLogInput)`

Log a generic audit event with full control over all fields.

```typescript
interface AuditLogInput {
  type: AuditLogType;
  severity: AuditLogSeverity;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}
```

**Example:**
```typescript
await auditLogger.log({
  type: 'UPDATE',
  severity: 'INFO',
  userId: 'user-123',
  userEmail: 'admin@example.com',
  action: 'Updated user profile',
  resource: 'user-profile',
  details: JSON.stringify({ field: 'email', old: 'old@email.com', new: 'new@email.com' }),
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
});
```

---

### `logFromRequest(req: Request, input, options?)`

Log an audit event from an Express request. Automatically captures `ipAddress` and `userAgent` from the request.

```typescript
interface AuditLogOptions {
  details?: Record<string, unknown> | string;
}
```

**Example:**
```typescript
await auditLogger.logFromRequest(req, {
  type: 'CREATE',
  severity: 'INFO',
  userId: user.id,
  userEmail: user.email,
  action: `${req.method} ${req.originalUrl}`,
  resource: 'songs',
}, { details: req.body });
```

---

### `logAction(userId, userEmail, action, resource, type, severity?, details?, ipAddress?, userAgent?)`

Log a custom action with specified type and severity.

**Example:**
```typescript
await auditLogger.logAction(
  'user-123',
  'admin@example.com',
  'DOWNLOAD_SONG',
  'music',
  'OTHER',
  'INFO',
  'Downloaded song ID: 456',
  '192.168.1.100'
);
```

---

### `logCreate(userId, userEmail, resource, details?, ipAddress?, userAgent?)`

Convenience method for logging create operations.

**Example:**
```typescript
await auditLogger.logCreate(
  'user-123',
  'admin@example.com',
  'playlist',
  'Created new playlist: "My Favorites"'
);
```

---

### `logUpdate(userId, userEmail, resource, details?, ipAddress?, userAgent?)`

Convenience method for logging update operations.

**Example:**
```typescript
await auditLogger.logUpdate(
  'user-123',
  'admin@example.com',
  'playlist',
  'Updated playlist name to "Summer Hits"'
);
```

---

### `logDelete(userId, userEmail, resource, details?, ipAddress?, userAgent?)`

Convenience method for logging delete operations.

**Example:**
```typescript
await auditLogger.logDelete(
  'user-123',
  'admin@example.com',
  'playlist',
  'Deleted playlist ID: 789'
);
```

---

### `logLogin(userId, userEmail, details?, ipAddress?, userAgent?)`

Convenience method for logging login events.

**Example:**
```typescript
await auditLogger.logLogin(
  'user-123',
  'user@example.com',
  'User logged in successfully'
);
```

---

### `logLogout(userId, userEmail, details?, ipAddress?, userAgent?)`

Convenience method for logging logout events.

**Example:**
```typescript
await auditLogger.logLogout(
  'user-123',
  'user@example.com',
  'User logged out'
);
```

---

### `logError(userId, userEmail, action, resource, error, ipAddress?, userAgent?)`

Convenience method for logging error events with severity `ERROR`.

**Example:**
```typescript
await auditLogger.logError(
  'user-123',
  'admin@example.com',
  'PAYMENT_FAILED',
  'payment',
  'Payment declined: insufficient funds'
);
```

---

## Usage in Controllers

```typescript
// In your controller
import { auditLogger } from '@/lib/auditlogger';

export const createPlaylist = async (req, res) => {
  // ... your logic

  await auditLogger.logCreate(
    user.id,
    user.email,
    'playlist',
    `Created playlist: "${playlistName}"`
  );

  res.json(playlist);
};
```

## Usage in Middleware

```typescript
import { auditLogger } from '@/lib/auditlogger';

export const auditMiddleware = (type: AuditLogType, resource: string) => {
  return async (req, res, next) => {
    const user = req.user;
    
    await auditLogger.logFromRequest(req, {
      type,
      severity: 'INFO',
      userId: user?.id || 'anonymous',
      userEmail: user?.email || 'anonymous',
      action: `${req.method} ${req.originalUrl}`,
      resource,
    });

    next();
  };
};

// Usage
router.post('/users', auditMiddleware('CREATE', 'users'), createUser);
```

## Best Practices

1. **Always include meaningful details** - Use the `details` field to capture relevant context
2. **Use appropriate severity levels** - Use `ERROR` for failed operations, `WARNING` for suspicious activities
3. **Log sensitive data carefully** - Avoid logging passwords, tokens, or PII in plain text
4. **Use convenience methods** - Use `logCreate`, `logUpdate`, `logDelete` when applicable for consistency

## Database Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| timestamp | DateTime | When the action occurred |
| type | AuditLogType | Type of action |
| severity | AuditLogSeverity | Severity level |
| userId | String | ID of user who performed action |
| userEmail | String | Email of user |
| action | String | Description of action |
| resource | String | Resource affected |
| details | String | Additional details (JSON) |
| ipAddress | String | Client IP address |
| userAgent | String | Client user agent |
