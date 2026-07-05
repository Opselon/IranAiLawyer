-- D1 Database Schema for Vakil.AI

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  telegram_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  features TEXT, -- JSON string
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL, -- ACTIVE, CANCELLED, EXPIRED
  started_at TEXT,
  expires_at TEXT,
  meta TEXT, -- JSON string
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (plan_code) REFERENCES plans (code)
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT, -- HTML or Markdown
  category TEXT,
  tags TEXT, -- JSON array
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  author TEXT,
  is_published INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT, -- JSON string if needed
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initial Plans data
INSERT OR IGNORE INTO plans (id, code, name, price, currency, features, is_active) VALUES
('p1', 'FREE', 'پلن پایه', 0, 'IRR', '{"questions_per_day": 10}', 1),
('p2', 'PRO', 'پلن حرفه‌ای', 99000, 'IRR', '{"questions_per_day": "unlimited", "ocr": true, "voice": true}', 1);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at) WHERE is_published = 1;
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
