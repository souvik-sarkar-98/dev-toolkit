import { TokenVaultOptionsSchema } from './token-vault.schema';

export const TOKEN_VAULT_OPTIONS = Symbol('TOKEN_VAULT_OPTIONS');

/**
 * Single source of truth for module options — inferred from the Zod schema
 * so the TypeScript type and runtime validation can never drift apart.
 */
export type TokenVaultModuleOptions = import('zod').infer<typeof TokenVaultOptionsSchema>;
