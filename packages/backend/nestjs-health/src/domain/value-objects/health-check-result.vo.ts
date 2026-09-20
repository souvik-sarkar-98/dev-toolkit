import { HealthStatus } from '../enums/health-status.enum';
import { InvalidHealthIndicatorError } from '../errors/health.errors';

export interface HealthCheckResultProps {
  name: string;
  critical: boolean;
  durationMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

/** Immutable outcome of running one health indicator. Equality is by value. */
export class HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly critical: boolean;
  readonly durationMs: number;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;

  private constructor(status: HealthStatus, props: HealthCheckResultProps) {
    if (!props.name?.trim()) {
      throw new InvalidHealthIndicatorError('name must be a non-empty string');
    }
    this.name = props.name.trim();
    this.status = status;
    this.critical = props.critical;
    this.durationMs = Math.max(0, Math.round(props.durationMs));
    this.message = props.message;
    this.details = props.details ? Object.freeze({ ...props.details }) : undefined;
  }

  static up(props: HealthCheckResultProps): HealthCheckResult {
    return new HealthCheckResult(HealthStatus.UP, props);
  }

  static down(props: HealthCheckResultProps): HealthCheckResult {
    return new HealthCheckResult(HealthStatus.DOWN, props);
  }

  get isUp(): boolean {
    return this.status === HealthStatus.UP;
  }

  /** A failure that must block traffic — i.e. a critical dependency is down. */
  get isBlocking(): boolean {
    return this.critical && !this.isUp;
  }

  equals(other: HealthCheckResult): boolean {
    return (
      this.name === other.name &&
      this.status === other.status &&
      this.critical === other.critical &&
      this.durationMs === other.durationMs &&
      this.message === other.message
    );
  }
}
