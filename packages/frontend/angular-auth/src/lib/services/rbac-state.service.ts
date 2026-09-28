import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  RbacSession,
  type RbacLoadState,
  type RbacUserAccessSnapshot,
} from '@ssdev-toolkit/auth-core';

export type { RbacLoadState };

@Injectable({ providedIn: 'root' })
export class RbacStateService<T extends RbacUserAccessSnapshot = RbacUserAccessSnapshot> {
  readonly session = new RbacSession<T>();
  private readonly snapshotSubject = new BehaviorSubject<T | null>(null);
  private readonly loadedSubject = new BehaviorSubject<boolean>(false);
  private readonly loadStateSubject = new BehaviorSubject<RbacLoadState>('idle');

  readonly snapshot$: Observable<T | null> = this.snapshotSubject.asObservable();
  readonly loaded$ = this.loadedSubject.asObservable();
  readonly loadState$ = this.loadStateSubject.asObservable();

  get snapshot(): T | null {
    return this.session.snapshot;
  }

  get loaded(): boolean {
    return this.session.loaded;
  }

  get loadState(): RbacLoadState {
    return this.session.loadState;
  }

  get idpSub(): string | undefined {
    return this.session.snapshot && 'idpSub' in this.session.snapshot
      ? (this.session.snapshot as T).idpSub
      : undefined;
  }

  beginLoad(): void {
    this.session.beginLoad();
    this.sync();
  }

  setSnapshot(snapshot: T): void {
    this.session.setSnapshot(snapshot);
    this.sync();
  }

  markFailed(): void {
    this.session.markFailed();
    this.sync();
  }

  clear(): void {
    this.session.clear();
    this.sync();
  }

  private sync(): void {
    this.snapshotSubject.next(this.session.snapshot);
    this.loadedSubject.next(this.session.loaded);
    this.loadStateSubject.next(this.session.loadState);
  }
}
