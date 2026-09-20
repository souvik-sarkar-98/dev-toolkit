/** Immutable identity of the service being probed. Equality is by value. */
export class ServiceIdentity {
  readonly name?: string;
  readonly version?: string;

  private constructor(name?: string, version?: string) {
    this.name = name;
    this.version = version;
  }

  static of(name?: string, version?: string): ServiceIdentity {
    return new ServiceIdentity(ServiceIdentity.normalize(name), ServiceIdentity.normalize(version));
  }

  static anonymous(): ServiceIdentity {
    return new ServiceIdentity();
  }

  /** True when neither a name nor a version was configured. */
  get isAnonymous(): boolean {
    return this.name === undefined && this.version === undefined;
  }

  equals(other: ServiceIdentity): boolean {
    return this.name === other.name && this.version === other.version;
  }

  private static normalize(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}
