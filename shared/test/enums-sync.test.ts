import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Utility to extract enums from Prisma schema
function getPrismaEnums(schemaPath: string) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
  const enums: Record<string, string[]> = {};
  let match;
  while ((match = enumRegex.exec(schema))) {
    const name = match[1];
    const values = match[2]
      .split(/\s+/)
      .map(v => v.trim())
      .filter(v => v && !v.startsWith('//'));
    enums[name] = values;
  }
  return enums;
}

// Utility to extract enums from shared/types/enums.ts
function getTsEnums(tsPath: string) {
  const ts = fs.readFileSync(tsPath, 'utf8');
  const constRegex = /export const (\w+) = \[(.*?)\] as const;/gs;
  const enums: Record<string, string[]> = {};
  let match;
  while ((match = constRegex.exec(ts))) {
    const name = match[1];
    const values = match[2]
      .split(',')
      .map(v => v.replace(/['"`]/g, '').trim())
      .filter(v => v);
    enums[name] = values;
  }
  return enums;
}

// Map Prisma enum names to TS enum names (customize if needed)
function mapEnumNames(prismaName: string) {
  if (prismaName.endsWith('Type')) return prismaName + 's';
  return prismaName;
}

describe('Shared TypeScript enums are in sync with Prisma schema enums', () => {
  const prismaEnums = getPrismaEnums(path.resolve(__dirname, '../../server/prisma/schema.prisma'));
  const tsEnums = getTsEnums(path.resolve(__dirname, '../types/enums.ts'));

  for (const [prismaName, prismaValues] of Object.entries(prismaEnums)) {
    const tsName = mapEnumNames(prismaName);
    it(`Prisma enum ${prismaName} matches TS enum ${tsName}`, () => {
      expect(tsEnums).toHaveProperty(tsName);
      expect(tsEnums[tsName]).toEqual(prismaValues);
    });
  }
});
