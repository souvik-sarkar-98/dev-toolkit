import type { Form } from '../aggregates/form/form.aggregate';
import { FormAccessDeniedError, FormDisabledError } from '../errors/form.errors';
import { FormStatus } from '../enums/form-status.enum';

export type FormAccessAction = 'manage' | 'read' | 'write';

/**
 * Form-level permission and enablement checks.
 * Replaces entityType-tier permission checks from the legacy custom-fields module.
 */
export class FormAccessPolicy {
  static assertHasPermission(
    form: Form,
    action: FormAccessAction,
    userPermissions: string[],
  ): void {
    const required =
      action === 'manage'
        ? form.managePermissions
        : action === 'read'
          ? form.readPermissions
          : form.writePermissions;

    if (!required?.length) return;

    const userSet = new Set(userPermissions);
    if (!required.some((p) => userSet.has(p))) {
      throw new FormAccessDeniedError(action, form.id);
    }
  }

  static assertFormNotDisabled(form: Form): void {
    if (form.status === FormStatus.Disabled) {
      throw new FormDisabledError(form.id);
    }
  }
}
