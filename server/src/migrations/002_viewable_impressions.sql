-- Видимые показы (MRC: ≥50% баннера в viewport ≥1 сек)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_stats' AND column_name = 'viewable_impressions') THEN
    ALTER TABLE daily_stats ADD COLUMN viewable_impressions INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
