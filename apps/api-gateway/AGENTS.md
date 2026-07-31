# Agent instructions — API Gateway

## Scope

- Applies to `apps/api-gateway/`.
- Owns public HTTP, access-token verification, correlation and authenticated Identity calls.

## Boundaries

- No Identity database, TypeORM entity or private Identity source import.
- No Identity domain rule in Gateway.
- Untrusted actor/internal headers are stripped before trusted context is created.
- Application code depends on behavioral ports; infrastructure implements them.

## Commands

- Format: `npm --prefix .. run format`
- Lint: `npm --prefix .. run lint`
- Test: `npm --prefix .. run test:unit`
- Build: `npm --prefix .. run build:gateway`

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
    "forbid_globs": ["src/domain/**"],
    "forbid_regex": [
      {
        "pattern": "identity-service[/]src|from\\s+['\\\"](?:@nestjs[/]typeorm|typeorm)['\\\"]",
        "message": "Gateway must call Identity through the authenticated client port."
      }
    ]
  }
}
```
