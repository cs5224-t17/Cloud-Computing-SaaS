CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  area                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  contact_email       TEXT,
  contact_phone       TEXT,
  instagram           TEXT,
  website             TEXT,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  claim_user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  claim_code          TEXT,
  claim_expires_at    TIMESTAMPTZ,
  source              TEXT NOT NULL DEFAULT 'seed',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  search              TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(area, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED
);
CREATE INDEX IF NOT EXISTS businesses_search_idx   ON businesses USING GIN (search);
CREATE INDEX IF NOT EXISTS businesses_category_idx ON businesses (category);
CREATE INDEX IF NOT EXISTS businesses_area_idx     ON businesses (area);

CREATE TABLE IF NOT EXISTS services (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price_from   NUMERIC(10,2),
  search       TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS services_business_idx ON services (business_id);
CREATE INDEX IF NOT EXISTS services_search_idx   ON services USING GIN (search);

-- day: 0 = Sunday .. 6 = Saturday
CREATE TABLE IF NOT EXISTS hours (
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day          SMALLINT NOT NULL CHECK (day BETWEEN 0 AND 6),
  open_time    TIME,
  close_time   TIME,
  closed       BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (business_id, day)
);

CREATE TABLE IF NOT EXISTS photos (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  storage_key  TEXT NOT NULL,
  url          TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_business_idx ON photos (business_id);

CREATE TABLE IF NOT EXISTS follows (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, business_id)
);
CREATE INDEX IF NOT EXISTS follows_business_idx ON follows (business_id);

-- Used only when QUEUE_DRIVER=pg (on-prem stand-in for SQS).
CREATE TABLE IF NOT EXISTS jobs (
  id          BIGSERIAL PRIMARY KEY,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
