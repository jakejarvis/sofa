CREATE TABLE `platformTmdbIds` (
	`platformId` text NOT NULL,
	`tmdbProviderId` integer NOT NULL,
	CONSTRAINT `fk_platformTmdbIds_platformId_platforms_id_fk` FOREIGN KEY (`platformId`) REFERENCES `platforms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `platformTmdbIds` (`platformId`, `tmdbProviderId`)
SELECT `id`, `tmdbProviderId` FROM `platforms` WHERE `tmdbProviderId` IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS `platforms_tmdbProviderId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `platformTmdbIds_tmdbProviderId_unique` ON `platformTmdbIds` (`tmdbProviderId`);--> statement-breakpoint
CREATE INDEX `platformTmdbIds_platformId` ON `platformTmdbIds` (`platformId`);--> statement-breakpoint
ALTER TABLE `platforms` DROP COLUMN `tmdbProviderId`;
