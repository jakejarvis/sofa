CREATE TABLE `platforms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`tmdbProviderId` integer,
	`logoPath` text,
	`urlTemplate` text,
	`displayOrder` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `titleAvailability` (
	`titleId` text NOT NULL,
	`platformId` text NOT NULL,
	`offerType` text NOT NULL,
	`region` text DEFAULT 'US' NOT NULL,
	`lastFetchedAt` integer,
	CONSTRAINT `fk_titleAvailability_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_titleAvailability_platformId_platforms_id_fk` FOREIGN KEY (`platformId`) REFERENCES `platforms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `userPlatforms` (
	`userId` text NOT NULL,
	`platformId` text NOT NULL,
	CONSTRAINT `fk_userPlatforms_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_userPlatforms_platformId_platforms_id_fk` FOREIGN KEY (`platformId`) REFERENCES `platforms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
DROP INDEX IF EXISTS `availabilityOffers_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_tmdbProviderId_unique` ON `platforms` (`tmdbProviderId`);--> statement-breakpoint
CREATE INDEX `platforms_displayOrder` ON `platforms` (`displayOrder`);--> statement-breakpoint
CREATE UNIQUE INDEX `titleAvailability_unique` ON `titleAvailability` (`titleId`,`platformId`,`offerType`,`region`);--> statement-breakpoint
CREATE INDEX `titleAvailability_titleId` ON `titleAvailability` (`titleId`);--> statement-breakpoint
CREATE INDEX `titleAvailability_platformId` ON `titleAvailability` (`platformId`);--> statement-breakpoint
CREATE UNIQUE INDEX `userPlatforms_userId_platformId` ON `userPlatforms` (`userId`,`platformId`);--> statement-breakpoint
CREATE INDEX `userPlatforms_userId` ON `userPlatforms` (`userId`);--> statement-breakpoint
DROP TABLE `availabilityOffers`;