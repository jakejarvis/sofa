ALTER TABLE `platforms` ADD `isSubscription` integer DEFAULT true NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `platforms_displayOrder`;--> statement-breakpoint
ALTER TABLE `platforms` DROP COLUMN `displayOrder`;