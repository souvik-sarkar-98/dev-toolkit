import { OAuthAccount } from '../../domain/aggregates/oauth-account/oauth-account.aggregate';
import { OAuthToken } from '../../domain/aggregates/oauth-token/oauth-token.aggregate';
import { OAuthAccountDto, OAuthTokenDto } from '../dto/oauth-token.dto';

export class OAuthTokenMapper {
  static toAccountDto(account: OAuthAccount): OAuthAccountDto {
    return {
      id: account.id,
      provider: account.provider,
      email: account.email,
      externalId: account.externalId,
      name: account.name,
      givenName: account.givenName,
      familyName: account.familyName,
      pictureUrl: account.pictureUrl,
      locale: account.locale,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  static toTokenDto(token: OAuthToken): OAuthTokenDto {
    return {
      id: token.id,
      accountId: token.accountId,
      clientId: token.clientId,
      provider: token.provider,
      email: token.email,
      account: token.account
        ? {
            id: token.account.id,
            provider: token.provider,
            email: token.account.email,
            externalId: token.account.externalId,
            name: token.account.name,
            givenName: token.account.givenName,
            familyName: token.account.familyName,
            pictureUrl: token.account.pictureUrl,
            locale: token.account.locale,
            createdAt: token.createdAt,
            updatedAt: token.updatedAt,
          }
        : undefined,
      expiresAt: token.expiresAt,
      scope: token.scope?.scopes as string[] | undefined,
      tokenType: token.tokenType,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
}
