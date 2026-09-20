import { Injectable, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import {
  JobMetrics,
  JobPerformanceMetrics,
  QueueHealth,
  QueueStatistics,
} from '../../../presentation/dto/queue.dto';
import { GetQueueStatisticsQuery } from './get-queue-statistics.query';

@QueryHandler(GetQueueStatisticsQuery)
@Injectable()
export class GetQueueStatisticsHandler
  implements IQueryHandler<GetQueueStatisticsQuery, QueueStatistics>
{
  private readonly logger = new Logger(GetQueueStatisticsHandler.name);

  constructor(private readonly processing: QueueProcessingService) {}

  async execute(): Promise<QueueStatistics> {
    const metrics     = await this.getJobMetrics();
    const [performance, health] = await Promise.all([
      this.getPerformanceMetrics(),
      this.getQueueHealth(metrics),
    ]);
    return { metrics, performance, health, timestamp: new Date() };
  }

  private async getJobMetrics(): Promise<JobMetrics> {
    const jobCounts = await this.processing.getJobCounts();
    const total = Object.values(jobCounts).reduce((a, b) => a + b, 0);
    return {
      total,
      successRate: total > 0 ? Math.round((jobCounts.completed / total) * 10000) / 100 : 0,
      failureRate: total > 0 ? Math.round((jobCounts.failed   / total) * 10000) / 100 : 0,
      active:          jobCounts['active'],
      waiting:         jobCounts['waiting'],
      delayed:         jobCounts['delayed'],
      waitingChildren: jobCounts['waiting-children'],
      completed:       jobCounts['completed'],
      failed:          jobCounts['failed'],
    };
  }

  private async getPerformanceMetrics(): Promise<JobPerformanceMetrics> {
    const { jobs: completedJobs } = await this.processing.getJobs(0, 1000, 'completed');
    if (!completedJobs.length) {
      return { averageProcessingTime: 0, fastestJob: 0, slowestJob: 0, totalProcessingTime: 0 };
    }
    const processingTimes = completedJobs
      .map(job => (job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0))
      .filter(t => t > 0);

    if (!processingTimes.length) {
      return { averageProcessingTime: 0, fastestJob: 0, slowestJob: 0, totalProcessingTime: 0 };
    }
    const total = processingTimes.reduce((s, t) => s + t, 0);
    return {
      averageProcessingTime: Math.round(total / processingTimes.length),
      fastestJob:            Math.min(...processingTimes),
      slowestJob:            Math.max(...processingTimes),
      totalProcessingTime:   total,
    };
  }

  private async getQueueHealth(metrics: JobMetrics): Promise<QueueHealth> {
    try {
      const isPaused = await this.processing.isQueuePaused();
      const health: QueueHealth = { status: 'healthy', isPaused, issues: [] };

      if (metrics.failureRate > 50) {
        health.status = 'unhealthy';
        health.issues.push('High failure rate detected');
      }
      if (metrics.waiting > 100) {
        health.status = 'degraded';
        health.issues.push('High number of waiting jobs');
      }
      if (isPaused) {
        health.status = 'paused';
        health.issues.push('Queue is paused');
      }
      return health;
    } catch {
      return { status: 'error', isPaused: false, issues: ['Failed to retrieve queue health data'] };
    }
  }
}
