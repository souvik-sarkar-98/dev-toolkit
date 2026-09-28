import { InjectionToken } from '@angular/core';
import type { MentionUserSearch } from '@ssdev-toolkit/comment-core';

/** @deprecated Use `MentionUserSearch` from `@ssdev-toolkit/comment-core`. */
export type MentionUserSearchFn = MentionUserSearch;

export const MENTION_USER_SEARCH = new InjectionToken<MentionUserSearch>('MENTION_USER_SEARCH');
