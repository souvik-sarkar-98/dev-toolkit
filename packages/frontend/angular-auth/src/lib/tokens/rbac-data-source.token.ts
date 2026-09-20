import { InjectionToken } from '@angular/core';
import { RbacUserAccessSnapshot } from '@ssdev-toolkit/auth-core';
import { Observable } from 'rxjs';

/**
 * Abstraction over the backend call that loads RBAC state.
 * Each consuming app provides its own implementation (e.g. a generated API client service).
 */
export interface RbacDataSource<T extends RbacUserAccessSnapshot = RbacUserAccessSnapshot> {
  fetchCurrentUserSnapshot(): Observable<T>;
}

export const RBAC_DATA_SOURCE = new InjectionToken<RbacDataSource<RbacUserAccessSnapshot>>(
  'RBAC_DATA_SOURCE',
);
