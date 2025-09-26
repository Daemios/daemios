export class DomainError extends Error {
	constructor(public code: string, message?: string) {
		super(message ?? code);
		this.name = 'DomainError';
	}
}

export type NewLocationInput = {
	name: string;
	description?: string | null;
	coordinates?: string | null;
	adventureId: number;
	// optional world/grid fields that callers may provide
	chunkX?: number | null;
	chunkY?: number | null;
	hexQ?: number | null;
	hexR?: number | null;
};

// Create a new location entity (pure, no I/O). Enforces small invariants.
export function newLocation(i: Partial<NewLocationInput>): NewLocationInput {
	const name = (i.name ?? '').trim();
	if (!name) throw new DomainError('NAME_REQUIRED', 'Location name is required');

	const adventureId = Number(i.adventureId ?? NaN);
	if (!Number.isInteger(adventureId) || adventureId <= 0) throw new DomainError('INVALID_ADVENTURE', 'adventureId must be a positive integer');

	return {
		name,
		description: i.description ?? null,
		coordinates: i.coordinates ?? null,
		adventureId,
		chunkX: i.chunkX ?? null,
		chunkY: i.chunkY ?? null,
		hexQ: i.hexQ ?? null,
		hexR: i.hexR ?? null,
	};
}

export function newLocationOfType(type: string, i: Partial<NewLocationInput>) {
	if (typeof type !== 'string' || !type.trim()) throw new DomainError('INVALID_TYPE', 'type is required');
	const base = newLocation(i);
	return { ...base, type: type.trim() } as any;
}

// Assert that a DB record matches an expected type. Throws DomainError on mismatch.
export function assertTypeMatches(record: any, expectedType: string) {
	if (!record) return;
	if (record.type !== expectedType) throw new DomainError('TYPE_MISMATCH', `Expected type ${expectedType}`);
	return record;
}

