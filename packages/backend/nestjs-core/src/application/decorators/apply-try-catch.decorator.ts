/**
 * Decorator to wrap a cron event listener method in a try-catch block.
 * Catches any errors and returns a structured error object which CronSchedulerService recognizes.
 * This effectively prevents the NestJS Event Emitter from swallowing exceptions.
 */
export function ApplyTryCatch(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        return { __isError: true, error: error };
      }
    };

    return descriptor;
  };
}
