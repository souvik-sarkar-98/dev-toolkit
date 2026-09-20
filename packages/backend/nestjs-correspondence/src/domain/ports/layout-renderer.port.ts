import { EmailLayoutData } from './template.port';

/**
 * Renders structured email content into a named base `.hbs` layout,
 * producing the final HTML body.
 */
export interface ILayoutRendererPort {
  render(layoutName: string, data: EmailLayoutData): string;
}

export const ILayoutRendererPort = Symbol('ILayoutRendererPort');
