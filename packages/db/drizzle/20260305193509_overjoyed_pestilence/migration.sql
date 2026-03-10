CREATE TABLE `persons` (
	`id` text PRIMARY KEY,
	`tmdbId` integer NOT NULL,
	`name` text NOT NULL,
	`biography` text,
	`birthday` text,
	`deathday` text,
	`placeOfBirth` text,
	`profilePath` text,
	`knownForDepartment` text,
	`popularity` real,
	`imdbId` text,
	`lastFetchedAt` integer
);
--> statement-breakpoint
CREATE TABLE `titleCast` (
	`id` text PRIMARY KEY,
	`titleId` text NOT NULL,
	`personId` text NOT NULL,
	`character` text,
	`department` text DEFAULT 'Acting' NOT NULL,
	`job` text,
	`displayOrder` integer DEFAULT 0 NOT NULL,
	`episodeCount` integer,
	`lastFetchedAt` integer,
	CONSTRAINT `fk_titleCast_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_titleCast_personId_persons_id_fk` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persons_tmdbId_unique` ON `persons` (`tmdbId`);--> statement-breakpoint
CREATE INDEX `persons_name` ON `persons` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `titleCast_unique` ON `titleCast` (`titleId`,`personId`,`department`,`character`);--> statement-breakpoint
CREATE INDEX `titleCast_titleId_displayOrder` ON `titleCast` (`titleId`,`displayOrder`);--> statement-breakpoint
CREATE INDEX `titleCast_personId` ON `titleCast` (`personId`);