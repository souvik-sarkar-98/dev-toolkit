import { Inject, Injectable, Optional } from '@nestjs/common';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ILayoutRendererPort } from '../../domain/ports/layout-renderer.port';
import { EmailLayoutData } from '../../domain/ports/template.port';
import { TemplateNotFoundError } from '../../domain/errors/correspondence.errors';
import { CORRESPONDENCE_OPTIONS } from '../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../correspondence.schema';
import { ResolvedEmailTheme, resolveEmailTheme } from '../../email-theme';

/**
 * Loads and compiles base `.hbs` layout templates co-located with this adapter
 * (copied into `dist/infrastructure/templates` at build time). Compiled
 * templates are cached per layout name. Styling comes from the host app's
 * `email.theme` options and is exposed to layouts as `@root.theme`.
 */
@Injectable()
export class HandlebarsLayoutRendererAdapter implements ILayoutRendererPort {
  private static helpersRegistered = false;
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly theme: ResolvedEmailTheme;

  constructor(
    @Optional()
    @Inject(CORRESPONDENCE_OPTIONS)
    options?: CorrespondenceModuleOptions,
  ) {
    HandlebarsLayoutRendererAdapter.registerHelpers();
    this.theme = resolveEmailTheme(options?.email?.theme);
  }

  render(layoutName: string, data: EmailLayoutData): string {
    return this.getCompiled(layoutName)({ ...data, theme: this.theme });
  }

  private getCompiled(layoutName: string): Handlebars.TemplateDelegate {
    const cached = this.cache.get(layoutName);
    if (cached) {
      return cached;
    }
    const filePath = path.join(__dirname, `${layoutName}.hbs`);
    if (!fs.existsSync(filePath)) {
      throw new TemplateNotFoundError(`${layoutName} (base layout)`);
    }
    const source = fs.readFileSync(filePath, 'utf-8');
    const compiled = Handlebars.compile(source);
    this.cache.set(layoutName, compiled);
    return compiled;
  }

  private static registerHelpers(): void {
    if (HandlebarsLayoutRendererAdapter.helpersRegistered) {
      return;
    }
    // email.hbs uses `{{#if (or a b)}}` — provide a minimal boolean `or` helper.
    Handlebars.registerHelper('or', (...args: unknown[]) => {
      // Last argument is the Handlebars options object.
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });
    HandlebarsLayoutRendererAdapter.helpersRegistered = true;
  }
}
