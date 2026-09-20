import Handlebars from 'handlebars';
import helpers from 'handlebars-helpers';
import { DateTime } from 'luxon';

/**
 * Registers all built-in Handlebars helpers on the global Handlebars instance.
 * Called once from CoreModule.onModuleInit() — no DI service required.
 */
export function registerHandlebarsHelpers(): void {
  helpers({ handlebars: Handlebars });

  // ── Comparison ─────────────────────────────────────────────────────────────
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
  Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
  Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);
  Handlebars.registerHelper('and', (...args: unknown[]) => {
    const values = args.slice(0, -1);
    return values.every(Boolean);
  });
  Handlebars.registerHelper('or', (...args: unknown[]) => {
    const values = args.slice(0, -1);
    return values.some(Boolean);
  });
  Handlebars.registerHelper('not', (a: unknown) => !a);

  // ── Date / Time ────────────────────────────────────────────────────────────
  Handlebars.registerHelper('formatDate', (date: unknown, format: string) => {
    if (!date) return '';
    return DateTime.fromISO(date.toString()).toFormat(format);
  });
  Handlebars.registerHelper(
    'formatDateTime',
    (date: unknown, format = 'dd MMM yyyy, hh:mm a') => {
      if (!date) return '';
      return DateTime.fromISO(date.toString()).toFormat(format);
    },
  );
  Handlebars.registerHelper('timeAgo', (date: unknown) => {
    if (!date) return '';
    return DateTime.fromISO(date.toString()).toRelative() ?? '';
  });
  Handlebars.registerHelper('now', (format = 'dd MMM yyyy') =>
    DateTime.now().toFormat(format),
  );

  // ── String ─────────────────────────────────────────────────────────────────
  Handlebars.registerHelper('capitalize', (str: unknown) => {
    if (!str) return '';
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  });
  Handlebars.registerHelper('uppercase', (str: unknown) =>
    str ? String(str).toUpperCase() : '',
  );
  Handlebars.registerHelper('lowercase', (str: unknown) =>
    str ? String(str).toLowerCase() : '',
  );
  Handlebars.registerHelper(
    'truncate',
    (str: unknown, length: number, suffix = '…') => {
      if (!str) return '';
      const s = String(str);
      return s.length > length ? s.slice(0, length) + suffix : s;
    },
  );
  Handlebars.registerHelper(
    'replace',
    (str: unknown, search: string, replacement: string) => {
      if (!str) return '';
      return String(str).split(search).join(replacement);
    },
  );
  Handlebars.registerHelper(
    'default',
    (value: unknown, fallback: unknown) => value ?? fallback,
  );

  // ── Number / Currency ──────────────────────────────────────────────────────
  Handlebars.registerHelper(
    'currency',
    (amount: unknown, locale = 'en-IN', currencyCode = 'INR') => {
      const num = Number(amount);
      if (isNaN(num)) return amount;
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).format(num);
    },
  );
  Handlebars.registerHelper('round', (num: unknown, decimals = 2) => {
    const n = Number(num);
    if (isNaN(n)) return num;
    return +n.toFixed(decimals);
  });
  Handlebars.registerHelper('add', (a: number, b: number) => a + b);
  Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
  Handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
  Handlebars.registerHelper('divide', (a: number, b: number) =>
    b !== 0 ? a / b : 0,
  );

  // ── Array ──────────────────────────────────────────────────────────────────
  Handlebars.registerHelper('length', (arr: unknown) =>
    Array.isArray(arr) ? arr.length : 0,
  );
  Handlebars.registerHelper('first', (arr: unknown[]) =>
    Array.isArray(arr) ? arr[0] : undefined,
  );
  Handlebars.registerHelper('last', (arr: unknown[]) =>
    Array.isArray(arr) ? arr[arr.length - 1] : undefined,
  );
  Handlebars.registerHelper(
    'join',
    (arr: unknown[], separator = ', ') =>
      Array.isArray(arr) ? arr.join(separator) : '',
  );
  Handlebars.registerHelper(
    'includes',
    (arr: unknown[], value: unknown) =>
      Array.isArray(arr) && arr.includes(value),
  );

  // ── Misc ───────────────────────────────────────────────────────────────────
  Handlebars.registerHelper('json', (value: unknown) =>
    JSON.stringify(value, null, 2),
  );
  Handlebars.registerHelper(
    'times',
    (n: number, options: Handlebars.HelperOptions) => {
      let result = '';
      for (let i = 0; i < n; i++) result += options.fn(i);
      return result;
    },
  );
}
