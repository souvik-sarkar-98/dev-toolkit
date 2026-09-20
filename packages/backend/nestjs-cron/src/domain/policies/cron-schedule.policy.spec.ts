/**
 * CronSchedulePolicy unit tests.
 * Pure TypeScript — zero framework imports.
 *
 * Partially supersedes: test/cron/cron.service.spec.ts (timezone + schedule evaluation logic).
 */
import { CronSchedulePolicy } from './cron-schedule.policy';

// Fixed reference instant used across tests so cron matching is deterministic.
// 2026-01-01 is a Thursday.
const NOW_UTC = new Date('2026-01-01T10:00:00.000Z');

describe('CronSchedulePolicy.shouldExecute', () => {
  describe('isDue — job within the 60-minute look-back window', () => {
    it('returns due=true when the schedule fires exactly at NOW', () => {
      const result = CronSchedulePolicy.shouldExecute('0 10 * * *', NOW_UTC, 'UTC');
      expect(result.due).toBe(true);
    });

    it('returns due=true when the schedule fires at the start of the look-back window', () => {
      // Expression fires at 09:01; NOW is 10:00 — 59 minutes after → within 60-min window
      const result = CronSchedulePolicy.shouldExecute('1 9 * * *', NOW_UTC, 'UTC');
      expect(result.due).toBe(true);
    });

    it('returns a scheduledAt Date when due', () => {
      const result = CronSchedulePolicy.shouldExecute('0 10 * * *', NOW_UTC, 'UTC');
      expect(Array.isArray(result.scheduledAt)).toBe(true);
      expect(result.scheduledAt![0]).toBeInstanceOf(Date);
    });

    it('the scheduledAt Date is at or before NOW when the job is due', () => {
      const result = CronSchedulePolicy.shouldExecute('0 10 * * *', NOW_UTC, 'UTC');
      expect(result.scheduledAt![0].getTime()).toBeLessThanOrEqual(NOW_UTC.getTime());
    });
  });

  describe('not due — job outside the look-back window', () => {
    it('returns due=false when the schedule fires far in the future', () => {
      // Expression fires at 23:00; NOW is 10:00 — 13 hours away → not due
      const result = CronSchedulePolicy.shouldExecute('0 23 * * *', NOW_UTC, 'UTC');
      expect(result.due).toBe(false);
    });

    it('does not return scheduledAt when not due', () => {
      const result = CronSchedulePolicy.shouldExecute('0 23 * * *', NOW_UTC, 'UTC');
      expect(result.scheduledAt).toBeUndefined();
    });

    it('returns due=false when the schedule fires more than 60 minutes ago', () => {
      // Expression fires at 08:00 — 2 hours before NOW → outside 60-min window
      const result = CronSchedulePolicy.shouldExecute('0 8 * * *', NOW_UTC, 'UTC');
      expect(result.due).toBe(false);
    });
  });

  describe('timezone-aware evaluation', () => {
    it('honors Asia/Kolkata (UTC+5:30) when evaluating schedule', () => {
      // 04:30 UTC == 10:00 IST — expression "0 10 * * *" should fire
      const nowIst = new Date('2026-01-01T04:30:00.000Z');
      const result = CronSchedulePolicy.shouldExecute('0 10 * * *', nowIst, 'Asia/Kolkata');
      expect(result.due).toBe(true);
    });

    it('does NOT fire a UTC-scheduled job when evaluated with a different timezone', () => {
      // NOW is 04:30 UTC; expression fires at 10:00 UTC.
      // In Asia/Kolkata the window start is 03:30 UTC = 09:00 IST;
      // next occurrence of "0 10 IST" from 09:00 IST is 10:00 IST = 04:30 UTC → actually fires.
      // Let's use a NOW where IST ≠ UTC:
      // NOW = 2026-01-01T02:00:00Z (07:30 IST). Expression "0 10 * * *" in IST fires at 04:30 UTC.
      // window: 01:00–02:00 UTC → 04:30 UTC is outside → not due.
      const now = new Date('2026-01-01T02:00:00.000Z');
      const result = CronSchedulePolicy.shouldExecute('0 10 * * *', now, 'Asia/Kolkata');
      expect(result.due).toBe(false);
    });

    it('honors America/New_York when evaluating schedule', () => {
      // 2026-01-01 is in EST (UTC-5). "0 8 * * *" fires at 08:00 EST = 13:00 UTC.
      const nowEst = new Date('2026-01-01T13:00:00.000Z');
      const result = CronSchedulePolicy.shouldExecute('0 8 * * *', nowEst, 'America/New_York');
      expect(result.due).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns due=false for an unparseable expression rather than throwing', () => {
      const result = CronSchedulePolicy.shouldExecute('not-a-cron', NOW_UTC, 'UTC');
      expect(result.due).toBe(false);
    });
  });
});

describe('CronSchedulePolicy.calculateNextRun', () => {
  it('returns a Date for a valid 5-part expression', () => {
    const result = CronSchedulePolicy.calculateNextRun('0 10 * * *', NOW_UTC, 'UTC');
    expect(result).toBeInstanceOf(Date);
  });

  it('computes the correct next run for a daily expression', () => {
    // From 2026-01-01T09:00 UTC, next "0 10 * * *" occurrence → 10:00 same day
    const from = new Date('2026-01-01T09:00:00.000Z');
    const next = CronSchedulePolicy.calculateNextRun('0 10 * * *', from, 'UTC');
    expect(next.getUTCHours()).toBe(10);
    expect(next.getUTCMinutes()).toBe(0);
  });

  it('computes next run in the given timezone', () => {
    // From 2026-01-01T03:30 UTC (= 09:00 IST), next "0 10 * * *" in IST → 10:00 IST = 04:30 UTC
    const from = new Date('2026-01-01T03:30:00.000Z');
    const next = CronSchedulePolicy.calculateNextRun('0 10 * * *', from, 'Asia/Kolkata');
    // 04:30 UTC
    expect(next.getUTCHours()).toBe(4);
    expect(next.getUTCMinutes()).toBe(30);
  });

  it('throws when expression cannot produce a next occurrence', () => {
    // Invalid expression wrapped by normalizeToQuartz should still throw
    expect(() =>
      CronSchedulePolicy.calculateNextRun('not-a-cron', NOW_UTC, 'UTC'),
    ).toThrow();
  });
});
