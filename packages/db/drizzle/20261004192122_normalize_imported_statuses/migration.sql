-- Re-apply stored-status invariants for rows written by imports before they were
-- normalized at import time. TV never stores 'completed'.
UPDATE userTitleStatus SET status = 'in_progress'
WHERE status = 'completed'
AND titleId IN (SELECT id FROM titles WHERE type = 'tv');
--> statement-breakpoint
-- Movies never store 'in_progress'. Movies with a logged watch are 'completed'.
UPDATE userTitleStatus SET status = 'completed'
WHERE status = 'in_progress'
AND titleId IN (SELECT id FROM titles WHERE type = 'movie')
AND EXISTS (
  SELECT 1 FROM userMovieWatches w
  WHERE w.userId = userTitleStatus.userId AND w.titleId = userTitleStatus.titleId
);
--> statement-breakpoint
-- Remaining movie 'in_progress' rows have no watch: they are watchlist items.
UPDATE userTitleStatus SET status = 'watchlist'
WHERE status = 'in_progress'
AND titleId IN (SELECT id FROM titles WHERE type = 'movie');
