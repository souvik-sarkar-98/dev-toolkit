import { Form } from '../../domain/aggregates/form/form.aggregate';
import { FormResponseDto } from '../dtos/response/form-response.dtos';
import { FormFieldDefinitionResponseMapper } from './form-field-definition-response.mapper';

export class FormResponseMapper {
  static toDto(form: Form, options?: { includeFields?: boolean }): FormResponseDto {
    const dto = new FormResponseDto();
    dto.id                = form.id;
    dto.entityType        = form.entityType;
    dto.key               = form.key;
    dto.label             = form.label;
    dto.description       = form.description;
    dto.status            = form.status;
    dto.managePermissions = [...form.managePermissions];
    dto.readPermissions   = [...form.readPermissions];
    dto.writePermissions  = [...form.writePermissions];
    dto.createdAt         = form.createdAt;
    dto.updatedAt         = form.updatedAt ?? null;
    dto.createdBy         = form.createdBy;
    dto.publishedBy       = form.publishedBy;
    dto.disabledBy        = form.disabledBy;

    if (options?.includeFields) {
      dto.fields = [...form.fields]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(FormFieldDefinitionResponseMapper.toDto);
    }

    return dto;
  }
}
