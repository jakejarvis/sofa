CREATE TABLE `appSettings` (
	`key` text PRIMARY KEY,
	`value` text
);
--> statement-breakpoint
ALTER TABLE `session` ADD `impersonatedBy` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banExpires` integer;