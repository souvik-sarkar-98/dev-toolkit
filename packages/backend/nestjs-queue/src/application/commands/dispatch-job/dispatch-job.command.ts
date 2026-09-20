import { JobOptions } from '../../../presentation/dto/queue.dto';

export class DispatchJobCommand {
  constructor(
    public readonly handlerName: string,
    public readonly payload: Record<string, any>,
    public readonly options?: JobOptions,
  ) {}
}
