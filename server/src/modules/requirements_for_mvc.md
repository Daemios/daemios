# MVC (Controller / Service / Domain) — 3-Layer (No Repo Wrapper)

> Minimal layering where **Service** talks to Prisma directly. **Domain stays pure** (no I/O). Controllers remain transport-only.

## Controller — I/O boundary

- **Purpose:** Validate transport shape (HTTP body/query/headers), invoke a use-case, map results/errors to HTTP.
- **Includes:** Type/coercion checks, basic format (e.g., email regex), auth/authorization gate, pagination params, idempotency key presence.
- **Excludes:** Business rules, data access (no Prisma), cross-entity workflows.
- **I/O:** Receives `Request`-shaped data; returns status + JSON DTOs.
- **Test:** Malformed input yields 4xx **without** calling the service.

## Service (Use-case) — Orchestrator + Persistence

- **Purpose:** Coordinate the workflow and **own persistence**: start/commit transactions, call Prisma, apply domain rules, trigger side effects.
- **Includes:** `prisma.$transaction(...)`, loading/saving state, invoking domain methods, emails/queues/webhooks, idempotency handling, concurrency control.
- **Excludes:** HTTP/transport concerns in function signatures; **do not** pass Express types around; keep Prisma types from leaking upward/downward.
- **I/O:** Accepts validated primitives/DTOs; returns plain DTOs suited for controllers.
- **Test:** With stubbed ports/clock/publisher, enforces invariants and writes correct state exactly once.

## Domain — Business core

- **Purpose:** Define entities/value objects, invariants, and state transitions; record domain events on meaningful changes.
- **Includes:** Rules like “age ≥ 18,” “cart ≤ 50 items,” non-combinable discounts; methods such as `markPaid`, `checkout`, `applyPromo`.
- **Excludes:** I/O, HTTP, Prisma/SQL, transactions; entities/VOs never call databases.
- **I/O:** Pure methods over in-memory state; may **collect** domain events for the service to publish after commit.
- **Test:** Pure unit tests (no infra mocks).

---

## Infra Rules (even without a repo layer)

- **Only Services talk to Prisma.** Controllers and Domain never import Prisma.
- **Keep Prisma localized.** Avoid sprinkling raw queries across many services; centralize per module/use-case.
- **Map boundaries.** Convert Prisma rows → plain DTOs before handing to Domain; Domain returns plain data back.
- **Transactions live in Service.** Aggregate all writes inside `prisma.$transaction(...)`.
- **Publish after commit.** Domain **records** events; Service persists state, commits, then publishes (or uses a simple `event_log` table if stronger guarantees are needed).
- **Concurrency in Service.** Use unique constraints, conditional updates, or `SELECT … FOR UPDATE` equivalents; validate Domain invariants after reads.

---

## Quick Smell Checks

- Controller imports Prisma → **leak** (move to Service).
- Service just forwards args to Prisma without rules → **anemic** (put actual invariants/orchestration here).
- Domain references Express/Prisma types → **coupling** (strip to plain types).
- Business decisions inside raw queries (e.g., “can delete if…”) → **misplaced rule** (move to Domain/Service).
- Domain performs I/O or publishes events directly → **timing risk** (record events; Service publishes post-commit).

## Litmus Tests

- **Swap ORM or go raw SQL** → only **Service** changes; Controller/Domain stay intact.
- **Add workflow step** (email/webhook) → **Service** changes; Domain unchanged unless a rule changes.
- **Change a rule** (e.g., discount policy) → **Domain** changes; Service orchestration remains.
- **Retry the same request safely** → Controller requires idempotency key; **Service** enforces idempotency around the use-case.

---

### Minimal Flow (conceptual)

1. **Controller** validates request → calls Service.
2. **Service** starts transaction → loads rows with Prisma → calls **Domain** methods (apply rules/state changes) → writes rows → commits → publishes recorded domain events.
3. **Domain** holds invariants and records events; never touches I/O.
