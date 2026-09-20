import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenameDocumentRequestDto {
  @ApiProperty({
    description: 'Replacement file name, including the extension',
    example: 'vendor-invoice-2026-0117.pdf',
  })
  @IsNotEmpty()
  @IsString()
  newName: string;
}
