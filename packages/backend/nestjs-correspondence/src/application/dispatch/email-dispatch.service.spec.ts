/**
 * EmailDispatchService unit tests.
 * Covers: raw htmlTemplate path, structured htmlTemplateData -> layout path,
 * placeholder resolution, and the missing-template error.
 */
import { EmailDispatchService } from '@ssdev-toolkit/nestjs-correspondence/application/dispatch/email-dispatch.service';
import { ITemplatePort, EmailTemplateData } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/template.port';
import { ILayoutRendererPort } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/layout-renderer.port';
import { IEmailSenderPort, EmailMessage } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/email-sender.port';
import { TemplateNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';

function buildService(template: EmailTemplateData | null) {
  const sent: EmailMessage[] = [];
  const templatePort: ITemplatePort = {
    findByKey: jest.fn().mockResolvedValue(template),
  };
  const emailSender: IEmailSenderPort = {
    send: jest.fn(async (m: EmailMessage) => {
      sent.push(m);
    }),
  };
  const layoutRenderer: ILayoutRendererPort = {
    render: jest.fn((layoutName: string, data: any) =>
      `[${layoutName}] ${JSON.stringify(data)}`,
    ),
  };
  const service = new EmailDispatchService(templatePort, emailSender, layoutRenderer);
  return { service, sent, templatePort, emailSender, layoutRenderer };
}

describe('EmailDispatchService', () => {
  it('compiles a raw htmlTemplate directly', async () => {
    const { service, sent, layoutRenderer } = buildService({
      subject: 'Hi {{name}}',
      htmlTemplate: '<p>Hello {{name}}</p>',
    });

    await service.sendFromTemplate({
      templateKey: 'GREETING',
      templateData: { name: 'Sam' },
      to: ['sam@example.com'],
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].html).toBe('<p>Hello Sam</p>');
    expect(sent[0].subject).toBe('Hi Sam');
    expect(layoutRenderer.render).not.toHaveBeenCalled();
  });

  it('renders structured htmlTemplateData into the configured layout with placeholders resolved', async () => {
    const { service, sent, layoutRenderer } = buildService({
      subject: 'Welcome {{name}}',
      layout: 'email',
      htmlTemplateData: {
        body: {
          header: { heading: 'Welcome {{name}}' },
          content: { paragraph1_blue: 'Your id is {{id}}' },
        },
      },
    });

    await service.sendFromTemplate({
      templateKey: 'WELCOME',
      templateData: { name: 'Sam', id: 'u-1' },
      to: ['sam@example.com'],
    });

    expect(layoutRenderer.render).toHaveBeenCalledTimes(1);
    const [layoutName, data] = (layoutRenderer.render as jest.Mock).mock.calls[0];
    expect(layoutName).toBe('email');
    expect(data.body.header.heading).toBe('Welcome Sam');
    expect(data.body.content.paragraph1_blue).toBe('Your id is u-1');
    expect(sent[0].subject).toBe('Welcome Sam');
  });

  it('defaults to the "email" layout when layout is omitted', async () => {
    const { service, layoutRenderer } = buildService({
      subject: 'Hi',
      htmlTemplateData: { body: { header: { heading: 'Hi' }, content: {} } },
    });

    await service.sendFromTemplate({ templateKey: 'K', to: ['x@example.com'] });

    expect((layoutRenderer.render as jest.Mock).mock.calls[0][0]).toBe('email');
  });

  it('throws when the template key is not found', async () => {
    const { service } = buildService(null);

    await expect(
      service.sendFromTemplate({ templateKey: 'MISSING', to: ['x@example.com'] }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
  });
});
