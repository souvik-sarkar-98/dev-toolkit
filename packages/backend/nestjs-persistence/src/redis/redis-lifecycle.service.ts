import {
  Inject,
  Injectable,
  Logger,
  Optional,
  OnApplicationShutdown,
} from "@nestjs/common";

export const KEYV_REDIS_CLIENT = "KEYV_REDIS_CLIENT";

interface Disconnectable {
  disconnect: () => Promise<unknown> | unknown;
}

@Injectable()
export class RedisLifecycleService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisLifecycleService.name);

  constructor(
    @Optional()
    @Inject(KEYV_REDIS_CLIENT)
    private readonly keyvRedis?: Disconnectable,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing Redis connections: ${signal ?? "shutdown"}`);

    if (this.keyvRedis) {
      try {
        await this.keyvRedis.disconnect();
        this.logger.debug("KeyvRedis cache connection closed");
      } catch (error) {
        this.logger.warn(
          `KeyvRedis disconnect failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
