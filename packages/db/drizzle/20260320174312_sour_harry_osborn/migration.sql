-- TV shows should never have 'completed' stored — convert to 'in_progress'.
-- Display status (caught_up / completed) is now derived at read time from
-- episode progress + TMDB show status.
UPDATE userTitleStatus SET status = 'in_progress'
WHERE status = 'completed'
AND titleId IN (SELECT id FROM titles WHERE type = 'tv');
--> statement-breakpoint
-- Legacy movie rows stored as 'in_progress' (old UI always sent in_progress
-- when clicking Watchlist). Convert to 'watchlist' since no watch was logged.
UPDATE userTitleStatus SET status = 'watchlist'
WHERE status = 'in_progress'
AND titleId IN (SELECT id FROM titles WHERE type = 'movie');