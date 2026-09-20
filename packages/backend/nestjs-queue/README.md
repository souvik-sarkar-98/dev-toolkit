# `@ssdev-toolkit/nestjs-queue`

BullMQ job dispatch and worker handlers. Feature modules enqueue via `QueueFacade` and implement `@QueueHandler`.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-queue
```

Requires Redis (BullMQ) and typically `AuthModule` for worker identity context.

## What it does

- `QueueModule.forRoot` / `forRootAsync`
- `QueueFacade` — enqueue typed job classes
- `@QueueHandler(JobClass, options)` — worker (includes `@Injectable()`)
- Typed job errors (`TransientJobError`, `PermanentJobError`, …) and `isRetryableError`
- Optional job-log store (`IQueueJobRepository`); Redis and null implementations shipped

Do not inject `IQueueJobRepository` from feature modules; dispatch through the facade.

## Usage

```ts
@QueueHandler(CorrespondenceDispatchJob, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
})
export class CorrespondenceDispatchHandler
  implements IQueueHandler<CorrespondenceDispatchJob>
{
  async execute(job: Job<CorrespondenceDispatchJob>, ctx: JobExecutionContext) {
    // throw TransientJobError to retry
  }
}
```

```ts
await this.queueFacade.add(new CorrespondenceDispatchJob(/* … */));
```

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-queue
```

Overview: [root README](../../../README.md).
