import {
  AfterViewInit,
  Component,
  ComponentRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  LIST_FORM_CUSTOM_STEP_RENDERERS,
  type ListFormCustomStepComponent,
  type ListFormCustomStepRenderer,
} from '../tokens';

/**
 * Renders the component registered for a `rendererKey` inside a stepper custom step.
 *
 * The rendered component follows {@link ListFormCustomStepComponent}: `data` in,
 * `dataChange` out, optional `validate()` used as the step validator.
 */
@Component({
  selector: 'uld-list-form-custom-step-host',
  standalone: true,
  template: '<ng-container #host></ng-container>',
})
export class ListFormCustomStepHostComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) rendererKey!: string;
  @Input() data: unknown;

  @Output() dataChange = new EventEmitter<unknown>();
  /** Emitted once the renderer exists so the flow host can register its validator. */
  @Output() ready = new EventEmitter<ListFormCustomStepHostComponent>();
  @Output() closed = new EventEmitter<ListFormCustomStepHostComponent>();

  @ViewChild('host', { read: ViewContainerRef, static: true })
  private container!: ViewContainerRef;

  private componentRef?: ComponentRef<ListFormCustomStepComponent>;
  private outputSubscription?: { unsubscribe(): void };
  private viewReady = false;
  private lastEmitted?: unknown;
  private hasEmitted = false;

  constructor(
    @Optional()
    @Inject(LIST_FORM_CUSTOM_STEP_RENDERERS)
    private readonly renderers: readonly ListFormCustomStepRenderer[] | null,
  ) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }
    if ('rendererKey' in changes) {
      this.render();
      return;
    }
    this.applyData();
  }

  ngOnDestroy(): void {
    this.outputSubscription?.unsubscribe();
    this.componentRef?.destroy();
    this.closed.emit(this);
  }

  /** False only when the renderer exists and reports invalid data. */
  validate(): boolean {
    const instance = this.componentRef?.instance;
    if (!instance || typeof instance.validate !== 'function') {
      return true;
    }
    return instance.validate() !== false;
  }

  private render(): void {
    this.outputSubscription?.unsubscribe();
    this.outputSubscription = undefined;
    this.componentRef?.destroy();
    this.componentRef = undefined;
    this.container.clear();
    this.lastEmitted = undefined;
    this.hasEmitted = false;

    const component = this.resolveComponent();
    if (!component) {
      return;
    }

    this.componentRef = this.container.createComponent(component);
    this.applyData();

    const output = this.componentRef.instance.dataChange;
    if (output && typeof output.subscribe === 'function') {
      this.outputSubscription = output.subscribe(value => {
        this.lastEmitted = value;
        this.hasEmitted = true;
        this.dataChange.emit(value);
      });
    }

    this.ready.emit(this);
  }

  private resolveComponent(): ListFormCustomStepRenderer['component'] | undefined {
    return this.renderers?.find(entry => entry.rendererKey === this.rendererKey)?.component;
  }

  private applyData(): void {
    const ref = this.componentRef;
    if (!ref) {
      return;
    }
    // The flow stores what the renderer emits and hands it straight back. Pushing
    // that echo into `data` mid-edit makes renderers rebuild their rows and the
    // focused control is destroyed, so the value the renderer already owns is skipped.
    if (this.hasEmitted && Object.is(this.data, this.lastEmitted)) {
      return;
    }
    try {
      ref.setInput('data', this.data);
    } catch {
      // Renderer exposes no `data` input — keep the step usable and let it read
      // whatever it needs from its own providers.
    }
  }
}
