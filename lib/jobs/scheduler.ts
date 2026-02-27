interface Job {
  name: string;
  handler: () => Promise<void>;
  intervalMs: number;
  timer?: ReturnType<typeof setInterval>;
}

const globalForScheduler = globalThis as unknown as {
  _scheduler: Scheduler | undefined;
};

class Scheduler {
  private jobs = new Map<string, Job>();
  private running = false;

  register(name: string, handler: () => Promise<void>, intervalMs: number) {
    this.jobs.set(name, { name, handler, intervalMs });
  }

  start() {
    if (this.running) return;
    this.running = true;

    for (const job of this.jobs.values()) {
      job.timer = setInterval(async () => {
        try {
          console.log(`[scheduler] Running job: ${job.name}`);
          await job.handler();
          console.log(`[scheduler] Completed job: ${job.name}`);
        } catch (err) {
          console.error(`[scheduler] Job ${job.name} failed:`, err);
        }
      }, job.intervalMs);
    }

    console.log(`[scheduler] Started ${this.jobs.size} jobs`);
  }

  stop() {
    for (const job of this.jobs.values()) {
      if (job.timer) clearInterval(job.timer);
    }
    this.running = false;
  }

  async runNow(name: string) {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job not found: ${name}`);
    await job.handler();
  }

  getJobNames() {
    return [...this.jobs.keys()];
  }
}

if (!globalForScheduler._scheduler) {
  globalForScheduler._scheduler = new Scheduler();
}

export const scheduler = globalForScheduler._scheduler;
