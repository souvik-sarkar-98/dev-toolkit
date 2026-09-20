import { ApiProperty } from '@nestjs/swagger';
import { FieldRegexRuleDto } from './field-regex-rule.dto';

export class FieldValidationRulesDto {
  @ApiProperty({
    type: [FieldRegexRuleDto],
    description: 'All patterns must match (AND)',
  })
  patterns: FieldRegexRuleDto[];
}
