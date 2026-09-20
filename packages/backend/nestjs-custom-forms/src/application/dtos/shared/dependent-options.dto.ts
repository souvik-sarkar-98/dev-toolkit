import { ApiProperty } from '@nestjs/swagger';
import { FieldOptionDto } from './field-option.dto';

export class DependentOptionsDto {
  @ApiProperty({ example: 'country' })
  dependsOnKey: string;

  @ApiProperty({
    description: 'parentValue → available FieldOptions',
    example: { india: [{ key: 'west-bengal', label: 'West Bengal' }] },
  })
  optionMap: Record<string, FieldOptionDto[]>;
}
