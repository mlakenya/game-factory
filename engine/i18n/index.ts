export type Dict = Record<string, string>;
export type Locales = { ru: Dict; en: Dict } & Record<string, Dict>;

/**
 * Tiny i18n. Russian is mandatory on Yandex Games; English is the fallback for all other langs.
 * Usage: const t = createI18n(locales, platform.lang); t('menu.play'); t('score', { n: 5 }).
 */
export function createI18n(locales: Locales, lang: string) {
  const primary = locales[lang] ?? (['be', 'kk', 'uk', 'uz'].includes(lang) ? locales.ru : locales.en);
  const t = (key: string, vars: Record<string, string | number> = {}) => {
    const raw = primary[key] ?? locales.en[key] ?? locales.ru[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
  return Object.assign(t, { lang: primary === locales.ru ? 'ru' : primary === locales.en ? 'en' : lang });
}

/** Returns keys missing in any locale compared to the union of all keys. Used by audit and tests. */
export function missingKeys(locales: Locales): Record<string, string[]> {
  const all = new Set(Object.values(locales).flatMap((d) => Object.keys(d)));
  const out: Record<string, string[]> = {};
  for (const [lang, dict] of Object.entries(locales)) {
    const miss = [...all].filter((k) => !(k in dict));
    if (miss.length) out[lang] = miss;
  }
  return out;
}
