CREATE TABLE `cronRuns` (
	`id` text PRIMARY KEY,
	`jobName` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` integer NOT NULL,
	`finishedAt` integer,
	`errorMessage` text
);
--> statement-breakpoint
CREATE INDEX `cronRuns_jobName_startedAt` ON `cronRuns` (`jobName`,`startedAt`);