import { describe, expect, it } from 'vitest';
import { createI18n, missingKeys } from '../../engine/i18n';
import { locales as blank } from '../../templates/blank/content/locales';

const loc = { ru: { hi: 'Привет, {name}', only: 'ru' }, en: { hi: 'Hi, {name}' } };

describe('i18n', () => {
  it('uses platform language and interpolates', () => {
    expect(createI18n(loc, 'ru')('hi', { name: 'Аня' })).toBe('Привет, Аня');
    expect(createI18n(loc, 'en')('hi', { name: 'Ann' })).toBe('Hi, Ann');
  });
  it('falls back: CIS langs → ru, others → en', () => {
    expect(createI18n(loc, 'uk').lang).toBe('ru');
    expect(createI18n(loc, 'tr').lang).toBe('en');
  });
  it('falls back to another locale, then to the key', () => {
    expect(createI18n(loc, 'en')('only')).toBe('ru');
    expect(createI18n(loc, 'en')('nope')).toBe('nope');
  });
  it('finds missing keys', () => {
    expect(missingKeys(loc)).toEqual({ en: ['only'] });
  });
  it('template locales are complete', () => {
    expect(missingKeys(blank)).toEqual({});
  });
});
