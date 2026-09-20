import { DynamicModule, Inject, Injectable, Module, Optional, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { DiscoveryModule } from '@nestjs/core';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  ICACHE_PORT,
  IUserLookupPort,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';

import { AuthModuleOptions } from './auth-options';
import { AuthOptionsSchema } from './auth.schema';
import { AUTH_OPTIONS } from './infrastructure/auth-options.token';

import { IApiKeyRepository } from './domain/repositories/api-key.repository';
import { IRoleRepository } from './domain/repositories/role.repository';
import { IPermissionRepository } from './domain/repositories/permission.repository';
import { IRoleGroupRepository } from './domain/repositories/role-group.repository';
import { IUserRoleRepository } from './domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from './domain/repositories/user-role-group.repository';
import { IUserPermissionRepository } from './domain/repositories/user-permission.repository';

import { IJwtVerifierPort } from './application/ports/jwt-verifier.port';
import { IApiKeyVerifierPort } from './application/ports/api-key-verifier.port';
import { IRecaptchaPort } from './application/ports/recaptcha.port';
import { IUserAccessPort } from './application/ports/user-access.port';

import { JwtVerifierAdapter } from './infrastructure/adapters/jwt-verifier.adapter';
import { ApiKeyVerifierAdapter } from './infrastructure/adapters/api-key-verifier.adapter';
import { RecaptchaAdapter } from './infrastructure/adapters/recaptcha.adapter';
import { UserAccessAdapter } from './infrastructure/adapters/user-access.adapter';
import { UserRoleAdapter } from './infrastructure/adapters/user-role.adapter';

import { IUserRolePort } from './domain/ports/user-role.port';
import { AuthFacade } from './application/services/auth.facade';

import { GenerateApiKeyHandler } from './application/commands/generate-api-key/generate-api-key.handler';
import { MarkApiKeyUsedHandler } from './application/commands/mark-api-key-used/mark-api-key-used.handler';
import { RevokeApiKeyHandler } from './application/commands/revoke-api-key/revoke-api-key.handler';
import { UpdateApiKeyPermissionsHandler } from './application/commands/update-api-key-permissions/update-api-key-permissions.handler';
import { GrantUserRoleHandler } from './application/commands/grant-user-role/grant-user-role.handler';
import { RevokeUserRoleHandler } from './application/commands/revoke-user-role/revoke-user-role.handler';
import { GrantUserPermissionHandler } from './application/commands/grant-user-permission/grant-user-permission.handler';
import { RevokeUserPermissionHandler } from './application/commands/revoke-user-permission/revoke-user-permission.handler';
import { AddUserToGroupHandler } from './application/commands/add-user-to-group/add-user-to-group.handler';
import { RemoveUserFromGroupHandler } from './application/commands/remove-user-from-group/remove-user-from-group.handler';
import { CreatePermissionHandler } from './application/commands/create-permission/create-permission.handler';
import { UpdatePermissionHandler } from './application/commands/update-permission/update-permission.handler';
import { DeletePermissionHandler } from './application/commands/delete-permission/delete-permission.handler';
import { CreateRoleHandler } from './application/commands/create-role/create-role.handler';
import { UpdateRoleHandler } from './application/commands/update-role/update-role.handler';
import { DeleteRoleHandler } from './application/commands/delete-role/delete-role.handler';
import { SyncRolePermissionsHandler } from './application/commands/sync-role-permissions/sync-role-permissions.handler';
import { CreateRoleGroupHandler } from './application/commands/create-role-group/create-role-group.handler';
import { UpdateRoleGroupHandler } from './application/commands/update-role-group/update-role-group.handler';
import { DeleteRoleGroupHandler } from './application/commands/delete-role-group/delete-role-group.handler';
import { SyncRoleGroupRolesHandler } from './application/commands/sync-role-group-roles/sync-role-group-roles.handler';

import { ListApiKeysHandler } from './application/queries/list-api-keys/list-api-keys.handler';
import { ListApiScopesHandler } from './application/queries/list-api-scopes/list-api-scopes.handler';
import { ListRolesHandler } from './application/queries/list-roles/list-roles.handler';
import { GetRoleHandler } from './application/queries/get-role/get-role.handler';
import { ListPermissionsHandler } from './application/queries/list-permissions/list-permissions.handler';
import { GetPermissionHandler } from './application/queries/get-permission/get-permission.handler';
import { ListRoleGroupsHandler } from './application/queries/list-role-groups/list-role-groups.handler';
import { GetRoleGroupHandler } from './application/queries/get-role-group/get-role-group.handler';
import { ListUserRolesHandler } from './application/queries/list-user-roles/list-user-roles.handler';
import { ListUserGroupsHandler } from './application/queries/list-user-groups/list-user-groups.handler';
import { ListUserPermissionsHandler } from './application/queries/list-user-permissions/list-user-permissions.handler';
import { ResolveUserAccessHandler } from './application/queries/resolve-user-access/resolve-user-access.handler';

import { OnApiKeyUsedHandler } from './application/handlers/events/on-api-key-used/on-api-key-used.handler';
import { OnApiKeyRevokedHandler } from './application/handlers/events/on-api-key-revoked/on-api-key-revoked.handler';
import { OnApiKeyPermissionsUpdatedHandler } from './application/handlers/events/on-api-key-permissions-updated/on-api-key-permissions-updated.handler';
import { OnUserRoleGrantedHandler } from './application/handlers/events/on-user-role-granted/on-user-role-granted.handler';
import { OnUserRoleRevokedHandler } from './application/handlers/events/on-user-role-revoked/on-user-role-revoked.handler';
import { OnUserPermissionGrantedHandler } from './application/handlers/events/on-user-permission-granted/on-user-permission-granted.handler';
import { OnUserPermissionRevokedHandler } from './application/handlers/events/on-user-permission-revoked/on-user-permission-revoked.handler';
import { OnUserRoleGroupGrantedHandler } from './application/handlers/events/on-user-role-group-granted/on-user-role-group-granted.handler';
import { OnUserRoleGroupRevokedHandler } from './application/handlers/events/on-user-role-group-revoked/on-user-role-group-revoked.handler';

import { UnifiedAuthGuard } from './presentation/guards/unified-auth.guard';
import { AppThrottlerGuard } from './presentation/guards/app-throttler.guard';
import { resolveThrottlers } from './presentation/utilities/resolve-throttlers.util';
import { PermissionsGuard } from './presentation/guards/permissions.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { RoleGroupsGuard } from './presentation/guards/role-groups.guard';
import { ScopedPermissionsGuard } from './presentation/guards/scoped-permissions.guard';

import { ApiKeyController } from './presentation/controllers/api-key.controller';
import { MeController } from './presentation/controllers/me.controller';
import { RolesController } from './presentation/controllers/roles.controller';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { RoleGroupsController } from './presentation/controllers/role-groups.controller';
import { UserRolesController } from './presentation/controllers/user-access.controller';

export interface AuthModuleAsyncOptions
  extends DynamicModuleAsyncOptions<AuthModuleOptions> { }

const COMMAND_HANDLERS = [
  GenerateApiKeyHandler,
  MarkApiKeyUsedHandler,
  RevokeApiKeyHandler,
  UpdateApiKeyPermissionsHandler,
  GrantUserRoleHandler,
  RevokeUserRoleHandler,
  GrantUserPermissionHandler,
  RevokeUserPermissionHandler,
  AddUserToGroupHandler,
  RemoveUserFromGroupHandler,
  CreatePermissionHandler,
  UpdatePermissionHandler,
  DeletePermissionHandler,
  CreateRoleHandler,
  UpdateRoleHandler,
  DeleteRoleHandler,
  SyncRolePermissionsHandler,
  CreateRoleGroupHandler,
  UpdateRoleGroupHandler,
  DeleteRoleGroupHandler,
  SyncRoleGroupRolesHandler,
];

const QUERY_HANDLERS = [
  ListApiKeysHandler,
  ListApiScopesHandler,
  ListRolesHandler,
  GetRoleHandler,
  ListPermissionsHandler,
  GetPermissionHandler,
  ListUserRolesHandler,
  ListUserGroupsHandler,
  ListUserPermissionsHandler,
  ResolveUserAccessHandler,
  ListRoleGroupsHandler,
  GetRoleGroupHandler,
];

const EVENT_HANDLERS = [
  OnApiKeyUsedHandler,
  OnApiKeyRevokedHandler,
  OnApiKeyPermissionsUpdatedHandler,
  OnUserRoleGrantedHandler,
  OnUserRoleRevokedHandler,
  OnUserPermissionGrantedHandler,
  OnUserPermissionRevokedHandler,
  OnUserRoleGroupGrantedHandler,
  OnUserRoleGroupRevokedHandler,
];

const AUTH_MODULE_VALIDATOR = Symbol('AuthModule.internalValidator');

const USER_LOOKUP_PORT_MISSING_MSG =
  '[AuthModule] IUserLookupPort is not provided. ' +
  'JWT auth will not resolve app profile UUID (userId) or display data on AuthUser.userInfo. ' +
  'Role expansion via AuthFacade.getUsersByRole() will return []. ' +
  'Fix: register IUserLookupPort in UserModule and import UserModule before AuthModule.';

@Injectable()
class AuthModuleValidator extends BaseModuleValidator {
  constructor(
    moduleRef: ModuleRef,
    @Optional() @Inject(IUserLookupPort) private readonly userLookup: IUserLookupPort | null,
  ) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'AuthModule';
  }

  protected validateModule(): void {
    this.requirePort(
      IApiKeyRepository,
      'Register IApiKeyRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IRoleRepository,
      'Register IRoleRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IPermissionRepository,
      'Register IPermissionRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IRoleGroupRepository,
      'Register IRoleGroupRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IUserRoleRepository,
      'Register IUserRoleRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IUserRoleGroupRepository,
      'Register IUserRoleGroupRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      IUserPermissionRepository,
      'Register IUserPermissionRepository in PersistenceModule and import PersistenceModule before AuthModule.',
    );
    this.requirePort(
      ICACHE_PORT,
      'Register { provide: ICACHE_PORT, useExisting: CacheService } in IntegrationsModule. Requires DatabaseModule.',
    );

    if (!this.userLookup) {
      this.warn(USER_LOOKUP_PORT_MISSING_MSG);
    }
  }
}

@Module({})
export class AuthModule extends BaseDynamicModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const validated = AuthOptionsSchema.parse(options);
    return AuthModule._build(
      [AuthModule.createOptionsProvider(AUTH_OPTIONS, AuthOptionsSchema, validated)],
      [],
      resolveThrottlers(validated.throttler),
      validated,
    );
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    return AuthModule._build(
      [
        AuthModule.createAsyncOptionsProvider(
          AUTH_OPTIONS,
          AuthOptionsSchema,
          options,
        ),
      ],
      options.imports,
    );
  }

  private static buildThrottlerModuleOptions(
    authOptions: AuthModuleOptions,
    throttlers: ReturnType<typeof resolveThrottlers>,
  ) {
    const storageRedisUrl = authOptions.throttler?.storageRedisUrl;

    return {
      throttlers,
      ...(storageRedisUrl
        ? { storage: new ThrottlerStorageRedisService(storageRedisUrl) }
        : {}),
    };
  }

  private static _build(
    optionsProviders: Provider[],
    extraImports: any[] = [],
    syncThrottlers?: ReturnType<typeof resolveThrottlers>,
    syncAuthOptions?: AuthModuleOptions,
  ): DynamicModule {
    const throttlerImport = syncThrottlers
      ? ThrottlerModule.forRoot(
        AuthModule.buildThrottlerModuleOptions(
          syncAuthOptions ?? ({} as AuthModuleOptions),
          syncThrottlers,
        ),
      )
      : ThrottlerModule.forRootAsync({
        inject: [AUTH_OPTIONS],
        useFactory: (authOptions: AuthModuleOptions) =>
          AuthModule.buildThrottlerModuleOptions(
            authOptions,
            resolveThrottlers(authOptions.throttler),
          ),
      });

    return {
      module: AuthModule,
      global: true,
      imports: [
        ...extraImports,
        throttlerImport,
        CqrsModule,
        HttpModule,
        DiscoveryModule,
      ],
      controllers: [
        ApiKeyController,
        MeController,
        RolesController,
        PermissionsController,
        RoleGroupsController,
        UserRolesController,
      ],
      providers: [
        ...optionsProviders,
        registerModuleValidator(AUTH_MODULE_VALIDATOR, AuthModuleValidator),

        { provide: APP_GUARD, useClass: AppThrottlerGuard },
        { provide: APP_GUARD, useClass: UnifiedAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: RoleGroupsGuard },
        { provide: APP_GUARD, useClass: ScopedPermissionsGuard },

        { provide: IUserAccessPort, useClass: UserAccessAdapter },
        { provide: IJwtVerifierPort, useClass: JwtVerifierAdapter },
        { provide: IApiKeyVerifierPort, useClass: ApiKeyVerifierAdapter },
        { provide: IRecaptchaPort, useClass: RecaptchaAdapter },
        { provide: IUserRolePort, useClass: UserRoleAdapter },
        AuthFacade,

        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        ...EVENT_HANDLERS,
      ],
      exports: [
        AUTH_OPTIONS,
        IJwtVerifierPort,
        IApiKeyVerifierPort,
        IUserAccessPort,
        IRecaptchaPort,
        IUserRolePort,
        AuthFacade,
      ],
    };
  }
}
