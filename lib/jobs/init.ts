import { registerJobs } from "./registry";
import { scheduler } from "./scheduler";

export function initJobs() {
  registerJobs();
  scheduler.start();
}
