Test Contracts — Character, Equipment, Inventory

Purpose

This document contains first-principles test contracts for three high-priority modules: character, equipment, and inventory. Each section lists:

- Inputs and outputs for domain functions, service orchestration, and controllers.
- Invariants and post-conditions the system must satisfy.
- Edge cases and failure modes to assert in tests.
- Prioritized test list for implementation.

Guiding principles

- Domain functions are pure and side-effect free. Tests should call domain functions directly and assert outputs and that no external state changed.
- Service tests should verify orchestration: that the right repository/Prisma calls are made, changes are applied in the correct order, and transactions are rolled back on failure.
- Controller tests should verify HTTP-level behavior: input validation, status codes, body shapes, and mapping of DomainError -> HTTP 4xx/5xx.

1. Equipment

Domain functions (example signatures)

- validateEquipPayload({ characterId, itemId, slot }): throws DomainError on invalid payload or returns sanitized payload.
- computeSlotForItem(item, character): returns slot id or null.
- applyEquipEffects(character, item): returns { characterDelta, itemDelta } describing changed equipment and inventory.

Invariants / Expectations

- Domain functions never touch DB or IO.
- validateEquipPayload enforces ownership, slot compatibility, and that item is equippable.
- applyEquipEffects is deterministic: given same inputs, same deltas.

Edge cases

- itemId missing / null / invalid format
- slot doesn't exist on character (invalid slot name)
- item not equippable (non-equippable items)
- character already has item in that slot: should replace and return previous item as `unequipped` delta
- equipping into container (e.g., wielding a container) should move contained items where appropriate or reject if not allowed
- equipping item not owned by the character

Prioritized tests (service + domain)

1. Equipment.domain.validateEquipPayload: missing itemId -> throws DomainError (bad request)
2. Equipment.domain.validateEquipPayload: item not equippable -> throws DomainError
3. Equipment.service.equip(happy path): character owns item, slot free -> calls repository update to set equipped slot, remove item from inventory; returns expected DTO
4. Equipment.service.equip(replace): slot occupied -> moves previous item to inventory and places new one; DB calls executed in correct order inside transaction
5. Equipment.service.equip(item not owned): throws DomainError, no DB writes
6. Equipment.service.equip(partial failure): simulate DB failure mid-transaction -> verify rollback (no net changes)

2) Inventory

Domain functions

- validateMovePayload({ characterId, itemId, source, target, index }): throws on malformed or forbidden moves
- computeTargetIndex(container, target, desiredIndex): returns integer index or throws if overflow
- canAccept(container, item): boolean whether container has capacity and accepts the item type

Invariants

- validateMovePayload must ensure source contains the itemId
- Moves between containers maintain total counts and not exceed capacities
- When moving item into a container the item must be removed from source first and added to target in the same transaction

Edge cases

- move to same slot (no-op)
- move index beyond container capacity -> throws
- moving an item that is currently equipped -> change equip state appropriately (unequip)
- container and pocket semantics (pockets vs straightforward containers)

Prioritized tests

1. Inventory.domain.validateMovePayload: missing itemId -> throws
2. Inventory.service.move(happy path): single item move between two inventory containers -> verify repository calls: removeFromSource, addToTarget
3. Inventory.service.move(to invalid index): throws DomainError and no DB writes
4. Inventory.service.move(item equipped): ensure equipment is updated/unequipped and item moves
5. Inventory.service.move(concurrent): simulate two moves conflicting -> ensure deterministic outcome or proper conflict error

3) Character

Domain functions

- mapItemForClient(item, options) -> client-friendly DTO (images, labels, flags)
- makePocketsPlaceholder(maxPockets) -> placeholder shape for UI

Invariants

- mapItemForClient never returns DB models; it returns sanitized DTO with image path, label, id
- missing image or label falls back to sanitized defaults

Edge cases

- null item -> returns null or throws depending on use-case
- item without label -> uses fallback string

Prioritized tests

1. Character.domain.mapItemForClient: full item -> returns expected DTO fields
2. Character.domain.mapItemForClient: missing image -> fallback image path used
3. Character.domain.makePocketsPlaceholder: negative or zero -> empty list; positive -> correct length and shape
4. Character.service.buildCharacterWithEquipment: given character and equipment -> returns DTO with pockets placeholder when pockets missing

Implementation notes

- Tests should use dependency injection / module mocks to replace DB/repository functions. Keep domain tests pure and in-memory.
- For service tests, stub Prisma client methods and assert they are called with expected args and order. Use transaction mocking to simulate commit/rollback.
- For controller tests, use a small request-mocking helper that supplies req/res objects or use supertest against an express app instance with the relevant routes mounted. Mock authentication by stubbing the passport/session to produce a test user.

File layout suggestion

- server/src/modules/equipment/tests/equipment.service.test.ts
- server/src/modules/equipment/tests/equipment.domain.test.ts
- server/src/modules/inventory/tests/inventory.service.test.ts
- server/src/modules/character/tests/character.domain.test.ts

Next steps (what I'll do after this file)

1. Implement the top-priority equipment service tests (happy path + replace + item-not-owned + rollback) in `server/src/modules/equipment/tests/` using Vitest and repository mocks.
2. Run the test suite and iterate on failures.

Notes about environment

- Vitest is configured as the test runner in `server/package.json`.
- Some modules open sockets during import; ensure tests mock those modules when needed.
