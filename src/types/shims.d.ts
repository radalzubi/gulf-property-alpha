// node-cron ships no type declarations; the worker only uses cron.schedule().
declare module "node-cron" {
  interface ScheduledTask {
    start(): void;
    stop(): void;
  }
  export function schedule(expression: string, fn: () => void, options?: Record<string, unknown>): ScheduledTask;
  const _default: { schedule: typeof schedule };
  export default _default;
}
