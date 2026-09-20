import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { Page } from '@ssdev-toolkit/nestjs-core';
import { ListAccountsQuery } from './list-accounts.query';
import { IOAuthAccountRepository } from '../../../domain/repositories/oauth-account.repository';
import type { IOAuthAccountRepository as IAccountRepo } from '../../../domain/repositories/oauth-account.repository';
import { OAuthAccountDto } from '../../dto/oauth-token.dto';
import { OAuthTokenMapper } from '../../mappers/oauth-token.mapper';

@QueryHandler(ListAccountsQuery)
@Injectable()
export class ListAccountsHandler implements IQueryHandler<ListAccountsQuery, Page<OAuthAccountDto>> {
  constructor(
    @Inject(IOAuthAccountRepository) private readonly accountRepo: IAccountRepo,
  ) { }

  async execute(query: ListAccountsQuery): Promise<Page<OAuthAccountDto>> {
    const { provider, pageIndex = 0, pageSize = 20 } = query.params;

    const result = await this.accountRepo.findPaged({
      pageIndex,
      pageSize,
      props: { provider },
    });

    return new Page(
      result.content.map(OAuthTokenMapper.toAccountDto),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }
}
