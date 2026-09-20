import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldRegexRuleDto {
  @ApiProperty({ description: 'JavaScript regex source (no delimiters)', example: '^[0-9]{10}$' })
  pattern: string;

  @ApiPropertyOptional({ description: 'Custom error message when the value does not match this pattern', example: 'Must be a 10-digit number' })
  regexErrMsg?: string;
}
