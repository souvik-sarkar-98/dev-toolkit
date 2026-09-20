import { ApiProperty } from '@nestjs/swagger';

/** Canonical field option shape for OpenAPI (request and response). */
export class FieldOptionDto {
  @ApiProperty({ example: 'west-bengal' })
  key: string;

  @ApiProperty({ example: 'West Bengal' })
  label: string;
}
