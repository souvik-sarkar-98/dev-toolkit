import { NoOpJsonDocumentPayloadValidator } from './no-op-json-document-payload-validator';

describe('NoOpJsonDocumentPayloadValidator', () => {
  it('allows any payload through', () => {
    const validator = new NoOpJsonDocumentPayloadValidator();

    expect(() =>
      validator.validate('any-namespace', 'any-key', { invalid: true }),
    ).not.toThrow();
  });
});
