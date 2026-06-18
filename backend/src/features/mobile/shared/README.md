# Mobile shared (`features/mobile/shared`)

Cross-cutting code for SMS mobile v1 APIs under `features/mobile/v1/`.

## Layout

| Path | Purpose |
|------|---------|
| `constants.ts` | HTTP headers, platform values, API prefix, role names |
| `types/mobile-request.ts` | `MobileDeviceInfo`, `SmsMobileRequest`, `SmsMobileActor` |
| `utils/token.ts` | Bearer / cookie token extraction |
| `resolve-actor.ts` | Map `Admin` + role → customer or collector actor |
| `content-utils.ts` | Published content query helpers |
| `serializers.ts` | Response DTO mappers for licenses, invoices, etc. |
| `middleware/` | Device envelope, auth, role guards |

## Middleware chains

```typescript
import {
  MobileDeviceMiddleware,
  smsMobileProtectedChain,
  RequireSmsCustomerMiddleware,
  RequireCollectorMiddleware,
} from '@/features/mobile/shared/middleware';

// Public route (login): device headers only
router.post('/login', MobileDeviceMiddleware, handler);

// Protected customer route
for (const mw of smsMobileProtectedChain) router.use(mw);
router.use(RequireSmsCustomerMiddleware);
```

Auth uses the same `Admin` + `AdminToken` session as the web console (`AuthService.validateToken`). Mobile clients send `Authorization: Bearer`; web may use the `access_token` cookie.

Allowed roles: `CUSTOMER` (linked `SmsCustomer`) and `COLLECTOR`.
