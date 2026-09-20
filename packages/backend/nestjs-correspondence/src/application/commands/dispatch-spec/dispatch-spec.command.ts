import { NotificationSpec } from '../../model/notification-spec';

export class DispatchSpecCommand {
  constructor(public readonly spec: NotificationSpec) {}
}
