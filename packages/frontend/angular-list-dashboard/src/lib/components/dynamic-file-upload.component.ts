import {
  AfterViewInit,
  Component,
  ComponentRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import type { ListFileUpload } from '@ssdev-toolkit/list-dashboard-core';
import type { UldFileUploadComponent } from '../tokens';

interface SubscribableOutput {
  subscribe(listener: (value: unknown) => void): { unsubscribe(): void };
}

@Component({
  selector: 'uld-dynamic-file-upload',
  template: '<ng-container #host></ng-container>',
  standalone: false,
})
export class DynamicFileUploadComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) component?: Type<UldFileUploadComponent>;
  @Input() allowedFileTypes?: string[];
  @Input() maxFileSize?: number;
  @Output() files = new EventEmitter<ListFileUpload[]>();

  @ViewChild('host', { read: ViewContainerRef, static: true })
  private host!: ViewContainerRef;

  private componentRef?: ComponentRef<UldFileUploadComponent>;
  private outputSubscription?: { unsubscribe(): void };
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }
    if ('component' in changes) {
      this.render();
      return;
    }
    this.applyInputs();
  }

  ngOnDestroy(): void {
    this.outputSubscription?.unsubscribe();
    this.componentRef?.destroy();
  }

  private render(): void {
    this.outputSubscription?.unsubscribe();
    this.outputSubscription = undefined;
    this.host.clear();
    this.componentRef = undefined;

    if (!this.component) {
      return;
    }

    this.componentRef = this.host.createComponent(this.component);
    this.applyInputs();

    const output = this.componentRef.instance.files as SubscribableOutput | undefined;
    if (output && typeof output.subscribe === 'function') {
      this.outputSubscription = output.subscribe(value => this.files.emit(value as ListFileUpload[]));
    }
  }

  private applyInputs(): void {
    this.componentRef?.setInput('allowedFileTypes', this.allowedFileTypes);
    this.componentRef?.setInput('maxFileSize', this.maxFileSize);
  }
}
