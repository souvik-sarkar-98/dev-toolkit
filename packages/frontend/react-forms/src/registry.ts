import type { CustomFieldType } from '@ssdev-toolkit/forms-core';
import type { CustomFormClassNames, CustomFormComponents, FieldRenderProps } from './types.js';
import type { ReactNode } from 'react';
import { createElement } from 'react';

const DEFAULT_COMPONENTS: CustomFormComponents = {};

export function mergeComponents(
  base: CustomFormComponents,
  override?: CustomFormComponents,
): CustomFormComponents {
  return { ...base, ...override };
}

export function renderFieldControl(
  props: FieldRenderProps,
  components: CustomFormComponents,
): ReactNode {
  const type: CustomFieldType = props.field.definition.fieldType;
  const Component = components[type];
  if (!Component) {
    return createElement(
      'span',
      { 'data-cf-missing-renderer': type },
      `No renderer for field type "${type}"`,
    );
  }
  return Component(props);
}

export function wrapFieldLayout(
  props: FieldRenderProps,
  control: ReactNode,
  classNames?: CustomFormClassNames,
): ReactNode {
  const { field, id, error } = props;
  const required = field.effectiveMandatory;
  const isPhone = field.definition.fieldType === 'phone';

  return createElement(
    'div',
    {
      className: classNames?.field,
      'data-cf-field': field.definition.key,
      'data-cf-type': field.definition.fieldType,
    },
    createElement(
      'label',
      {
        htmlFor: isPhone ? undefined : id,
        className: classNames?.label,
        id: isPhone ? `${id}-label` : undefined,
      },
      field.definition.label,
      required &&
        createElement(
          'span',
          { className: classNames?.requiredMark, 'aria-hidden': true },
          ' *',
        ),
    ),
    isPhone
      ? createElement(
          'div',
          {
            role: 'group',
            'aria-labelledby': `${id}-label`,
          },
          control,
        )
      : createElement('div', { className: classNames?.control }, control),
    error &&
      createElement(
        'div',
        { className: classNames?.error, role: 'alert' },
        error,
      ),
  );
}

export { DEFAULT_COMPONENTS };
