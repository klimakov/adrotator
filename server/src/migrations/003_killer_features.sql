-- A/B: эффективный вес креатива (пересчитывается по CTR)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creatives' AND column_name = 'effective_weight') THEN
    ALTER TABLE creatives ADD COLUMN effective_weight INTEGER;
  END IF;
END $$;

-- Frequency cap: макс. показов на юзера в день по кампании
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'frequency_cap') THEN
    ALTER TABLE campaigns ADD COLUMN frequency_cap INTEGER;
  END IF;
END $$;

-- Webhook: URL для POST при клике
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'webhook_url') THEN
    ALTER TABLE campaigns ADD COLUMN webhook_url VARCHAR(500);
  END IF;
END $$;
