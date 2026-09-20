import { Inject, Injectable } from '@nestjs/common';
import { IUserRolePort } from '../../domain/ports/user-role.port';
import { IUserRoleRepository } from '../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../domain/repositories/user-role-group.repository';

@Injectable()
export class UserRoleAdapter implements IUserRolePort {
  constructor(
    @Inject(IUserRoleRepository)      private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
  ) {}

  async findIdPSubsByRole(roleName: string): Promise<string[]> {
    const [directSubs, groupSubs] = await Promise.all([
      this.userRoleRepo.findIdPSubsByRoleKey(roleName),
      this.userRoleGroupRepo.findIdPSubsByRoleKey(roleName),
    ]);
    const seen = new Set<string>([...directSubs, ...groupSubs]);
    return [...seen];
  }
}
