import { Inject, Injectable, Optional } from '@nestjs/common';
import Handlebars from 'handlebars';
import { ITemplatePort, EmailLayoutData } from '../../domain/ports/template.port';
import { ILayoutRendererPort } from '../../domain/ports/layout-renderer.port';
import { IEmailSenderPort, EmailMessage } from '../../domain/ports/email-sender.port';
import { TemplateNotFoundError } from '../../domain/errors/correspondence.errors';

/** Input to {@link EmailDispatchService.sendFromTemplate}. */
export interface EmailDispatchInput {
  templateKey: string;
  templateData?: Record<string, any>;
  subject?: string;
  to: string[];
  cc?: string[];
  attachments?: EmailMessage['attachments'];
}

const DEFAULT_LAYOUT = 'email';

/**
 * Email composition + delivery step of the dispatch engine. Given a template key
 * and data it resolves the template ({@link ITemplatePort}), compiles a raw
 * Handlebars body or renders structured content into a base `.hbs` layout
 * ({@link ILayoutRendererPort}), fills the subject and placeholders, then sends
 * the final message via {@link IEmailSenderPort}. Invoked by the async queue
 * worker (`CorrespondenceDispatchHandler`); never sends synchronously on request.
 */
@Injectable()
export class EmailDispatchService {
  constructor(
    @Optional() @Inject(ITemplatePort)
    private readonly templatePort: ITemplatePort,
    @Inject(IEmailSenderPort)
    private readonly emailSender: IEmailSenderPort,
    @Inject(ILayoutRendererPort)
    private readonly layoutRenderer: ILayoutRendererPort,
  ) {}

  async sendFromTemplate(input: EmailDispatchInput): Promise<void> {
    const template = await this.templatePort.findByKey(input.templateKey);
    if (!template) {
      throw new TemplateNotFoundError(input.templateKey);
    }

    const data = { ...(template.defaultData ?? {}), ...(input.templateData ?? {}) };

    let compiledHtml: string;
    if (template.htmlTemplate) {
      compiledHtml = Handlebars.compile(template.htmlTemplate)(data);
    } else if (template.htmlTemplateData) {
      const filled = this.renderStructured(template.htmlTemplateData, data);
      compiledHtml = this.layoutRenderer.render(template.layout ?? DEFAULT_LAYOUT, filled);
    } else {
      throw new TemplateNotFoundError(input.templateKey);
    }

    const compiledText = template.textTemplate
      ? Handlebars.compile(template.textTemplate)(data)
      : undefined;

    const message: EmailMessage = {
      to: input.to,
      cc: input.cc,
      subject: input.subject ?? Handlebars.compile(template.subject)(data),
      html: compiledHtml,
      text: compiledText,
      attachments: input.attachments,
    };

    await this.emailSender.send(message);
  }

  /**
   * Resolves `{{placeholders}}` embedded in the structured layout content by
   * compiling its JSON representation with Handlebars, then parsing back.
   */
  private renderStructured(
    layoutData: EmailLayoutData,
    data: Record<string, any>,
  ): EmailLayoutData {
    const rendered = Handlebars.compile(JSON.stringify(layoutData))(data);
    return JSON.parse(rendered) as EmailLayoutData;
  }
}
