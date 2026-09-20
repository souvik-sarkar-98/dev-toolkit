import {
  Directive,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { RbacEntityContext } from '@ssdev-toolkit/auth-core';
import { AuthorizationService } from '../services/authorization.service';

/**
 * Structural directive — shows content only when the user has the required permission(s).
 *
 * @example
 * <div *hasPermission="'read:users'">...</div>
 * <div *hasPermission="['update:project']; context: projectCtx; requireAll: true">...</div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnChanges, OnInit, OnDestroy {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authorization = inject(AuthorizationService);
  private snapshotSubscription?: Subscription;

  @Input() hasPermission!: string | string[];
  @Input() hasPermissionContext?: RbacEntityContext;
  @Input() hasPermissionRequireAll = false;

  ngOnInit(): void {
    this.snapshotSubscription = this.authorization.snapshot$.subscribe(() => {
      this.updateView();
    });
  }

  ngOnChanges(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    this.snapshotSubscription?.unsubscribe();
  }

  private updateView(): void {
    const permissions = Array.isArray(this.hasPermission)
      ? this.hasPermission
      : [this.hasPermission];

    if (!permissions.length || !permissions[0]) {
      this.viewContainer.clear();
      return;
    }

    const check = (p: string) =>
      this.hasPermissionContext
        ? this.authorization.effectivePermissions(this.hasPermissionContext).includes(p)
        : this.authorization.effectivePermissions().includes(p);

    const visible = this.hasPermissionRequireAll
      ? permissions.every(check)
      : permissions.some(check);

    if (visible) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}
