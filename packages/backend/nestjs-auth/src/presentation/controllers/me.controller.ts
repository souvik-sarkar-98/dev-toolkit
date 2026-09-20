import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAutoResponse } from '@ssdev-toolkit/nestjs-core';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthUser } from '../../application/models/auth-user';
import { CurrentUserResponseDto } from '../../application/dtos/response/auth-response.dtos';
import { mapAuthUserToResponse } from '../../application/mappers/current-user-response.mapper';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — Me')
@Controller('auth/me')
export class MeController {
  @Get()
  @ApiOperation({ summary: 'Get current user profile and permissions' })
  @ApiAutoResponse(CurrentUserResponseDto, {
    description: 'Current user profile and permissions',
  })
  getMe(@CurrentUser() user: AuthUser): CurrentUserResponseDto {
    return mapAuthUserToResponse(user);
  }
}
