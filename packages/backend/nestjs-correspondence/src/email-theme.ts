import { z } from 'zod';

/**
 * Visual tokens injected into the base `.hbs` email layout by the consuming app.
 *
 * Values are written into the layout unescaped (they are CSS fragments, font
 * stacks and URLs), so they must come from application configuration and never
 * from end-user input.
 */
export const EmailThemeSchema = z.object({
  // Typography — system fonts only; remote stylesheet URLs are ignored.
  /** Reserved. Remote font URLs are stripped; leave empty. */
  fontUrl: z.string().optional(),
  fontFamily: z.string().optional(),
  headingFontFamily: z.string().optional(),
  baseFontSize: z.string().optional(),

  // Surfaces
  pageBackground: z.string().optional(),
  surfaceBackground: z.string().optional(),
  subtleBackground: z.string().optional(),
  borderColor: z.string().optional(),
  cardRadius: z.string().optional(),
  cardShadow: z.string().optional(),

  // Text
  textColor: z.string().optional(),
  mutedTextColor: z.string().optional(),
  headingColor: z.string().optional(),
  linkColor: z.string().optional(),
  primaryColor: z.string().optional(),

  // Logo — remote http(s) URLs are stripped. Use a cid: attachment or omit.
  /** Non-remote logo src (`cid:...`). Omit or pass '' for a text-only header. */
  logoUrl: z.string().optional(),
  logoAlt: z.string().optional(),
  /** Max logo width in px, without the unit (e.g. '180'). */
  logoWidth: z.string().optional(),

  // Header band
  headerBackground: z.string().optional(),
  /** Solid colour for clients that drop gradients (Outlook `bgcolor`). */
  headerFallbackColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  headerSubTextColor: z.string().optional(),

  // Highlighted callout paragraphs
  highlightBackground: z.string().optional(),
  highlightBorderColor: z.string().optional(),

  // Attention callout paragraph
  noticeBackground: z.string().optional(),
  noticeBorderColor: z.string().optional(),
  noticeTextColor: z.string().optional(),

  // Call to action
  buttonBackground: z.string().optional(),
  buttonFallbackColor: z.string().optional(),
  buttonTextColor: z.string().optional(),
  buttonRadius: z.string().optional(),
  buttonShadow: z.string().optional(),

  // Footer panel (dark band)
  footerPanelBackground: z.string().optional(),
  footerPanelFallbackColor: z.string().optional(),
  footerPanelTextColor: z.string().optional(),
  footerPanelDividerColor: z.string().optional(),

  // Footer note
  footerBackground: z.string().optional(),
  footerTextColor: z.string().optional(),
});

/** Partial theme as supplied by the host app. */
export type EmailThemeOptions = z.infer<typeof EmailThemeSchema>;

/** Theme with every token filled in, as handed to the layout. */
export type ResolvedEmailTheme = Required<EmailThemeOptions>;

/**
 * Neutral organisation defaults, matching the web apps' design tokens
 * (system fonts, brand red/amber, slate neutrals, dark navy footer).
 * No remote fonts or logo URLs — email clients must not fetch external assets.
 */
export const DEFAULT_EMAIL_THEME: ResolvedEmailTheme = {
  fontUrl: '',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headingFontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  baseFontSize: '15px',

  pageBackground: '#f1f5f9',
  surfaceBackground: '#ffffff',
  subtleBackground: '#f8fafc',
  borderColor: '#e2e8f0',
  cardRadius: '16px',
  cardShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',

  textColor: '#334155',
  mutedTextColor: '#64748b',
  headingColor: '#2c3e50',
  linkColor: '#e74c3c',
  primaryColor: '#e74c3c',

  logoUrl: '',
  logoAlt: '',
  logoWidth: '180',

  headerBackground: 'linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)',
  headerFallbackColor: '#e74c3c',
  headerTextColor: '#ffffff',
  headerSubTextColor: 'rgba(255, 255, 255, 0.92)',

  highlightBackground: '#f8fafc',
  highlightBorderColor: '#e74c3c',

  noticeBackground: '#fff7ed',
  noticeBorderColor: '#f97316',
  noticeTextColor: '#9a3412',

  buttonBackground: 'linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)',
  buttonFallbackColor: '#e74c3c',
  buttonTextColor: '#ffffff',
  buttonRadius: '12px',
  buttonShadow: '0 4px 12px rgba(231, 76, 60, 0.28)',

  footerPanelBackground: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
  footerPanelFallbackColor: '#2c3e50',
  footerPanelTextColor: '#ffffff',
  footerPanelDividerColor: 'rgba(255, 255, 255, 0.45)',

  footerBackground: '#f1f5f9',
  footerTextColor: '#64748b',
};

const REMOTE_URL = /^https?:\/\//i;

function withoutRemoteUrl(value: string): string {
  return REMOTE_URL.test(value.trim()) ? '' : value;
}

/** Fills every unset token with its default so the layout never renders `undefined`. */
export function resolveEmailTheme(theme?: EmailThemeOptions | null): ResolvedEmailTheme {
  const merged = theme
    ? {
        ...DEFAULT_EMAIL_THEME,
        ...Object.fromEntries(
          Object.entries(theme).filter(([, value]) => typeof value === 'string'),
        ),
      }
    : { ...DEFAULT_EMAIL_THEME };

  merged.fontUrl = withoutRemoteUrl(merged.fontUrl);
  merged.logoUrl = withoutRemoteUrl(merged.logoUrl);
  return merged;
}
