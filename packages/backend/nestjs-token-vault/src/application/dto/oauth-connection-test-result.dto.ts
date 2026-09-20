import { ApiProperty } from '@nestjs/swagger';

/** Result of probing a stored OAuth connection — never includes raw tokens. */
export class OAuthConnectionTestResultDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  tokenId: string;

  @ApiProperty({ example: 'google' })
  provider: string;

  @ApiProperty({ example: 'asha.verma@example.org' })
  email: string;

  @ApiProperty({
    description: 'True when the vault refreshed the access token during this probe.',
    example: false,
  })
  refreshed: boolean;

  @ApiProperty({
    required: false,
    example: '2026-03-14T09:30:00.000Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Account display name returned by the provider profile probe, when available.',
    required: false,
    example: 'Asha Verma',
  })
  accountName?: string;

  @ApiProperty({
    description: 'Human-readable summary of the probe outcome.',
    example: 'Connection is valid.',
  })
  message: string;
}
