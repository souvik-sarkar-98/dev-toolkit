import { ApiProperty } from '@nestjs/swagger';

export class FormValidationResultResponseDto {
  @ApiProperty({ example: false })
  valid: boolean;

  @ApiProperty({ type: [String], example: ['emergency_contact'] })
  missingMandatory: string[];

  @ApiProperty({ type: [String], example: ['emergency_contact requires country to equal india'] })
  conditionViolations: string[];

  @ApiProperty({ type: [String], example: ['emergency_contact: Must be a 10-digit number'] })
  validationViolations: string[];
}
