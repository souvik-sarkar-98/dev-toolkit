import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { ListApiScopesQuery } from './list-api-scopes.query';
import { REQUIRE_PERMISSIONS_KEY, REQUIRE_ALL_PERMISSIONS_KEY } from '../../constants/permission-keys.constants';

@QueryHandler(ListApiScopesQuery)
@Injectable()
export class ListApiScopesHandler implements IQueryHandler<ListApiScopesQuery, string[]> {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  execute(_query: ListApiScopesQuery): Promise<string[]> {
    const scopeSet = new Set<string>();

    const wrappers = this.discovery.getControllers();
    for (const wrapper of wrappers) {
      if (!wrapper.metatype) continue;
      const proto = wrapper.metatype.prototype as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor') continue;
        const handler = proto[key];
        if (typeof handler !== 'function') continue;

        const anyPerms: string[] | undefined = this.reflector.get(
          REQUIRE_PERMISSIONS_KEY,
          handler as () => void,
        );
        if (anyPerms) anyPerms.forEach((p) => scopeSet.add(p));

        const allPerms: string[] | undefined = this.reflector.get(
          REQUIRE_ALL_PERMISSIONS_KEY,
          handler as () => void,
        );
        if (allPerms) allPerms.forEach((p) => scopeSet.add(p));
      }
    }

    return Promise.resolve([...scopeSet].sort());
  }
}
