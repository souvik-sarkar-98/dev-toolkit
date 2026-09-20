import * as AwsCronParser from 'aws-cron-parser';
import { DateTime } from 'luxon';
import { normalizeToQuartz } from '../value-objects/cron-expression.vo';

/** Fixed look-back window. Scheduler may call at any interval up to this. */
const LOOK_BACK_MINUTES = 60;

export interface ScheduleCheckResult {
  due: boolean;
  /**
   * All scheduled occurrences within the look-back window.
   * Sub-hourly crons (e.g. `*\/5 * * * *`) may have multiple missed fires in one
   * trigger call; each entry should be enqueued as a separate BullMQ job with a
   * deterministic jobId so duplicate trigger calls are safely deduplicated.
   */
  scheduledAt?: Date[];
  /**
   * Set when the schedule could not be evaluated due to a parse or calculation
   * error. Callers should log this and treat the job as not due.
   */
  error?: string;
}

/**
 * Pure domain policy — no I/O, no framework dependencies.
 *
 * Determines all scheduled occurrences within the last 60 minutes of `now`.
 * Returns every occurrence so callers can enqueue one BullMQ job per missed fire.
 * The deterministic jobId (cronName + timestamp) prevents duplicate enqueues when
 * the external scheduler calls the trigger endpoint more than once in the window.
 */
export class CronSchedulePolicy {
  static shouldExecute(
    expression: string,
    now: Date,
    timezone: string,
  ): ScheduleCheckResult {
    try {
      const searchStart = new Date(now.getTime() - LOOK_BACK_MINUTES * 60 * 1000);
      const occurrences: Date[] = [];

      let cursor = searchStart;
      while (true) {
        const next = CronSchedulePolicy.calculateNextRun(expression, cursor, timezone);
        if (next > now) break;
        occurrences.push(next);
        // Advance cursor past this occurrence to find the next one.
        cursor = new Date(next.getTime() + 1000);
      }

      if (occurrences.length > 0) {
        return { due: true, scheduledAt: occurrences };
      }

      return { due: false };
    } catch (e) {
      // MEDIUM-1: Surface the error rather than silently returning { due: false }.
      // The caller (TriggerCronJobsHandler) is responsible for logging and tracking it.
      return { due: false, error: (e as Error).message };
    }
  }

  /**
   * Computes the next scheduled run of `expression` at or after `fromDate`,
   * interpreting the expression in the given IANA `timezone`.
   */
  static calculateNextRun(expression: string, fromDate: Date, timezone: string): Date {
    const normalized = normalizeToQuartz(expression);

    const zoned = DateTime.fromJSDate(fromDate).setZone(timezone);
    const dateForParser = new Date(
      Date.UTC(
        zoned.year,
        zoned.month - 1,
        zoned.day,
        zoned.hour,
        zoned.minute,
        zoned.second,
      ),
    );

    const occurrence = AwsCronParser.parse(normalized);
    const nextDateUTC = AwsCronParser.next(occurrence, dateForParser);

    if (!nextDateUTC) {
      throw new Error(
        `Could not calculate next run for expression: "${expression}" (normalized: "${normalized}")`,
      );
    }

    const result = DateTime.fromObject(
      {
        year: nextDateUTC.getUTCFullYear(),
        month: nextDateUTC.getUTCMonth() + 1,
        day: nextDateUTC.getUTCDate(),
        hour: nextDateUTC.getUTCHours(),
        minute: nextDateUTC.getUTCMinutes(),
        second: nextDateUTC.getUTCSeconds(),
      },
      { zone: timezone },
    );

    return result.toJSDate();
  }
}
