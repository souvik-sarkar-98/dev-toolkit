import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthUser, CurrentUser, RequirePermissions, UnifiedAuthGuard, requireUserId } from '@ssdev-toolkit/nestjs-auth';
import { ApiAutoResponse, ApiUuidParam } from '@ssdev-toolkit/nestjs-core';
import { CreateFormCommand } from '../../application/commands/create-form/create-form.command';
import { UpdateFormCommand } from '../../application/commands/update-form/update-form.command';
import { PublishFormCommand } from '../../application/commands/publish-form/publish-form.command';
import { DisableFormCommand } from '../../application/commands/disable-form/disable-form.command';
import { ListFormsQuery } from '../../application/queries/list-forms/list-forms.query';
import { GetFormWithFieldsQuery } from '../../application/queries/get-form-with-fields/get-form-with-fields.query';
import { FormResponseDto } from '../../application/dtos/response/form-response.dtos';
import {
  CreateFormDto,
  ListFormsRequestDto,
  UpdateFormDto,
} from '../../application/dtos/request/form-request.dtos';

@ApiTags('Custom Forms')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(UnifiedAuthGuard)
@Controller('custom-forms/forms')
export class FormController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:custom_forms')
  @ApiAutoResponse(FormResponseDto, { status: 201 })
  createForm(
    @Body() dto: CreateFormDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto> {
    return this.commandBus.execute(
      new CreateFormCommand(
        dto.entityType,
        dto.key,
        dto.label,
        dto.description ?? null,
        dto.managePermissions ?? [],
        dto.readPermissions ?? [],
        dto.writePermissions ?? [],
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }

  @Get()
  @RequirePermissions('read:custom_forms')
  @ApiAutoResponse(FormResponseDto, { isArray: true })
  listForms(
    @Query() dto: ListFormsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto[]> {
    return this.queryBus.execute(
      new ListFormsQuery(dto.entityType, dto.status, requireUserId(user), user.permissions ?? []),
    );
  }

  @Get(':formId')
  @RequirePermissions('read:custom_forms')
  @ApiUuidParam('formId', 'Identifier of the form')
  @ApiAutoResponse(FormResponseDto)
  getFormWithFields(
    @Param('formId') formId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto> {
    return this.queryBus.execute(
      new GetFormWithFieldsQuery(formId, user.permissions ?? []),
    );
  }

  @Patch(':formId')
  @RequirePermissions('update:custom_forms')
  @ApiUuidParam('formId', 'Identifier of the form')
  @ApiAutoResponse(FormResponseDto)
  updateForm(
    @Param('formId') formId: string,
    @Body() dto: UpdateFormDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto> {
    return this.commandBus.execute(
      new UpdateFormCommand(
        formId,
        dto.label,
        dto.description,
        dto.managePermissions,
        dto.readPermissions,
        dto.writePermissions,
        requireUserId(user),
        user.permissions ?? [],
      ),
    );
  }

  @Post(':formId/publish')
  @RequirePermissions('update:custom_forms')
  @ApiUuidParam('formId', 'Identifier of the form')
  @ApiAutoResponse(FormResponseDto)
  publishForm(
    @Param('formId') formId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto> {
    return this.commandBus.execute(
      new PublishFormCommand(formId, requireUserId(user), user.permissions ?? []),
    );
  }

  @Post(':formId/disable')
  @RequirePermissions('update:custom_forms')
  @ApiUuidParam('formId', 'Identifier of the form')
  @ApiAutoResponse(FormResponseDto)
  disableForm(
    @Param('formId') formId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FormResponseDto> {
    return this.commandBus.execute(
      new DisableFormCommand(formId, requireUserId(user), user.permissions ?? []),
    );
  }
}
