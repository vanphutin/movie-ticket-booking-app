# Agent instructions — Identity Service

## Scope

- Applies to `apps/identity-service/`.
- Owns credentials, roles, refresh sessions, registration idempotency and `/me`.

## Boundaries

- `domain` is framework-free.
- `application` imports no NestJS, TypeORM, entity, DataSource, EntityManager or QueryRunner.
- TypeORM exists only under `infrastructure/database`.
- Transactions are short, contain no network call and lock user/session rows consistently.
- Passwords and refresh tokens are never persisted or logged in plaintext.

For non-obvious transaction ordering, row locks, idempotency, refresh-token rotation/reuse
or unknown commit outcomes, preserve the invariant or failure reason in an intent-bearing
comment when naming, types and tests are insufficient. Follow the workspace `CCR-011`
comment policy; do not narrate obvious control flow.

## Commands

- Format: `npm --prefix .. run format`
- Lint: `npm --prefix .. run lint`
- Test: `npm --prefix .. run test:unit`
- Build: `npm --prefix .. run build:identity`

## Verifiable config

```codex-guidelines
{
  "version": 1,
  "format": {
    "autofix": true,
    "commands": ["npm --prefix .. run format"],
    "windows": [],
    "posix": []
  },
  "lint": {
    "commands": ["npm --prefix .. run lint"],
    "windows": [],
    "posix": []
  },
  "test": {
    "commands": ["npm --prefix .. run test:unit"],
    "optional": false,
    "windows": [],
    "posix": []
  },
  "rules": {
    "forbid_globs": ["**/.env", "**/*.pem", "**/*.key"],
    "forbid_regex": [
      {
        "pattern": "synchronize\\s*:\\s*true",
        "message": "Identity schema changes require reviewed migrations."
      },
      {
        "pattern": "\\b(?:T[O]DO|F[I]XME|H[A]CK|T[E]MP)\\b(?!(?=[^\\r\\n]*(?:TKT|EF|CCR|ADR)-[A-Z0-9-]+)(?=[^\\r\\n]*(?:remove|removal|until|when)))",
        "message": "Temporary annotations require a traceable identifier and an explicit removal condition."
      }
    ]
  }
}
```
