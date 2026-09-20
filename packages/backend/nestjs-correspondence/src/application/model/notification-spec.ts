import {
  CorrespondenceRecipients,
  CorrespondenceChannels,
} from './correspondence-types';

/**
 * Internal, normalized correspondence request. Built inside this context by an
 * event resolver or a host adapter and passed to the orchestrator. Combines
 * recipient targeting and channel options into a single value — never a
 * cross-module event.
 */
export interface NotificationSpec {
  recipients: CorrespondenceRecipients;
  channels: CorrespondenceChannels;
}
