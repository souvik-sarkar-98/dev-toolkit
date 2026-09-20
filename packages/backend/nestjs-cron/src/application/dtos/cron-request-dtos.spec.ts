/**
 * Cron2 request DTO validation unit tests.
 * Uses class-validator's validate() directly — no NestJS runtime needed.
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateCronJobRequestDto,
  UpdateCronJobRequestDto,
} from '@ssdev-toolkit/nestjs-cron/application/dtos/cron-request.dtos';

// ── Helper ────────────────────────────────────────────────────────────────────
async function hasErrors(dto: object): Promise<boolean> {
  const errors = await validate(dto);
  return errors.length > 0;
}

// ── CreateCronJobRequestDto ───────────────────────────────────────────────────
describe('CreateCronJobRequestDto', () => {
  function make(overrides: Partial<CreateCronJobRequestDto> = {}): CreateCronJobRequestDto {
    return plainToInstance(CreateCronJobRequestDto, {
      name: 'send-digest',
      description: 'Sends the daily digest',
      expression: '0 10 * * *',
      handler: 'SendDigestJob',
      enabled: true,
      ...overrides,
    });
  }

  it('passes validation for a fully valid payload', async () => {
    expect(await hasErrors(make())).toBe(false);
  });

  it('fails when name is missing', async () => {
    const dto = make({ name: undefined as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when name is an empty string', async () => {
    const dto = make({ name: '' });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when description is missing', async () => {
    const dto = make({ description: undefined as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when expression is missing', async () => {
    const dto = make({ expression: undefined as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when expression is an empty string', async () => {
    const dto = make({ expression: '' });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when handler is missing', async () => {
    const dto = make({ handler: undefined as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('fails when handler is an empty string', async () => {
    const dto = make({ handler: '' });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('passes when enabled is omitted (optional)', async () => {
    const dto = make({ enabled: undefined });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('fails when enabled is not a boolean', async () => {
    const dto = make({ enabled: 'yes' as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('passes when inputData is omitted (optional)', async () => {
    const dto = make({ inputData: undefined });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('fails when inputData is not an object', async () => {
    const dto = make({ inputData: 'not-an-object' as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('passes when inputData is a valid plain object', async () => {
    const dto = make({ inputData: { region: 'eu', batchSize: 100 } });
    expect(await hasErrors(dto)).toBe(false);
  });
});

// ── UpdateCronJobRequestDto ───────────────────────────────────────────────────
describe('UpdateCronJobRequestDto', () => {
  function make(overrides: Partial<UpdateCronJobRequestDto> = {}): UpdateCronJobRequestDto {
    return plainToInstance(UpdateCronJobRequestDto, overrides);
  }

  it('passes validation for an empty payload (all fields are optional)', async () => {
    expect(await hasErrors(make())).toBe(false);
  });

  it('passes when only description is provided', async () => {
    const dto = make({ description: 'New description' });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('passes when only expression is provided', async () => {
    const dto = make({ expression: '*/15 * * * *' });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('passes when only enabled is provided', async () => {
    const dto = make({ enabled: false });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('passes when expression is an empty string (IsOptional — only @IsString is enforced)', async () => {
    // UpdateCronJobRequestDto has @IsOptional() + @IsString() but NOT @IsNotEmpty(),
    // so an empty string is accepted (field is treated as present-but-empty, which is a valid string).
    const dto = make({ expression: '' });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('fails when enabled is not a boolean', async () => {
    const dto = make({ enabled: 'false' as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('passes when handler is an empty string (IsOptional — only @IsString is enforced)', async () => {
    // Same reasoning as expression above: no @IsNotEmpty() on the optional handler field.
    const dto = make({ handler: '' });
    expect(await hasErrors(dto)).toBe(false);
  });

  it('fails when inputData is not an object', async () => {
    const dto = make({ inputData: 42 as any });
    expect(await hasErrors(dto)).toBe(true);
  });

  it('passes with a complete valid patch payload', async () => {
    const dto = make({
      description: 'Updated',
      expression: '0 8 * * *',
      handler: 'AnotherJob',
      enabled: false,
      inputData: { key: 'val' },
    });
    expect(await hasErrors(dto)).toBe(false);
  });
});
