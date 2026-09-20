import { ServiceStatus } from '../enums/service-status.enum';
import { ServiceIdentity } from './service-identity.vo';

/**
 * Immutable answer to "is this process alive?".
 *
 * Liveness deliberately probes nothing external — a failing dependency must not
 * cause the orchestrator to restart an otherwise healthy process.
 */
export class LivenessReport {
  readonly status: ServiceStatus;
  readonly identity: ServiceIdentity;
  readonly checkedAt: Date;

  private constructor(status: ServiceStatus, identity: ServiceIdentity, checkedAt: Date) {
    this.status = status;
    this.identity = identity;
    this.checkedAt = new Date(checkedAt.getTime());
  }

  static alive(identity: ServiceIdentity, checkedAt: Date): LivenessReport {
    return new LivenessReport(ServiceStatus.OK, identity, checkedAt);
  }

  equals(other: LivenessReport): boolean {
    return (
      this.status === other.status &&
      this.identity.equals(other.identity) &&
      this.checkedAt.getTime() === other.checkedAt.getTime()
    );
  }
}
