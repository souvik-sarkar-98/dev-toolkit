import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IJwtVerifierPort } from '../../application/ports/jwt-verifier.port';
import { IUserAccessPort } from '../../application/ports/user-access.port';
import { AuthUser } from '../../application/models/auth-user';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';
import { AUTH_OPTIONS } from '../auth-options.token';
import { AuthModuleOptions } from '../../auth-options';

type JwtPayload = Record<string, unknown> & { sub?: string };

type JoseModule = {
  createRemoteJWKSet: (url: URL) => unknown;
  jwtVerify: (
    token: string,
    jwks: unknown,
    options: { issuer: string; audience: string },
  ) => Promise<{ payload: JwtPayload }>;
};

@Injectable()
export class JwtVerifierAdapter implements IJwtVerifierPort, OnModuleInit {
  private jose!: JoseModule;
  private jwks!: unknown;

  constructor(
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
    @Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort,
  ) { }

  async onModuleInit(): Promise<void> {
    this.jose = (await import('jose')) as JoseModule;
    this.jwks = this.jose.createRemoteJWKSet(new URL(this.options.jwt.jwksUri));
  }

  async verify(token: string): Promise<AuthUser> {
    let payload: JwtPayload;
    try {
      const result = await this.jose.jwtVerify(token, this.jwks, {
        issuer: this.options.jwt.issuer,
        audience: this.options.jwt.audience,
      });
      payload = result.payload;
    } catch (err) {
      throw new BusinessError(
        'Invalid or expired JWT token.',
        'INVALID_JWT_TOKEN',
        401,
      );
    }

    const idpSub = payload.sub as string;
    const resolved = await this.userAccess.resolve(idpSub);

    return {
      ...resolved,
      type: 'jwt',
      idpSub,
      email: (payload.email as string | undefined) ?? resolved.userInfo?.email,
      name: (payload.name as string | undefined) ?? resolved.userInfo?.fullName,
      idpClaims: { ...payload },
    };
  }
}
