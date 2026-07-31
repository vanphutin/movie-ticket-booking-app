# Agent instructions — backend workspace

## Scope

- Applies to `apps/` and all backend applications/libraries below it.
- Stack: Node.js 20, NestJS 11, strict TypeScript, Fastify, Jest, ESLint and Prettier.

## Architecture

- Style: Clean Architecture.
- `domain` never imports NestJS, TypeORM, HTTP, environment configuration or providers.
- `application` depends only on domain and application-owned ports.
- `infrastructure` implements application ports; it is never imported by domain/application.
- `transport` validates/maps protocol data and contains no business invariant.
- `bootstrap` is the composition root.
- A service must not import another service's private source, entity or repository.

## Commands

- Format: `npm run format`
- Format check: `npm run format:check`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test:unit`
- Build: `npm run build`

## Verifiable config

```codex-guidelines
{
  "version": 1,
  "format": {
    "autofix": true,
    "commands": ["npm run format"],
    "windows": [],
    "posix": []
  },
  "lint": {
    "commands": ["npm run lint"],
    "windows": [],
    "posix": []
  },
  "test": {
    "commands": ["npm run test:unit"],
    "optional": false,
    "windows": [],
    "posix": []
  },
  "rules": {
    "forbid_globs": ["**/.env", "**/*.pem", "**/*.key"],
    "forbid_regex": [
      {
        "pattern": "synchronize\\s*:\\s*true",
        "message": "Schema synchronization is forbidden; use reviewed migrations."
      }
    ]
  }
}
```
