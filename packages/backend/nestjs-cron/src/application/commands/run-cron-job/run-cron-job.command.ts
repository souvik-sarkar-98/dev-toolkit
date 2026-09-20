export class RunCronJobCommand {
  constructor(
    readonly name: string,
    readonly inputData?: Record<string, any>,
  ) {}
}
