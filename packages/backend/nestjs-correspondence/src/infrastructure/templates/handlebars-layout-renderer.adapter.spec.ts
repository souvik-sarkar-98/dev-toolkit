/**
 * HandlebarsLayoutRendererAdapter unit tests.
 * Loads the real email.hbs base layout co-located in src and verifies that
 * the `or` helper, structured content placeholders and host-supplied theme
 * tokens render correctly.
 */
import { HandlebarsLayoutRendererAdapter } from '@ssdev-toolkit/nestjs-correspondence/infrastructure/templates/handlebars-layout-renderer.adapter';
import { EmailLayoutData } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/template.port';
import { TemplateNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';
import { DEFAULT_EMAIL_THEME } from '@ssdev-toolkit/nestjs-correspondence/email-theme';
import type { CorrespondenceModuleOptions } from '@ssdev-toolkit/nestjs-correspondence/correspondence.schema';

describe('HandlebarsLayoutRendererAdapter', () => {
  const adapter = new HandlebarsLayoutRendererAdapter();

  const data: EmailLayoutData = {
    body: {
      header: { heading: 'Welcome Sam', subHeading: 'Your account is ready' },
      content: {
        salutation: 'Hi Sam,',
        paragraph1_blue: 'Your id is u-1',
      },
    },
  };

  it('renders the email base layout with header and content (uses the "or" helper)', () => {
    const html = adapter.render('email', data);

    expect(html).toContain('Welcome Sam');
    expect(html).toContain('Your account is ready');
    expect(html).toContain('Hi Sam,');
    expect(html).toContain('Your id is u-1');
    expect(html.toLowerCase()).toContain('<html');
  });

  it('throws when the base layout does not exist', () => {
    expect(() =>
      adapter.render('does-not-exist', { body: { header: { heading: 'x' }, content: {} } }),
    ).toThrow(TemplateNotFoundError);
  });

  it('applies the default theme when the host supplies none', () => {
    const html = adapter.render('email', data);

    expect(html).toContain(DEFAULT_EMAIL_THEME.headerBackground);
    expect(html).toContain(DEFAULT_EMAIL_THEME.pageBackground);
    expect(html).toContain(DEFAULT_EMAIL_THEME.fontFamily);
    // No logo configured by default — the header renders text only.
    expect(html).not.toContain('<img');
    expect(html).not.toContain('https://');
    expect(html).not.toContain('rel="stylesheet"');
  });

  it('applies host theme overrides and keeps defaults for unset tokens', () => {
    const options = {
      environment: 'test',
      email: {
        enableProdMode: false,
        enableMocking: false,
        theme: {
          headerBackground: '#123456',
          logoUrl: 'cid:email-logo',
          logoAlt: 'Example',
        },
      },
    } as CorrespondenceModuleOptions;

    const html = new HandlebarsLayoutRendererAdapter(options).render('email', data);

    expect(html).toContain('#123456');
    expect(html).not.toContain(DEFAULT_EMAIL_THEME.headerBackground);
    expect(html).toContain('src="cid:email-logo"');
    expect(html).toContain('alt="Example"');
    expect(html).toContain(DEFAULT_EMAIL_THEME.footerPanelFallbackColor);
  });

  it('strips remote font and logo URLs so the layout fetches no external assets', () => {
    const options = {
      environment: 'test',
      email: {
        enableProdMode: false,
        enableMocking: false,
        theme: {
          fontUrl: 'https://fonts.googleapis.com/css2?family=Inter',
          logoUrl: 'https://cdn.example.org/logo.png',
        },
      },
    } as CorrespondenceModuleOptions;

    const html = new HandlebarsLayoutRendererAdapter(options).render('email', data);

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('cdn.example.org');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('rel="stylesheet"');
  });

  it('renders theme values unescaped so CSS and font stacks stay valid', () => {
    const html = adapter.render('email', data);

    expect(html).not.toContain('&#x27;');
    expect(html).toContain("'Segoe UI'");
  });
});
