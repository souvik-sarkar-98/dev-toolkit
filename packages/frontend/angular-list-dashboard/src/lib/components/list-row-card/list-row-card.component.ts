import { Component, Input } from '@angular/core';
import { ListRowIconTone } from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-list-row-card',
  templateUrl: './list-row-card.component.html',
  styleUrls: ['./list-row-card.component.scss'],
  standalone: false,
})
export class ListRowCardComponent {
  @Input() iconTone: ListRowIconTone = 'orange';
  @Input() avatar = false;
  @Input() badgeTone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';

  get iconToneClass(): string {
    return this.avatar ? 'list-row__icon--avatar' : `list-row__icon--${this.iconTone}`;
  }

  get badgeToneClass(): string {
    return `list-row__badge--${this.badgeTone}`;
  }
}
