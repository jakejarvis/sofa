-- Crew rows store character = NULL and SQLite treats NULLs as distinct in the
-- titleCast_unique index, so every credits refresh inserted another copy.
-- Keep the most recently inserted row for each logical credit.
DELETE FROM titleCast
WHERE rowid NOT IN (
  SELECT MAX(rowid) FROM titleCast
  GROUP BY titleId, personId, department, COALESCE(character, ''), COALESCE(job, '')
);
