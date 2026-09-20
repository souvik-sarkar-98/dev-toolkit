import { InjectionToken } from '@angular/core';
import type { MentionCandidate } from '@ssdev-toolkit/comment-core';

export type MentionUserSearchFn = (query: string) => MentionCandidate[] | Promise<MentionCandidate[]>;

export const MENTION_USER_SEARCH = new InjectionToken<MentionUserSearchFn>('MENTION_USER_SEARCH');
