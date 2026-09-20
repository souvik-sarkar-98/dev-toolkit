import { ApiProperty } from '@nestjs/swagger';

/** Result of exchanging an OAuth authorization code for stored tokens. */
export class OAuthCallbackResultDto {
  @ApiProperty({
    description: 'Email address of the account that was connected',
    example: 'asha.verma@example.org',
  })
  email!: string;

  @ApiProperty({
    description: 'Identifier of the stored token record',
    format: 'uuid',
    example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
  })
  tokenId!: string;
}
