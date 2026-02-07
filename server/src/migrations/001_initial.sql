-- Кампании
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'archived')),
    daily_budget DECIMAL(12,2) DEFAULT 0,
    total_budget DECIMAL(12,2) DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Креативы (баннеры)
CREATE TABLE IF NOT EXISTS creatives (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'image'
        CHECK (type IN ('image', 'html')),
    width INTEGER NOT NULL DEFAULT 300,
    height INTEGER NOT NULL DEFAULT 250,
    image_url VARCHAR(500),
    click_url VARCHAR(500),
    html_content TEXT,
    weight INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Площадки (рекламные зоны)
CREATE TABLE IF NOT EXISTS placements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_domain VARCHAR(255),
    zone_key VARCHAR(100) UNIQUE NOT NULL,
    width INTEGER NOT NULL DEFAULT 300,
    height INTEGER NOT NULL DEFAULT 250,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Связь: какие креативы показываются на каких площадках
CREATE TABLE IF NOT EXISTS placement_creatives (
    placement_id INTEGER NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    creative_id INTEGER NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
    PRIMARY KEY (placement_id, creative_id)
);

-- Логи показов
CREATE TABLE IF NOT EXISTS impressions (
    id BIGSERIAL PRIMARY KEY,
    creative_id INTEGER REFERENCES creatives(id) ON DELETE SET NULL,
    placement_id INTEGER REFERENCES placements(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Логи кликов
CREATE TABLE IF NOT EXISTS clicks (
    id BIGSERIAL PRIMARY KEY,
    creative_id INTEGER REFERENCES creatives(id) ON DELETE SET NULL,
    placement_id INTEGER REFERENCES placements(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Агрегированная дневная статистика
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    creative_id INTEGER REFERENCES creatives(id) ON DELETE CASCADE,
    placement_id INTEGER REFERENCES placements(id) ON DELETE CASCADE,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    UNIQUE(date, creative_id, placement_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);
CREATE INDEX IF NOT EXISTS idx_placements_zone_key ON placements(zone_key);
CREATE INDEX IF NOT EXISTS idx_impressions_created ON impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
