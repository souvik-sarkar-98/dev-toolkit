import type { FormDefinition } from '../models/types.js';

/** Sample definition for docs / internal demo (conditional + dependent selects). */
export const DEMO_FORM_DEFINITION: FormDefinition = {
  id: 'demo-form',
  key: 'demo-form',
  label: 'Custom form demo',
  description: 'Conditional and dependent select fields powered by forms-core.',
  fields: [
    {
      id: 'f-category',
      key: 'category',
      label: 'Category',
      fieldType: 'select',
      mandatory: true,
      fieldOptions: [
        { key: 'general', label: 'General' },
        { key: 'technical', label: 'Technical' },
      ],
      isHidden: false,
      isEncrypted: false,
      enabled: true,
      sortOrder: 1,
      condition: null,
      dependentOptions: null,
      validationRules: null,
    },
    {
      id: 'f-subcategory',
      key: 'subcategory',
      label: 'Subcategory',
      fieldType: 'select',
      mandatory: true,
      fieldOptions: [],
      isHidden: false,
      isEncrypted: false,
      enabled: true,
      sortOrder: 2,
      condition: {
        dependsOnKey: 'category',
        operator: 'not_equals',
        value: '',
      },
      dependentOptions: {
        dependsOnKey: 'category',
        optionMap: {
          general: [
            { key: 'info', label: 'Information' },
            { key: 'feedback', label: 'Feedback' },
          ],
          technical: [
            { key: 'bug', label: 'Bug report' },
            { key: 'feature', label: 'Feature request' },
          ],
        },
      },
      validationRules: null,
    },
    {
      id: 'f-details',
      key: 'details',
      label: 'Details',
      fieldType: 'textarea',
      mandatory: true,
      fieldOptions: [],
      isHidden: false,
      isEncrypted: false,
      enabled: true,
      sortOrder: 3,
      condition: {
        dependsOnKey: 'subcategory',
        operator: 'not_equals',
        value: '',
      },
      dependentOptions: null,
      validationRules: null,
    },
  ],
};
