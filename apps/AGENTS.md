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

## Coding checkpoint

- Before application work, reconcile the canonical `coding_checkpoint` under CCR-012.
- Only use paths authorized by the current ticket's reviewed expected-files manifest.
- New or materially changed steps use the shared eight-section Coding Action Card.
- `done` or `fixed` triggers verification; only observed evidence advances the step.

## Code comments

- Review comments after every authored or materially modified application-code unit.
- Add comments only for non-obvious design intent, invariants, security/trust boundaries,
  concurrency or failure semantics, compatibility constraints and necessary workarounds.
- Prefer clear names, types, structure, validation and tests over comments that narrate code.
- Update or remove stale comments. A committed temporary annotation must reference a
  ticket/finding/decision and state its removal condition.
- Record the applicable `CCR-011` comment-review disposition in self-review.

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
      },
      {
        "pattern": "\\b(?:T[O]DO|F[I]XME|H[A]CK|T[E]MP)\\b(?!(?=[^\\r\\n]*(?:TKT|EF|CCR|ADR)-[A-Z0-9-]+)(?=[^\\r\\n]*(?:remove|removal|until|when)))",
        "message": "Temporary annotations require a traceable identifier and an explicit removal condition."
      }
    ]
  }
}
```
