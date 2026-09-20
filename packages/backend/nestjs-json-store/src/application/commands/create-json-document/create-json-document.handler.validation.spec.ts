import 'reflect-metadata';
import { z } from 'zod';
import { CreateJsonDocumentHandler } from './create-json-document.handler';
import { CreateJsonDocumentCommand } from './create-json-document.command';
import { JsonDocumentInvalidError } from '../../../domain/errors/json-store.errors';
import { IJsonDocumentPayloadValidatorPort } from '../../../domain/ports/json-document-payload-validator.port';

const correspondenceSchema = z.object({
  subject: z.string().min(1),
  htmlTemplate: z.string().min(1),
});

class TestCorrespondenceValidator implements IJsonDocumentPayloadValidatorPort {
  validate(namespace: string, _key: string, payload: Record<string, unknown>): void {
    if (namespace !== 'correspondence') return;

    const result = correspondenceSchema.safeParse(payload);
    if (!result.success) {
      throw new JsonDocumentInvalidError(
        `Payload validation failed: ${result.error.issues.map((i) => i.message).join('; ')}`,
      );
    }
  }
}

const makeRepo = () => ({
  findById: jest.fn(),
  findByKey: jest.fn().mockResolvedValue(null),
  findByNamespace: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

describe('CreateJsonDocumentHandler payload validation', () => {
  it('throws JsonDocumentInvalidError for invalid correspondence payload', async () => {
    const handler = new CreateJsonDocumentHandler(
      makeRepo() as any,
      new TestCorrespondenceValidator(),
      { publishAll: jest.fn() } as any,
    );

    await expect(
      handler.execute(
        new CreateJsonDocumentCommand({
          key: 'welcome-email',
          namespace: 'correspondence',
          payload: { subject: 'Hello' },
        }),
      ),
    ).rejects.toThrow(JsonDocumentInvalidError);
  });

  it('allows unknown namespaces without schema enforcement', async () => {
    const repo = makeRepo();
    const handler = new CreateJsonDocumentHandler(
      repo as any,
      new TestCorrespondenceValidator(),
      { publishAll: jest.fn() } as any,
    );

    const result = await handler.execute(
      new CreateJsonDocumentCommand({
        key: 'feature-flags',
        namespace: 'config',
        payload: { anything: true },
      }),
    );

    expect(result.namespace).toBe('config');
    expect(repo.create).toHaveBeenCalled();
  });
});
