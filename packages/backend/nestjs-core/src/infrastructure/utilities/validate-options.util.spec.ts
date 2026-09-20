import { z } from 'zod';
import { validateModuleOptions } from '@ssdev-toolkit/nestjs-core';

const TestSchema = z.object({
  name: z.string().min(1, 'name is required'),
  port: z.number().positive('port must be positive'),
  url: z.string().url('url must be valid').optional(),
});

describe('validateModuleOptions', () => {
  it('returns validated data when options are valid', () => {
    const result = validateModuleOptions('TestModule', TestSchema, {
      name: 'my-service',
      port: 3000,
    });
    expect(result.name).toBe('my-service');
    expect(result.port).toBe(3000);
  });

  it('applies Zod defaults to the returned object', () => {
    const SchemaWithDefault = z.object({
      retries: z.number().optional().default(3),
    });
    const result = validateModuleOptions('TestModule', SchemaWithDefault, {});
    expect(result.retries).toBe(3);
  });

  it('throws a descriptive error when required field is missing', () => {
    expect(() =>
      validateModuleOptions('DatabaseModule', TestSchema, { port: 5432 }),
    ).toThrow('[DatabaseModule] Config validation failed:');
  });

  it('includes the field name in the error message', () => {
    expect(() =>
      validateModuleOptions('DatabaseModule', TestSchema, { port: 5432 }),
    ).toThrow('name');
  });

  it('throws when a URL field is invalid', () => {
    expect(() =>
      validateModuleOptions('TestModule', TestSchema, {
        name: 'svc',
        port: 3000,
        url: 'not-a-url',
      }),
    ).toThrow('url must be valid');
  });

  it('throws when a number field is out of range', () => {
    expect(() =>
      validateModuleOptions('TestModule', TestSchema, { name: 'svc', port: -1 }),
    ).toThrow('port must be positive');
  });

  it('accumulates multiple errors in a single throw', () => {
    let message = '';
    try {
      validateModuleOptions('TestModule', TestSchema, {});
    } catch (e: any) {
      message = e.message;
    }
    expect(message).toContain('name');
    expect(message).toContain('port');
  });

  it('formats error with the module name prefix', () => {
    expect(() =>
      validateModuleOptions('MyCustomModule', TestSchema, {}),
    ).toThrow('[MyCustomModule] Config validation failed:');
  });
});
