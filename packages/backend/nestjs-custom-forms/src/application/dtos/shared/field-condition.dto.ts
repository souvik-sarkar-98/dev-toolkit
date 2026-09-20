import { ApiProperty } from '@nestjs/swagger';

export class FieldConditionDto {
  @ApiProperty({ example: 'country' })
  dependsOnKey: string;

  @ApiProperty({ enum: ['equals', 'not_equals', 'in', 'not_in'], example: 'equals' })
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';

  @ApiProperty({ type: Object, example: 'india' })
  value: string | number | boolean | string[];
}
