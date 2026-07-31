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
      }
    ]
  }
}
```
