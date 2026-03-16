DROP INDEX IF EXISTS `titles_tmdbId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `titles_tmdbId_type_unique` ON `titles` (`tmdbId`,`type`);