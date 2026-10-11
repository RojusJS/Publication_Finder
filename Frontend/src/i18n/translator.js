import en from "./en";
import lt from "./lt";

export const DICTIONARIES = { en, lt };
export const LOCALES = { en: "en-GB", lt: "lt-LT" };

function lookup(dictionary, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dictionary);
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? String(params[name]) : match));
}

/**
 * ``t(key, params)`` returns the translation (falling back to English, then
 * to the key). ``t.has(key)`` checks existence and ``t.count(key, n)`` picks
 * the right plural form (``key.one`` / ``key.few`` / ``key.other``).
 */
export function createTranslator(lang) {
  const dictionary = DICTIONARIES[lang] || en;
  const pluralRules = new Intl.PluralRules(LOCALES[lang] || LOCALES.en);
  const numberFormat = new Intl.NumberFormat(LOCALES[lang] || LOCALES.en);

  const resolve = (key) => {
    const text = lookup(dictionary, key) ?? lookup(en, key);
    return typeof text === "string" ? text : undefined;
  };

  const t = (key, params) => {
    const text = resolve(key);
    return text === undefined ? key : interpolate(text, params);
  };
  t.has = (key) => resolve(key) !== undefined;
  t.count = (key, count, params) => {
    const candidate = `${key}.${pluralRules.select(count)}`;
    return t(t.has(candidate) ? candidate : `${key}.other`, { ...params, count: numberFormat.format(count) });
  };
  return t;
}
