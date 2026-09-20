import { Inject, Injectable } from '@nestjs/common';
import { EncryptedToken } from '../../domain/value-objects/encrypted-token.vo';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../token-vault-options';

/**
 * Infrastructure service that builds `EncryptedToken` value objects.
 *
 * Command handlers inject this service to encrypt plaintext tokens before
 * passing them to aggregates. This keeps the encryption secret isolated from
 * the domain layer — the aggregate stores `EncryptedToken` VOs but never
 * knows or needs the secret.
 *
 * All operations are async because the underlying AES-256-GCM implementation
 * uses scrypt for key derivation.
 */
@Injectable()
export class AesTokenEncryptor {
  constructor(
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
  ) {}

  private get secret(): string {
    const secret = this.options.encryption?.secret;
    if (!secret) {
      throw new Error(
        '[TokenVaultModule] encryption.secret is not configured. ' +
          'Set encryption.secret (min 32 chars) in TokenVaultModule.forRoot() / forRootAsync().',
      );
    }
    return secret;
  }

  async encrypt(plaintext: string): Promise<EncryptedToken> {
    return EncryptedToken.fromPlaintext(plaintext, this.secret);
  }

  async decrypt(token: EncryptedToken): Promise<string> {
    return token.decrypt(this.secret);
  }
}
