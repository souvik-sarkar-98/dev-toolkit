import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RbacUserAccessSnapshot } from '@ssdev-toolkit/auth-core';

export type RbacLoadState = 'idle' | 'loading' | 'loaded' | 'failed' | 'cleared';

@Injectable({ providedIn: 'root' })
export class RbacStateService<T extends RbacUserAccessSnapshot = RbacUserAccessSnapshot> {
  private readonly snapshotSubject = new BehaviorSubject<T | null>(null);
  private readonly loadedSubject = new BehaviorSubject<boolean>(false);
  private readonly loadStateSubject = new BehaviorSubject<RbacLoadState>('idle');

  readonly snapshot$: Observable<T | null> = this.snapshotSubject.asObservable();
  readonly loaded$ = this.loadedSubject.asObservable();
  readonly loadState$ = this.loadStateSubject.asObservable();

  get snapshot(): T | null {
    return this.snapshotSubject.value;
  }

  get loaded(): boolean {
    return this.loadedSubject.value;
  }

  get loadState(): RbacLoadState {
    return this.loadStateSubject.value;
  }

  get idpSub(): string | undefined {
    return this.snapshotSubject.value?.idpSub;
  }

  beginLoad(): void {
    this.loadStateSubject.next('loading');
  }

  setSnapshot(snapshot: T): void {
    this.snapshotSubject.next(snapshot);
    this.loadedSubject.next(true);
    this.loadStateSubject.next('loaded');
  }

  markFailed(): void {
    this.snapshotSubject.next(null);
    this.loadedSubject.next(false);
    this.loadStateSubject.next('failed');
  }

  clear(): void {
    this.snapshotSubject.next(null);
    this.loadedSubject.next(false);
    this.loadStateSubject.next('cleared');
  }
}
