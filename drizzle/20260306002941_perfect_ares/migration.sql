CREATE TABLE `genres` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `titleGenres` (
	`titleId` text NOT NULL,
	`genreId` integer NOT NULL,
	CONSTRAINT `fk_titleGenres_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_titleGenres_genreId_genres_id_fk` FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `titleGenres_titleId_genreId` ON `titleGenres` (`titleId`,`genreId`);--> statement-breakpoint
CREATE INDEX `titleGenres_genreId` ON `titleGenres` (`genreId`);--> statement-breakpoint
CREATE INDEX `userEpisodeWatches_userId_episodeId` ON `userEpisodeWatches` (`userId`,`episodeId`);--> statement-breakpoint
CREATE INDEX `userMovieWatches_userId_titleId` ON `userMovieWatches` (`userId`,`titleId`);