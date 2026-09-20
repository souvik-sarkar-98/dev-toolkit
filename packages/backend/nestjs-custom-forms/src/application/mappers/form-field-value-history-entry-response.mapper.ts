import { FormFieldValueHistoryEntry } from '../../domain/entities/form-field-value-history-entry/form-field-value-history-entry.entity';
import { FormFieldValueHistoryEntryResponseDto } from '../dtos/response/form-response.dtos';

export class FormFieldValueHistoryEntryResponseMapper {
  static toDto(
    entry: FormFieldValueHistoryEntry,
    fieldKey: string,
  ): FormFieldValueHistoryEntryResponseDto {
    const dto = new FormFieldValueHistoryEntryResponseDto();
    dto.id         = entry.id;
    dto.fieldDefId = entry.fieldDefId;
    dto.fieldKey   = fieldKey;
    dto.formId     = entry.formId;
    dto.entityType = entry.entityType;
    dto.entityId   = entry.entityId;
    dto.oldValue   = entry.oldValue;
    dto.newValue   = entry.newValue;
    dto.changedBy  = entry.changedBy;
    dto.changedAt  = entry.createdAt;
    return dto;
  }
}
