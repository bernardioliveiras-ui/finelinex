CREATE TABLE IF NOT EXISTS blog_posts (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 draft TEXT NOT NULL,
 published TEXT,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at DESC) WHERE published IS NOT NULL;
