CREATE TABLE `integrationEvents` (
	`id` text PRIMARY KEY,
	`integrationId` text NOT NULL,
	`eventType` text,
	`mediaType` text,
	`mediaTitle` text,
	`status` text NOT NULL,
	`errorMessage` text,
	`receivedAt` integer NOT NULL,
	CONSTRAINT `fk_integrationEvents_integrationId_integrations_id_fk` FOREIGN KEY (`integrationId`) REFERENCES `integrations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`provider` text NOT NULL,
	`type` text NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`lastEventAt` integer,
	CONSTRAINT `fk_integrations_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `titles` ADD `tvdbId` integer;--> statement-breakpoint
DROP INDEX IF EXISTS `webhookConnections_userId_provider`;--> statement-breakpoint
DROP INDEX IF EXISTS `webhookConnections_token`;--> statement-breakpoint
DROP INDEX IF EXISTS `webhookEventLog_connectionId_receivedAt`;--> statement-breakpoint
CREATE INDEX `integrationEvents_integrationId_receivedAt` ON `integrationEvents` (`integrationId`,`receivedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_userId_provider` ON `integrations` (`userId`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_token` ON `integrations` (`token`);--> statement-breakpoint
DROP TABLE `webhookConnections`;--> statement-breakpoint
DROP TABLE `webhookEventLog`;