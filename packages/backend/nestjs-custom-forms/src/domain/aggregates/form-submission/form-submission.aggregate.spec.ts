import { FormSubmission } from './form-submission.aggregate';
import { FormSubmissionStatus } from '../../enums/form-submission-status.enum';
import { FormSubmissionAlreadySubmittedError } from '../../errors/form.errors';
import { FormSubmittedEvent } from '../../events/form-submitted.event';

describe('FormSubmission aggregate', () => {
  it('creates a draft submission', () => {
    const sub = FormSubmission.create({
      entityType: 'donation',
      entityId: 'don-1',
      formId: 'form-1',
    });
    expect(sub.status).toBe(FormSubmissionStatus.Draft);
  });

  it('rejects draft save after submit', () => {
    const sub = FormSubmission.create({
      entityType: 'donation',
      entityId: 'don-1',
      formId: 'form-1',
    });
    sub.submit('user-1');
    expect(() =>
      sub.saveDraft([{ fieldDefId: 'f1', value: 'x', changedBy: 'user-1' }]),
    ).toThrow(FormSubmissionAlreadySubmittedError);
  });

  it('emits FormSubmittedEvent on submit', () => {
    const sub = FormSubmission.create({
      entityType: 'donation',
      entityId: 'don-1',
      formId: 'form-1',
    });
    sub.submit('user-1');
    expect(sub.status).toBe(FormSubmissionStatus.Submitted);
    expect(sub.integrationEvents[0]).toBeInstanceOf(FormSubmittedEvent);
  });
});
