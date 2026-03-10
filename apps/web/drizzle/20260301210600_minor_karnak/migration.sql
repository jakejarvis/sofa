CREATE TABLE `webhookConnections` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`mediaServerUsername` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`lastEventAt` integer,
	CONSTRAINT `fk_webhookConnections_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `webhookEventLog` (
	`id` text PRIMARY KEY,
	`connectionId` text NOT NULL,
	`eventType` text,
	`mediaType` text,
	`mediaTitle` text,
	`status` text NOT NULL,
	`errorMessage` text,
	`receivedAt` integer NOT NULL,
	CONSTRAINT `fk_webhookEventLog_connectionId_webhookConnections_id_fk` FOREIGN KEY (`connectionId`) REFERENCES `webhookConnections`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhookConnections_userId_provider` ON `webhookConnections` (`userId`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `webhookConnections_token` ON `webhookConnections` (`token`);--> statement-breakpoint
CREATE INDEX `webhookEventLog_connectionId_receivedAt` ON `webhookEventLog` (`connectionId`,`receivedAt`);