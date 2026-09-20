import { Directive, Input, TemplateRef } from '@angular/core';

/** Marks a projected ng-template as content for a custom stepper step. */
@Directive({
  selector: 'ng-template[cfFormStepperStep]',
  standalone: true,
})
export class CfFormStepperStepDirective {
  @Input({ alias: 'cfFormStepperStep', required: true }) stepId!: string;

  constructor(public readonly template: TemplateRef<unknown>) {}
}
