CREATE INDEX `titleRecommendations_titleId_rank` ON `titleRecommendations` (`titleId`,`rank`);--> statement-breakpoint
CREATE INDEX `titles_lastFetchedAt` ON `titles` (`lastFetchedAt`);--> statement-breakpoint
CREATE INDEX `titles_type_status_lastFetchedAt` ON `titles` (`type`,`status`,`lastFetchedAt`);