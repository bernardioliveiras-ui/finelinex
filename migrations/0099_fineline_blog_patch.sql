-- Migração independente: não altera tabelas antigas de blog ou pedidos.
CREATE TABLE IF NOT EXISTS fineline_blog_posts (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 excerpt TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL,
 cover_image_url TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fineline_blog_public ON fineline_blog_posts(status,published_at DESC);
