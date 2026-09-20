import type { KeyValueLike } from '@ssdev-toolkit/forms-core';

/** Reference-data resolver payload — KeyValue lists plus optional domain buckets. */
export type RefDataMap = Record<string, KeyValueLike[] | unknown>;
