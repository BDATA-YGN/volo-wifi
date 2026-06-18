# `src/utils`

Shared helpers for controllers, middleware, and services.

## Active modules

| Module | Purpose |
|--------|---------|
| `async-controller.ts` | Wrap async route handlers → `next(err)` |
| `api-response.ts` | Standard `{ message, data }` / `{ error }` JSON |
| `exception.ts` | `CustomException`, `InvalidPayloadException` |
| `request-ip.ts` | Client IP / User-Agent behind proxies |
| `jwt.ts` | Access & refresh tokens (HS256, settings-backed secret) |
| `password.ts` | bcrypt hash/compare (**use instead of MD5 in auth**) |
| `string-utils.ts` | Query sanitization (`undefined` string guard) |
| `datetime.ts` | dayjs helpers + duration → ms |
| `constant.ts` | Shared API error codes/messages |
| `crypto.ts` | AES-256-GCM encrypt/decrypt (lazy; needs `REDIRECT_SECRET_KEY`) |
| `validateEnv.ts` | No-op shim; real validation in `config/env.ts` |

Barrel: `index.ts`.

## `_archive/` (unused)

- `response.ts` — legacy `responseHandler` / duplicate `asyncHandler`
- `auth.ts` — mobile `device-id` helper; logged full body/headers (unsafe)
- `general-fun.ts` — `snakeToCamel` (no imports)
- `validation.ts` — `isPhoneNumber` (no imports)

Restore only if you wire a feature back.

## Security notes

1. **Passwords** — Admin sign-in and user management use `hashPassword` / `comparePassword` (bcrypt). `comparePassword` still accepts legacy MD5 hex digests until rows are re-seeded or passwords reset.
2. **JWT** — Tokens use explicit `HS256`; secret from DB settings.
3. **API errors** — `responseError` omits `details` on 5xx in production/staging.
4. **IP headers** — Use with `TRUST_PROXY` in `.env` when behind a reverse proxy (`app.ts`).
5. **`crypto.ts`** — No longer crashes app at import without `REDIRECT_SECRET_KEY`; fails only when encrypt/decrypt is called.

## Error handling pattern

```ts
import { asyncController } from '@/utils/async-controller';
import { responseSuccess, responseError } from '@/utils/api-response';
import { CustomException } from '@/utils/exception';

public getThing = [
  asyncController(async (req, res) => {
    const row = await service.find(req.params.id);
    if (!row) throw new CustomException(404, 'NOT_FOUND', 'Not found');
    responseSuccess(res, { message: 'Success', data: row });
  }),
];
```

Unhandled errors → `ErrorMiddleware` (`middlewares/error.middleware.ts`).
