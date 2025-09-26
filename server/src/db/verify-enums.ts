import fs from 'fs';
import path from 'path';

type SharedEnums = Record<string, string[]>;
type PrismaEnums = Record<string, string[]>;

let cachedSharedEnums: SharedEnums | null = null;
let cachedPrismaEnums: PrismaEnums | null = null;

function resolveSharedEnumsPath(): string {
  const candidates = [
    path.resolve(__dirname, '../../../shared/types/enums.ts'),
    path.resolve(process.cwd(), '../shared/types/enums.ts'),
    path.resolve(process.cwd(), 'shared/types/enums.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('Unable to locate shared/types/enums.ts');
}

function loadSharedEnums(): SharedEnums {
  if (cachedSharedEnums) return cachedSharedEnums;

  const enumsPath = resolveSharedEnumsPath();
  const fileContents = fs.readFileSync(enumsPath, 'utf8');
  const constRegex = /export const (\w+) = \[(.*?)\] as const;/gs;

  const enums: SharedEnums = {};
  let match: RegExpExecArray | null;

  while ((match = constRegex.exec(fileContents))) {
    const [, name, rawValues] = match;
    const values = rawValues
      .split(',')
      .map((value) => value.replace(/['"`\s]/g, ''))
      .filter(Boolean);
    enums[name] = values;
  }

  cachedSharedEnums = enums;
  return enums;
}

function resolvePrismaSchemaPath(): string {
  const candidates = [
    path.resolve(__dirname, '../../prisma/schema.prisma'),
    path.resolve(process.cwd(), 'prisma/schema.prisma'),
    path.resolve(process.cwd(), 'server/prisma/schema.prisma'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('Unable to locate prisma/schema.prisma');
}

function sanitizePrismaEnumLine(line: string): string {
  return line.replace(/#.*/g, '').replace(/\/\/.*$/g, '').trim();
}

function loadPrismaEnums(): PrismaEnums {
  if (cachedPrismaEnums) return cachedPrismaEnums;

  const schemaPath = resolvePrismaSchemaPath();
  const schemaContents = fs.readFileSync(schemaPath, 'utf8');
  const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;

  const enums: PrismaEnums = {};
  let match: RegExpExecArray | null;

  while ((match = enumRegex.exec(schemaContents))) {
    const [, name, body] = match;
    const values = body
      .split('\n')
      .map(sanitizePrismaEnumLine)
      .filter(Boolean);

    if (values.length > 0) {
      enums[name] = values;
    }
  }

  cachedPrismaEnums = enums;
  return enums;
}

function normalize(values: readonly string[]): string[] {
  return [...values].sort();
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const [sortedA, sortedB] = [normalize(a), normalize(b)];
  return sortedA.every((value, index) => value === sortedB[index]);
}

function canonicalize(name: string): string {
  const cleaned = name.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
  return cleaned.endsWith('s') ? cleaned.slice(0, -1) : cleaned;
}

function buildSharedLookup(sharedEnums: SharedEnums): Map<string, { name: string; values: string[] }[]> {
  const lookup = new Map<string, { name: string; values: string[] }[]>();

  Object.entries(sharedEnums).forEach(([name, values]) => {
    const key = canonicalize(name);
    const bucket = lookup.get(key) ?? [];
    bucket.push({ name, values });
    lookup.set(key, bucket);
  });

  return lookup;
}

function describeMismatch(
  expected: readonly string[],
  actual: readonly string[],
): string {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missingFromActual = expected.filter((value) => !actualSet.has(value));
  const unexpectedInActual = actual.filter((value) => !expectedSet.has(value));

  const parts: string[] = [];
  if (missingFromActual.length > 0) {
    parts.push(`missing in Prisma: ${missingFromActual.join(', ')}`);
  }
  if (unexpectedInActual.length > 0) {
    parts.push(`missing in shared: ${unexpectedInActual.join(', ')}`);
  }

  return parts.join(' | ');
}

export function verifyEnums(): void {
  const sharedEnums = loadSharedEnums();
  const prismaEnums = loadPrismaEnums();
  const sharedLookup = buildSharedLookup(sharedEnums);

  Object.entries(prismaEnums).forEach(([prismaName, prismaValues]) => {
    const canonical = canonicalize(prismaName);
    const matches = sharedLookup.get(canonical) ?? [];

    if (matches.length === 0) {
      throw new Error(`Shared enums do not define values for Prisma enum ${prismaName}`);
    }

    if (matches.length > 1) {
      const sharedNames = matches.map((match) => match.name).join(', ');
      throw new Error(
        `Multiple shared enum definitions match Prisma enum ${prismaName}: ${sharedNames}. ` +
          'Please rename the shared enums to be unique.',
      );
    }

    const [{ name: sharedName, values: sharedValues }] = matches;

    if (!sameSet(prismaValues, sharedValues)) {
      const mismatch = describeMismatch(sharedValues, prismaValues);
      throw new Error(
        `${prismaName} mismatch between shared enums (${sharedName}) and Prisma schema (${mismatch})`,
      );
    }
  });
}

export default verifyEnums;
