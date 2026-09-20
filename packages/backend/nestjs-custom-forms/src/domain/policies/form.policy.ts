import type { Form } from '../aggregates/form/form.aggregate';
import { FormDisabledError, FormNotPublishedError } from '../errors/form.errors';
import { FormStatus } from '../enums/form-status.enum';

/**
 * Form lifecycle invariants for submission and value operations.
 */
export class FormPolicy {
  static assertPublishedAndEnabled(form: Form): void {
    if (form.status === FormStatus.Disabled) {
      throw new FormDisabledError(form.id);
    }
    if (form.status !== FormStatus.Published) {
      throw new FormNotPublishedError(form.id);
    }
  }
}
