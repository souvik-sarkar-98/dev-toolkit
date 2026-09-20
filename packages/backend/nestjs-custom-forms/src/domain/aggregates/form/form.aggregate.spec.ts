import { Form } from './form.aggregate';
import { CustomFieldType } from '../../enums/custom-field-type.enum';
import {
  FormFieldMutationNotAllowedError,
  InvalidFormKeyError,
} from '../../errors/form.errors';
import { FormStatus } from '../../enums/form-status.enum';
import { FormPublishedEvent } from '../../events/form-published.event';
import { FormDisabledEvent } from '../../events/form-disabled.event';

describe('Form aggregate', () => {
  it('creates a draft form with immutable key', () => {
    const form = Form.create({
      entityType: 'donation',
      key: 'intake',
      label: 'Intake Form',
    });
    expect(form.key).toBe('intake');
    expect(form.status).toBe(FormStatus.Draft);
    expect(form.domainEvents).toHaveLength(1);
  });

  it('rejects invalid form keys on create', () => {
    expect(() =>
      Form.create({ entityType: 'donation', key: 'bad key', label: 'Bad' }),
    ).toThrow(InvalidFormKeyError);
  });

  it('publishes and emits FormPublishedEvent', () => {
    const form = Form.create({
      entityType: 'donation',
      key: 'intake',
      label: 'Intake',
    });
    form.clearEvents();
    form.publish('user-1');
    expect(form.status).toBe(FormStatus.Published);
    expect(form.domainEvents[0]).toBeInstanceOf(FormPublishedEvent);
  });

  it('disables and emits FormDisabledEvent', () => {
    const form = Form.create({
      entityType: 'donation',
      key: 'intake',
      label: 'Intake',
    });
    form.publish();
    form.clearEvents();
    form.disable('user-1');
    expect(form.status).toBe(FormStatus.Disabled);
    expect(form.domainEvents[0]).toBeInstanceOf(FormDisabledEvent);
  });

  it('allows field add only in draft', () => {
    const form = Form.create({
      entityType: 'donation',
      key: 'intake',
      label: 'Intake',
    });
    form.addField({ key: 'amount', label: 'Amount', fieldType: CustomFieldType.Number });
    expect(form.fields).toHaveLength(1);

    form.publish();
    expect(() =>
      form.addField({ key: 'notes', label: 'Notes', fieldType: CustomFieldType.Text }),
    ).toThrow(FormFieldMutationNotAllowedError);
  });

  it('allows disableField on published form', () => {
    const form = Form.create({
      entityType: 'donation',
      key: 'intake',
      label: 'Intake',
    });
    const field = form.addField({
      key: 'amount',
      label: 'Amount',
      fieldType: CustomFieldType.Number,
    });
    form.publish();
    form.disableField(field.id);
    expect(form.fields[0].enabled).toBe(false);
  });
});
