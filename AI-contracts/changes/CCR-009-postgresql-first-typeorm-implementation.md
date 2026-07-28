# CCR-009 — PostgreSQL-first design and TypeORM implementation baseline

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-07-28
- Approved by: Van Phu Tin
- Approved at: 2026-07-28
- Approval evidence: explicit `duyệt tiến hành làm, sau đó commit -> push` response after
  confirming repository-wide Week 4–10 scope
- Effective baseline before approval: `PC-2026.6`
- Effective baseline after approval: `PC-2026.7`
- Application/runtime change: none

## Problem

The project needs one consistent persistence mental model across Week 4 through Week 10.
Ticket-local wording alone can be misread as authorizing ORM-driven database design, while
the intended workflow is to reason about relational invariants and physical schema against
PostgreSQL 16 first, then use TypeORM only to implement the reviewed design in NestJS.

Without a project-level decision, later Identity, Catalog, Scheduling, Booking, Payment and
operations tickets could inconsistently treat TypeORM metadata as the schema authority or
choose a different relational adapter without reviewing compatibility and verification
impact.

## Decision

The project adopts the following repository-wide persistence baseline:

1. PostgreSQL 16 is the authoritative relational database target.
2. Relational learning, analysis and design MUST be ORM-independent and expressed through
   domain invariants, PostgreSQL tables/types, constraints, indexes, transactions,
   concurrency behavior and migration semantics.
3. TypeORM with the `pg` driver is the default NestJS relational persistence adapter during
   implementation.
4. TypeORM mappings, repositories and migrations MUST conform to the reviewed PostgreSQL
   design and MUST NOT redefine or weaken database invariants.
5. TypeORM remains an infrastructure/adapters concern. Domain and application code MUST NOT
   depend on TypeORM APIs, decorators or persistence entities.
6. Schema auto-synchronization remains prohibited. All schema changes use reviewed,
   immutable migrations.
7. Constraint, transaction, concurrency and migration claims MUST be verified against real
   PostgreSQL 16; mocked repositories or ORM-only unit tests do not prove database behavior.
8. A different relational database engine or default ORM requires a reviewed architecture
   impact and an approved CCR. A ticket may use direct parameterized SQL inside an approved
   TypeORM adapter when PostgreSQL-specific behavior cannot be represented safely by ORM
   metadata.

This decision does not require ERDs or design notes to contain TypeORM decorators, repository
APIs or framework wiring. A design note MAY identify TypeORM as the planned implementation
adapter, but PostgreSQL remains the vocabulary and authority for relational design.

## Scope and rollout

This baseline applies to all relational persistence work from Week 4 through Week 10,
including Identity, Catalog, Scheduling, Booking, Payment/Ticket, operational query work and
release migration verification.

Rollout updates:

- data contracts define PostgreSQL-first, ORM-independent design and real-engine evidence;
- architecture contracts place TypeORM in infrastructure/adapters;
- quality contracts select TypeORM + `pg` as the default NestJS implementation adapter;
- coding guidelines project the same rules into module-local guidance after real module
  roots are scaffolded;
- the current ticket remains `TKT-W04-D02` at `DESIGN`; approval does not create
  application files or advance readiness.

## Alternatives considered

### Selected: PostgreSQL-first design with TypeORM implementation

This preserves database invariants independently of framework details while giving NestJS
implementation a consistent persistence adapter.

### Rejected: TypeORM-driven schema design

Decorator-first design couples invariants to ORM expressiveness and can obscure
PostgreSQL-specific constraints, indexes, locks and transaction behavior.

### Rejected: leave the ORM undecided per ticket

Per-ticket freedom adds avoidable tooling and migration variance across a seven-week,
single-learner project. Reconsider only through reviewed architecture impact and an
approved baseline change.

## Risks and controls

- **ORM leakage into domain:** enforced by dependency-direction contracts and module-local
  guidelines after scaffold.
- **Schema drift:** migrations and PostgreSQL design remain authoritative;
  `synchronize: true` is prohibited.
- **False database evidence:** correctness claims require real PostgreSQL 16 verification.
- **TypeORM expressiveness gap:** approved adapters may use parameterized PostgreSQL SQL
  while keeping ownership and migration rules intact.
- **Premature tooling claims:** no package, module, command or installed dependency is
  inferred before scaffold and readiness.

## Verification requirements

- repository contract/state validation passes at baseline `PC-2026.7`;
- no application scaffold or dependency is introduced by this CCR;
- ticket stage, required output and next action remain unchanged;
- future relational design artifacts use PostgreSQL vocabulary;
- future implementation manifests and module guidelines keep TypeORM in
  infrastructure/adapters and disable schema synchronization.

## Verdict

`APPROVED`
