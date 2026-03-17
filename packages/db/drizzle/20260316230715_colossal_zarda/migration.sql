CREATE TABLE `importJobs` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`importWatches` integer NOT NULL,
	`importWatchlist` integer NOT NULL,
	`importRatings` integer NOT NULL,
	`totalItems` integer DEFAULT 0 NOT NULL,
	`processedItems` integer DEFAULT 0 NOT NULL,
	`importedCount` integer DEFAULT 0 NOT NULL,
	`skippedCount` integer DEFAULT 0 NOT NULL,
	`failedCount` integer DEFAULT 0 NOT NULL,
	`currentMessage` text,
	`errors` text,
	`warnings` text,
	`createdAt` integer NOT NULL,
	`startedAt` integer,
	`finishedAt` integer,
	CONSTRAINT `fk_importJobs_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `importJobs_userId_createdAt` ON `importJobs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `importJobs_status` ON `importJobs` (`status`);