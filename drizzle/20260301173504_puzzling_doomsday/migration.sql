CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `availabilityOffers` (
	`titleId` text NOT NULL,
	`region` text DEFAULT 'US' NOT NULL,
	`providerId` integer NOT NULL,
	`providerName` text NOT NULL,
	`logoPath` text,
	`offerType` text NOT NULL,
	`link` text,
	`lastFetchedAt` integer,
	CONSTRAINT `fk_availabilityOffers_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY,
	`seasonId` text NOT NULL,
	`episodeNumber` integer NOT NULL,
	`name` text,
	`overview` text,
	`stillPath` text,
	`airDate` text,
	`runtimeMinutes` integer,
	CONSTRAINT `fk_episodes_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY,
	`titleId` text NOT NULL,
	`seasonNumber` integer NOT NULL,
	`name` text,
	`overview` text,
	`posterPath` text,
	`airDate` text,
	`lastFetchedAt` integer,
	CONSTRAINT `fk_seasons_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`token` text NOT NULL UNIQUE,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `titleRecommendations` (
	`titleId` text NOT NULL,
	`recommendedTitleId` text NOT NULL,
	`source` text NOT NULL,
	`rank` integer NOT NULL,
	`lastFetchedAt` integer,
	CONSTRAINT `fk_titleRecommendations_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_titleRecommendations_recommendedTitleId_titles_id_fk` FOREIGN KEY (`recommendedTitleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `titles` (
	`id` text PRIMARY KEY,
	`tmdbId` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`originalTitle` text,
	`overview` text,
	`releaseDate` text,
	`firstAirDate` text,
	`posterPath` text,
	`backdropPath` text,
	`popularity` real,
	`voteAverage` real,
	`voteCount` integer,
	`status` text,
	`lastFetchedAt` integer
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userEpisodeWatches` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`episodeId` text NOT NULL,
	`watchedAt` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	CONSTRAINT `fk_userEpisodeWatches_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_userEpisodeWatches_episodeId_episodes_id_fk` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `userMovieWatches` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`titleId` text NOT NULL,
	`watchedAt` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	CONSTRAINT `fk_userMovieWatches_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_userMovieWatches_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `userRatings` (
	`userId` text NOT NULL,
	`titleId` text NOT NULL,
	`ratingStars` integer NOT NULL,
	`ratedAt` integer NOT NULL,
	CONSTRAINT `fk_userRatings_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_userRatings_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `userTitleStatus` (
	`userId` text NOT NULL,
	`titleId` text NOT NULL,
	`status` text NOT NULL,
	`addedAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_userTitleStatus_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_userTitleStatus_titleId_titles_id_fk` FOREIGN KEY (`titleId`) REFERENCES `titles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `availabilityOffers_unique` ON `availabilityOffers` (`titleId`,`region`,`providerId`,`offerType`);--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_seasonId_episodeNumber` ON `episodes` (`seasonId`,`episodeNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_titleId_seasonNumber` ON `seasons` (`titleId`,`seasonNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `titleRecommendations_unique` ON `titleRecommendations` (`titleId`,`recommendedTitleId`,`source`);--> statement-breakpoint
CREATE UNIQUE INDEX `titles_tmdbId_unique` ON `titles` (`tmdbId`);--> statement-breakpoint
CREATE INDEX `titles_type_releaseDate` ON `titles` (`type`,`releaseDate`);--> statement-breakpoint
CREATE INDEX `titles_type_firstAirDate` ON `titles` (`type`,`firstAirDate`);--> statement-breakpoint
CREATE INDEX `userEpisodeWatches_userId_watchedAt` ON `userEpisodeWatches` (`userId`,`watchedAt`);--> statement-breakpoint
CREATE INDEX `userEpisodeWatches_episodeId` ON `userEpisodeWatches` (`episodeId`);--> statement-breakpoint
CREATE INDEX `userMovieWatches_userId_watchedAt` ON `userMovieWatches` (`userId`,`watchedAt`);--> statement-breakpoint
CREATE INDEX `userMovieWatches_titleId` ON `userMovieWatches` (`titleId`);--> statement-breakpoint
CREATE UNIQUE INDEX `userRatings_userId_titleId` ON `userRatings` (`userId`,`titleId`);--> statement-breakpoint
CREATE UNIQUE INDEX `userTitleStatus_userId_titleId` ON `userTitleStatus` (`userId`,`titleId`);--> statement-breakpoint
CREATE INDEX `userTitleStatus_userId_status` ON `userTitleStatus` (`userId`,`status`);