import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

/** Register animations required by Angular Material form controls in `cf-form` / `cf-field`. */
export function provideCfFormMaterial(): EnvironmentProviders {
  return makeEnvironmentProviders([provideAnimations()]);
}
