import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthUser, CurrentUser, RequirePermissions, UnifiedAuthGuard, requireUserId } from '@ssdev-toolkit/nestjs-auth';
import {
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  ApiUuidParam,
} from '@ssdev-toolkit/nestjs-core';
import { SaveFormDraftCommand } from '../../application/commands/save-form-draft/save-form-draft.command';
import { SubmitFormCommand } from '../../application/commands/submit-form/submit-form.command';
import { ClearFormSubmissionCommand } from '../../application/commands/clear-form-submission/clear-form-submission.command';
import { GetFormSubmissionQuery } from '../../application/queries/get-form-submission/get-form-submission.query';
import { GetFormSubmissionHistoryQuery } from '../../application/queries/get-form-submission-history/get-form-submission-history.query';
import {
  FormSubmissionHistoryQueryDto,
  FormSubmissionQueryDto,
  SaveFormDraftDto,
  SubmitFormDto,
} from '../../application/dtos/request/form-submission-request.dtos';
import {
  FormFieldValueHistoryEntryResponseDto,
  ResolvedFormFieldValueResponseDto,
} from '../../application/dtos/response/form-response.dtos';


@ApiTags('Custom Forms — Submissions')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(UnifiedAuthGuard)
@Controller('custom-forms/submissions')
export class FormSubmissionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post('draft')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('create:form_submissions')
  @ApiQuery({
    name: 'formId',
    type: String,
    format: 'uuid',
    example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
    description: 'Identifier of the form being drafted',
  })
  @ApiAutoResponse(ResolvedFormFieldValueResponseDto, { isArray: true })
  saveDraft(
    @Query('formId') formId: string,
    @Body() dto: SaveFormDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ResolvedFormFieldValueResponseDto[]> {
    return this.commandBus.execute(
      new SaveFormDraftCommand(
        formId,
        dto.entityType,
        dto.entityId,
        dto.values,
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('create:form_submissions')
  @ApiQuery({
    name: 'formId',
    type: String,
    format: 'uuid',
    example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
    description: 'Identifier of the form being submitted',
  })
  @ApiAutoVoidResponse()
  submitForm(
    @Query('formId') formId: string,
    @Body() dto: SubmitFormDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.commandBus.execute(
      new SubmitFormCommand(
        formId,
        dto.entityType,
        dto.entityId,
        dto.values,
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }

  @Get()
  @RequirePermissions('read:form_submissions')
  @ApiAutoResponse(ResolvedFormFieldValueResponseDto, { isArray: true })
  getSubmission(
    @Query() dto: FormSubmissionQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ResolvedFormFieldValueResponseDto[]> {
    return this.queryBus.execute(
      new GetFormSubmissionQuery(
        dto.formId,
        dto.entityType,
        dto.entityId,
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }

  @Get('history')
  @RequirePermissions('read:form_submissions')
  @ApiAutoResponse(FormFieldValueHistoryEntryResponseDto, { isArray: true })
  getHistory(
    @Query() dto: FormSubmissionHistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormFieldValueHistoryEntryResponseDto[]> {
    return this.queryBus.execute(
      new GetFormSubmissionHistoryQuery(
        dto.formId,
        dto.entityType,
        dto.entityId,
        requireUserId(user),
        user.permissions ?? [],
        dto.fieldKey,
      ),
    );
  }

  @Delete(':entityType/:entityId/:formId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete:form_submissions')
  @ApiKeyParam('entityType', 'PROJECT', 'Type of the entity the submission belongs to')
  @ApiUuidParam('entityId', 'Identifier of the entity the submission belongs to')
  @ApiUuidParam('formId', 'Identifier of the form')
  @ApiAutoVoidResponse({ status: 204 })
  clearSubmission(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.commandBus.execute(
      new ClearFormSubmissionCommand(
        formId,
        entityType,
        entityId,
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }
}
