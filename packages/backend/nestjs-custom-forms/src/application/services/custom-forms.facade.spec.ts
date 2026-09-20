import { CustomFormsFacade } from './custom-forms.facade';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SaveFormDraftCommand } from '../commands/save-form-draft/save-form-draft.command';
import { ValidateFormSubmissionQuery } from '../queries/validate-form-submission/validate-form-submission.query';
import { FormSubmissionInvalidError } from '../../domain/errors/form.errors';

describe('CustomFormsFacade', () => {
  it('validateSubmission throws when validation fails', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue([]) };
    const queryBus = {
      execute: jest.fn().mockResolvedValue({
        valid: false,
        missingMandatory: ['email'],
        validationViolations: [],
        conditionViolations: [],
      }),
    };
    const facade = new CustomFormsFacade(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );

    await expect(
      facade.validateSubmission({
        formId: 'form-1',
        entityType: 'public_site',
        entityId: 'e1',
        values: {},
        submittedById: 'public:anonymous',
      }),
    ).rejects.toBeInstanceOf(FormSubmissionInvalidError);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SaveFormDraftCommand));
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ValidateFormSubmissionQuery));
  });
});
