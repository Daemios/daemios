import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorldLocationTypes } from '../types/enums';

// Utility to extract i18n keys from en.json
function getI18nKeys(i18nPath: string, section: string): string[] {
  const json = JSON.parse(fs.readFileSync(i18nPath, 'utf8'));
  return Object.keys(json[section] || {});
}

describe('i18n locationType keys have 1:1 parity with WorldLocationTypes', () => {
  const i18nPath = path.resolve(__dirname, '../../client/src/i18n/en.json');
  const i18nKeys = getI18nKeys(i18nPath, 'locationType');

  it('All WorldLocationTypes have a translation', () => {
    expect(i18nKeys.sort()).toEqual([...WorldLocationTypes].sort());
  });

  it('No extra i18n keys exist', () => {
    expect([...WorldLocationTypes].sort()).toEqual(i18nKeys.sort());
  });
});
