CREATE TABLE `personFilmography` (
	`id` text PRIMARY KEY,
	`personId` text NOT NULL,
	`titleId` text NOT NULL,
	`character` text,
	`department` text DEFAULT 'Acting' NOT NULL,
	`job` text,
	`displayOrder` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_personFilmography_personId_persons_id_fk` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_personFilmography_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `persons` ADD `filmographyLastFetchedAt` integer;--> statement-breakpoint
CREATE INDEX `personFilmography_personId_displayOrder` ON `personFilmography` (`personId`,`displayOrder`);--> statement-breakpoint
CREATE INDEX `personFilmography_titleId` ON `personFilmography` (`titleId`);