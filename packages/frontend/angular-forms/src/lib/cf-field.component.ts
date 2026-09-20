import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CustomFieldValueParsed, DateRangeValue, FieldOption, FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import type { ResolvedField } from '@ssdev-toolkit/forms-core';
import {
  formatIsoDate,
  formatPhoneFieldValue,
  isDateRangeValue,
  mergeDateRangePart,
  parseIsoDate,
  parsePhoneFieldValue,
  resolvePhoneCountryCodeOptions,
  resolveEffectiveDateBounds,
  createDatePickerFilter,
  hasDateConstraints,
  type ResolvedDateBounds,
} from '@ssdev-toolkit/forms-core';

@Component({
  selector: 'cf-field',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
  ],
  styleUrl: './cf-field.component.scss',
  template: `
    @if (visible) {
      @switch (field.definition.fieldType) {
        @case ('boolean') {
          <div
            class="cf-boolean-field"
            [ngClass]="classNames?.field"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <mat-checkbox
              [id]="fieldId"
              [ngModel]="boolValue"
              (ngModelChange)="valueChange.emit($event)"
            >
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </mat-checkbox>
            @if (fieldHint) {
              <div class="cf-field-hint">{{ fieldHint }}</div>
            }
            @if (error) {
              <div class="mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('phone') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <div class="cf-phone-group" [ngClass]="classNames?.phoneGroup">
              @if (phoneCountryOptions.length > 1) {
                <mat-form-field
                  appearance="outline"
                  class="cf-field cf-phone-country-field"
                  [ngClass]="classNames?.phoneCountry"
                  subscriptSizing="dynamic"
                  [class.cf-field--invalid]="!!error"
                >
                  <mat-select
                    class="cf-phone-country-select"
                    [id]="fieldId + '-country'"
                    [ngModel]="phoneParsed.countryCode"
                    (ngModelChange)="onPhoneCountryCodeChange($event)"
                    aria-label="Country code"
                  >
                    <mat-select-trigger>{{ phoneParsed.countryCode }}</mat-select-trigger>
                    @for (opt of phoneCountryOptions; track opt.code) {
                      <mat-option [value]="opt.code">{{ opt.label ?? opt.code }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <mat-form-field
                appearance="outline"
                class="cf-field cf-phone-field"
                [ngClass]="classNames?.field"
                subscriptSizing="dynamic"
                [class.cf-field--invalid]="!!error"
              >
                @if (phoneCountryOptions.length <= 1) {
                  <span matTextPrefix class="cf-phone-prefix">{{ phoneParsed.countryCode }}</span>
                }
                <input
                  matInput
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel-national"
                  [id]="fieldId"
                  [name]="field.definition.key"
                  [ngClass]="classNames?.phoneNational"
                  [ngModel]="phoneParsed.nationalNumber"
                  (ngModelChange)="onPhoneNationalNgModel($event)"
                  [placeholder]="fieldPlaceholder"
                />
                @if (fieldHint) {
                  <mat-hint>{{ fieldHint }}</mat-hint>
                }
              </mat-form-field>
            </div>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('textarea') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <textarea
                matInput
                [id]="fieldId"
                [name]="field.definition.key"
                rows="4"
                [placeholder]="fieldPlaceholder"
                [ngModel]="textValue"
                [readonly]="isReadOnly"
                (ngModelChange)="onTextNgModelChange($event)"
              ></textarea>
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('select') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <mat-select
                [id]="fieldId"
                [name]="field.definition.key"
                [placeholder]="fieldPlaceholder"
                [ngModel]="textValue"
                (ngModelChange)="valueChange.emit($event)"
              >
                @for (opt of field.availableOptions; track opt.key) {
                  <mat-option [value]="opt.key">{{ opt.label }}</mat-option>
                }
              </mat-select>
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('multiselect') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <mat-select
                multiple
                [id]="fieldId"
                [name]="field.definition.key"
                [placeholder]="fieldPlaceholder"
                [ngModel]="multiValue"
                (ngModelChange)="valueChange.emit($event)"
              >
                @for (opt of field.availableOptions; track opt.key) {
                  <mat-option [value]="opt.key">{{ opt.label }}</mat-option>
                }
              </mat-select>
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('toggle') {
          <div
            class="cf-toggle-field"
            [ngClass]="classNames?.field"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <mat-slide-toggle
              [ngModel]="boolValue"
              (ngModelChange)="valueChange.emit($event)"
            >
              {{ field.definition.label }}
            </mat-slide-toggle>
            @if (fieldHint) {
              <div class="cf-field-hint">{{ fieldHint }}</div>
            }
            @if (error) {
              <div class="mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('autocomplete') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field cf-autocomplete-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <input
                matInput
                type="text"
                [id]="fieldId"
                [name]="field.definition.key"
                [placeholder]="fieldPlaceholder"
                [ngModel]="autocompleteInputText"
                (ngModelChange)="onAutocompleteInput($event)"
                (focus)="onAutocompleteFocus()"
                [matAutocomplete]="autocompletePanel"
                #autocompleteTrigger="matAutocompleteTrigger"
              />
              <mat-autocomplete
                #autocompletePanel="matAutocomplete"
                [displayWith]="displayAutocomplete"
                autoActiveFirstOption
                panelClass="cf-autocomplete-panel"
                (opened)="onAutocompletePanelOpened()"
                (optionSelected)="onAutocompleteOptionSelected($event.option.value)"
              >
                @for (opt of filteredAutocompleteOptions; track opt.key) {
                  <mat-option [value]="opt.key">{{ opt.label }}</mat-option>
                }
              </mat-autocomplete>
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('date') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field cf-date-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <input
                matInput
                [id]="fieldId"
                [name]="field.definition.key"
                [matDatepicker]="datePicker"
                [matDatepickerFilter]="dateFilterFn"
                [min]="dateMinModel"
                [max]="dateMaxModel"
                [ngModel]="dateModel"
                [placeholder]="fieldPlaceholder"
                (dateChange)="onDateChange($event.value)"
                readonly
                (click)="datePicker.open()"
              />
              <mat-datepicker-toggle matIconSuffix [for]="datePicker" />
              <mat-datepicker #datePicker />
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @case ('date_range') {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <span class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </span>
            <mat-form-field
              appearance="outline"
              class="cf-field cf-date-range-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <mat-date-range-input [rangePicker]="dateRangePicker">
                <input
                  matStartDate
                  placeholder="Start date"
                  [min]="dateMinModel"
                  [max]="dateMaxModel"
                  [ngModel]="dateRangeStartModel"
                  (dateChange)="onDateRangeStartChange($event.value)"
                />
                <input
                  matEndDate
                  placeholder="End date"
                  [min]="dateEndMinModel"
                  [max]="dateEndMaxModel"
                  [ngModel]="dateRangeEndModel"
                  (dateChange)="onDateRangeEndChange($event.value)"
                />
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="dateRangePicker" />
              <mat-date-range-picker #dateRangePicker />
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
        @default {
          <div
            class="cf-field-block"
            [attr.data-cf-field]="field.definition.key"
            [attr.data-cf-type]="field.definition.fieldType"
          >
            <label [for]="fieldId" class="cf-field-label" [ngClass]="classNames?.label">
              {{ field.definition.label }}
              @if (field.effectiveMandatory) {
                <span class="cf-required-mark" aria-hidden="true"> *</span>
              }
            </label>
            <mat-form-field
              appearance="outline"
              class="cf-field"
              [ngClass]="classNames?.field"
              subscriptSizing="dynamic"
              [class.cf-field--invalid]="!!error"
            >
              <input
                matInput
                [id]="fieldId"
                [name]="field.definition.key"
                [type]="inputType"
                [placeholder]="fieldPlaceholder"
                [ngModel]="textValue"
                [readonly]="isReadOnly"
                (ngModelChange)="onTextNgModelChange($event)"
              />
              @if (fieldHint) {
                <mat-hint>{{ fieldHint }}</mat-hint>
              }
            </mat-form-field>
            @if (error) {
              <div class="cf-field-error mat-mdc-form-field-error" role="alert">{{ error }}</div>
            }
          </div>
        }
      }
    }
  `,
})
export class CfFieldComponent implements OnChanges {
  @Input({ required: true }) field!: ResolvedField;
  @Input() fieldId = '';
  @Input() value: CustomFieldValueParsed = null;
  @Input() error?: string;
  @Input() classNames?: {
    field?: string;
    label?: string;
    control?: string;
    error?: string;
    requiredMark?: string;
    phoneGroup?: string;
    phoneCountry?: string;
    phoneNational?: string;
  };
  @Input() engineOptions?: FormEngineOptions;
  @Input() formValues: FormValues = {};

  @Output() valueChange = new EventEmitter<CustomFieldValueParsed>();

  private static readonly MAX_AUTOCOMPLETE_OPTIONS = 100;

  filteredAutocompleteOptions: FieldOption[] = [];
  private autocompleteQuery = '';
  /** Prevents the panel from reopening while a selection is being applied. */
  private autocompleteSuppressPanelOpen = false;
  @ViewChild('autocompleteTrigger') private autocompleteTrigger?: MatAutocompleteTrigger;
  dateModel: Date | null = null;
  dateRangeStartModel: Date | null = null;
  dateRangeEndModel: Date | null = null;
  dateMinModel: Date | null = null;
  dateMaxModel: Date | null = null;
  dateEndMinModel: Date | null = null;
  dateEndMaxModel: Date | null = null;
  dateFilterFn: ((date: Date | null) => boolean) | undefined;
  private cachedDateBounds: ResolvedDateBounds | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['field'] || changes['formValues']) {
      if (this.field.definition.fieldType === 'date') {
        this.syncDateConstraints();
        this.syncDateModel();
      }
      if (this.field.definition.fieldType === 'date_range') {
        this.syncDateConstraints();
        this.syncDateRangeModels();
      }
      if (this.field.definition.fieldType === 'autocomplete') {
        if (changes['value']) {
          this.autocompleteQuery = '';
        }
        this.syncAutocompleteOptions(this.autocompleteQuery);
      }
    }
  }

  get phoneCountryOptions() {
    return resolvePhoneCountryCodeOptions(this.engineOptions);
  }

  get phoneParsed() {
    return parsePhoneFieldValue(this.value, this.engineOptions);
  }

  get visible(): boolean {
    return this.field.visible;
  }

  get isReadOnly(): boolean {
    return this.field.definition.readOnly === true;
  }

  /** Resolved Material hint text; empty/null hides the hint. */
  get fieldHint(): string {
    const hint = this.field.definition.hint;
    if (hint == null) return '';
    if (typeof hint === 'function') {
      return hint(this.formValues)?.trim() || '';
    }
    return hint.trim();
  }

  get fieldPlaceholder(): string {
    const def = this.field.definition;
    if (def.placeholder?.trim()) return def.placeholder.trim();
    const label = def.label.trim().toLowerCase();
    if (def.fieldType === 'autocomplete') {
      return def.placeholder?.trim() || `Search ${label}`;
    }
    if (def.fieldType === 'select' || def.fieldType === 'multiselect') {
      return `Select ${label}`;
    }
    if (def.fieldType === 'date') {
      return def.placeholder?.trim() || 'DD/MM/YYYY';
    }
    return `Enter ${label}`;
  }

  get textValue(): string {
    if (this.value === null || this.value === undefined) return '';
    if (typeof this.value === 'boolean') return '';
    if (typeof this.value === 'number') return String(this.value);
    if (Array.isArray(this.value)) return this.value.join(',');
    if (isDateRangeValue(this.value)) return '';
    return this.value;
  }

  get autocompleteInputText(): string {
    if (this.autocompleteQuery) {
      return this.autocompleteQuery;
    }
    return this.displayAutocomplete(this.textValue);
  }

  get multiValue(): string[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  get boolValue(): boolean {
    return Boolean(this.value);
  }

  get dateRangeValue(): DateRangeValue {
    return isDateRangeValue(this.value) ? this.value : {};
  }

  get inputType(): string {
    switch (this.field.definition.fieldType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'number':
        return 'number';
      case 'date':
        return 'text';
      case 'password':
        return 'password';
      default:
        return 'text';
    }
  }

  onTextNgModelChange(value: string): void {
    if (this.isReadOnly) {
      return;
    }
    if (this.field.definition.fieldType === 'number') {
      this.valueChange.emit(value === '' ? '' : Number(value));
      return;
    }
    this.valueChange.emit(value);
  }

  onPhoneCountryCodeChange(code: string): void {
    this.valueChange.emit(
      formatPhoneFieldValue(code, this.phoneParsed.nationalNumber),
    );
  }

  onPhoneNationalNgModel(national: string): void {
    this.valueChange.emit(
      formatPhoneFieldValue(this.phoneParsed.countryCode, national),
    );
  }

  onDateChange(value: Date | null): void {
    if (this.datesEqual(this.dateModel, value)) {
      return;
    }
    this.dateModel = value;
    this.valueChange.emit(formatIsoDate(value) || '');
  }

  onDateRangeStartChange(value: Date | null): void {
    if (this.datesEqual(this.dateRangeStartModel, value)) {
      return;
    }
    this.dateRangeStartModel = value;
    const next = mergeDateRangePart(this.dateRangeValue, { startDate: formatIsoDate(value) });
    if (
      next.startDate === this.dateRangeValue.startDate
      && next.endDate === this.dateRangeValue.endDate
    ) {
      return;
    }
    this.valueChange.emit(next);
  }

  onDateRangeEndChange(value: Date | null): void {
    if (this.datesEqual(this.dateRangeEndModel, value)) {
      return;
    }
    this.dateRangeEndModel = value;
    const next = mergeDateRangePart(this.dateRangeValue, { endDate: formatIsoDate(value) });
    if (
      next.startDate === this.dateRangeValue.startDate
      && next.endDate === this.dateRangeValue.endDate
    ) {
      return;
    }
    this.valueChange.emit(next);
  }

  displayAutocomplete = (key: string): string => {
    if (!key) {
      return '';
    }
    return this.autocompleteOptions.find(option => option.key === key)?.label ?? key;
  };

  onAutocompleteFocus(): void {
    this.syncAutocompleteOptions(this.autocompleteQuery);
    this.openAutocompletePanelIfNeeded();
  }

  onAutocompletePanelOpened(): void {
    if (!this.autocompleteQuery.trim() && this.textValue) {
      this.closeAutocompletePanel();
      return;
    }
    if (this.autocompleteQuery.trim()) {
      return;
    }
    this.filteredAutocompleteOptions = this.autocompleteOptions.slice(
      0,
      CfFieldComponent.MAX_AUTOCOMPLETE_OPTIONS,
    );
  }

  onAutocompleteInput(text: string): void {
    if (this.autocompleteSuppressPanelOpen) {
      return;
    }

    this.autocompleteQuery = text;
    this.syncAutocompleteOptions(text);
    const normalized = text.trim().toLowerCase();
    const matched = this.autocompleteOptions.find(
      option => option.key === text || option.label.toLowerCase() === normalized,
    );
    this.valueChange.emit(matched?.key ?? '');

    if (matched && (matched.key === text || matched.label.toLowerCase() === normalized)) {
      this.autocompleteQuery = '';
      this.closeAutocompletePanel();
      return;
    }

    this.openAutocompletePanelIfNeeded();
  }

  onAutocompleteOptionSelected(key: string): void {
    this.autocompleteSuppressPanelOpen = true;
    this.autocompleteQuery = '';
    this.syncAutocompleteOptions('');
    this.valueChange.emit(key);
    this.closeAutocompletePanel();
    queueMicrotask(() => {
      this.closeAutocompletePanel();
      this.autocompleteSuppressPanelOpen = false;
    });
  }

  private syncAutocompleteOptions(query: string): void {
    const options = this.autocompleteOptions;
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      this.filteredAutocompleteOptions = options.slice(
        0,
        CfFieldComponent.MAX_AUTOCOMPLETE_OPTIONS,
      );
      return;
    }

    if (options.some(option => option.key === query)) {
      this.filteredAutocompleteOptions = options.slice(0, CfFieldComponent.MAX_AUTOCOMPLETE_OPTIONS);
      return;
    }

    const filtered: FieldOption[] = [];
    for (const option of options) {
      if (option.label.toLowerCase().includes(normalized)) {
        filtered.push(option);
        if (filtered.length >= CfFieldComponent.MAX_AUTOCOMPLETE_OPTIONS) {
          break;
        }
      }
    }
    this.filteredAutocompleteOptions = filtered;
    this.cdr.markForCheck();
  }

  private get autocompleteOptions(): FieldOption[] {
    if (this.field.availableOptions.length > 0) {
      return this.field.availableOptions;
    }
    const { fieldOptions } = this.field.definition;
    return typeof fieldOptions === 'function'
      ? fieldOptions(this.formValues)
      : fieldOptions;
  }

  private openAutocompletePanelIfNeeded(): void {
    if (this.autocompleteSuppressPanelOpen) {
      return;
    }

    queueMicrotask(() => {
      if (this.autocompleteSuppressPanelOpen) {
        return;
      }

      const isSearching = this.autocompleteQuery.trim().length > 0;
      const hasNoSelection = !this.textValue;
      if ((isSearching || hasNoSelection) && this.filteredAutocompleteOptions.length > 0) {
        this.autocompleteTrigger?.openPanel();
      }
    });
  }

  private closeAutocompletePanel(): void {
    this.autocompleteTrigger?.closePanel();
  }

  private syncDateConstraints(): void {
    const selfValue = this.field.definition.fieldType === 'date_range'
      ? this.dateRangeValue
      : undefined;
    const bounds = resolveEffectiveDateBounds(
      this.field.definition.dateConstraints,
      this.formValues,
      new Date(),
      selfValue,
    );
    if (this.cachedDateBounds && this.sameDateBounds(this.cachedDateBounds, bounds)) {
      return;
    }
    this.cachedDateBounds = bounds;
    this.dateMinModel = bounds.min;
    this.dateMaxModel = bounds.max;
    this.dateEndMinModel = bounds.endMin;
    this.dateEndMaxModel = bounds.endMax;
    this.dateFilterFn = hasDateConstraints(bounds)
      ? createDatePickerFilter(bounds)
      : undefined;
  }

  private sameDateBounds(left: ResolvedDateBounds, right: ResolvedDateBounds): boolean {
    return (
      this.sameCalendarDay(left.min, right.min)
      && this.sameCalendarDay(left.max, right.max)
      && this.sameCalendarDay(left.endMin, right.endMin)
      && this.sameCalendarDay(left.endMax, right.endMax)
      && left.disabledWeekdays.length === right.disabledWeekdays.length
      && left.disabledWeekdays.every((day, index) => day === right.disabledWeekdays[index])
    );
  }

  private sameCalendarDay(left: Date | null, right: Date | null): boolean {
    if (left === right) {
      return true;
    }
    if (!left || !right) {
      return !left && !right;
    }
    return left.getTime() === right.getTime();
  }

  private syncDateModel(): void {
    const next = parseIsoDate(this.textValue || undefined);
    if (!this.datesEqual(this.dateModel, next)) {
      this.dateModel = next;
    }
  }

  private syncDateRangeModels(): void {
    const nextStart = parseIsoDate(this.dateRangeValue.startDate);
    const nextEnd = parseIsoDate(this.dateRangeValue.endDate);
    if (!this.datesEqual(this.dateRangeStartModel, nextStart)) {
      this.dateRangeStartModel = nextStart;
    }
    if (!this.datesEqual(this.dateRangeEndModel, nextEnd)) {
      this.dateRangeEndModel = nextEnd;
    }
  }

  private datesEqual(left: Date | null, right: Date | null): boolean {
    if (left === right) {
      return true;
    }
    if (!left || !right) {
      return !left && !right;
    }
    return left.getTime() === right.getTime();
  }
}
