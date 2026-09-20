import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { CommentMentionSummary } from '@ssdev-toolkit/comment-core';
import { parseContentSegments } from '@ssdev-toolkit/comment-core';

@Component({
  selector: 'cm-comment-content',
  standalone: true,
  template: `
    @for (segment of segments; track $index) {
      @if (segment.type === 'mention') {
        <strong [attr.data-mention-id]="segment.userId">{{ segment.text }}</strong>
      } @else {
        <span>{{ segment.text }}</span>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentContentComponent {
  @Input({ required: true }) content!: string;
  @Input() mentions: CommentMentionSummary[] = [];

  get segments() {
    return parseContentSegments(this.content, this.mentions);
  }
}
