import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { Page } from '@ssdev-toolkit/nestjs-core';
import { ListTokensQuery } from './list-tokens.query';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { OAuthTokenDto } from '../../dto/oauth-token.dto';
import { OAuthTokenMapper } from '../../mappers/oauth-token.mapper';
import { OAuthTokenFilter } from '../../../domain/aggregates/oauth-token/oauth-token.aggregate';

@QueryHandler(ListTokensQuery)
@Injectable()
export class ListTokensHandler implements IQueryHandler<ListTokensQuery, Page<OAuthTokenDto>> {
  constructor(
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
  ) { }

  async execute(query: ListTokensQuery): Promise<Page<OAuthTokenDto>> {
    const { provider, account, ownerSub, isAdmin, pageIndex = 0, pageSize = 20 } = query.params;

    const filter: OAuthTokenFilter = {
      ...(provider ? { provider } : {}),
      ...(account ? { account } : {}),
      // Non-admin callers only see their own tokens — never another user's credentials.
      ...(!isAdmin ? { ownerSub: ownerSub ?? '__no_such_owner__' } : {}),
    };

    const result = await this.tokenRepo.findPaged({
      pageIndex,
      pageSize,
      props: filter,
    });

    return new Page(
      result.content.map(OAuthTokenMapper.toTokenDto),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }
}
