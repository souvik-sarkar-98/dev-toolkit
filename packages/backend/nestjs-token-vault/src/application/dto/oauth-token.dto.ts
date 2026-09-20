import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OAuthAccountDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'google' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 'asha.verma@example.org' })
  @IsString()
  email: string;

  @ApiProperty({ required: false, example: '104729183746501928374' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ required: false, example: 'Asha Verma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: 'Asha' })
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiProperty({ required: false, example: 'Verma' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiProperty({ required: false, example: 'https://lh3.googleusercontent.com/a/asha-verma=s96-c' })
  @IsOptional()
  @IsString()
  pictureUrl?: string;

  @ApiProperty({ required: false, example: 'en-IN' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;
}

export class OAuthTokenDto {
  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  @IsString()
  id: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: '918273645102-nabarun.apps.googleusercontent.com' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'google' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 'asha.verma@example.org' })
  @IsString()
  email: string;

  @ApiProperty({ required: false, type: () => OAuthAccountDto })
  @IsOptional()
  account?: OAuthAccountDto;

  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @ApiProperty({
    required: false,
    isArray: true,
    type: String,
    example: ['https://www.googleapis.com/auth/gmail.send'],
  })
  @IsOptional()
  scope?: string[];

  @ApiProperty({ required: false, example: 'Bearer' })
  @IsOptional()
  @IsString()
  tokenType?: string;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;
}

export class AuthUrlResponseDto {
  @ApiProperty({
    description: 'OAuth authorization URL to redirect the user to.',
    example:
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=redacted&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&state=redacted-state-token',
  })
  url: string;

  @ApiProperty({
    description: 'Server-generated CSRF state token. Include in the callback redirect.',
    example: 'redacted-state-token',
  })
  state: string;
}

export class AuthCallbackDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @ApiProperty({
    description: 'OAuth authorization code returned by the provider.',
    minLength: 10,
    maxLength: 500,
    example: 'redacted-authorization-code',
  })
  code: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  @ApiProperty({
    description: 'State parameter for CSRF protection.',
    minLength: 10,
    maxLength: 200,
    example: 'redacted-state-token',
  })
  state: string;
}
