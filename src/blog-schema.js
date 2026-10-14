import {AppError} from './validation.js';
// Also supports deployments made with `wrangler deploy` without the migration step.
const initialized=new WeakMap();
export function ensureBlogSchema(db){
 if(!db)return Promise.resolve();
 if(!initialized.has(db))initialized.set(db,db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS blog_posts (id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,draft TEXT NOT NULL,published TEXT,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,published_at TEXT)`),
  db.prepare('CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at DESC) WHERE published IS NOT NULL'),
  db.prepare(`CREATE TABLE IF NOT EXISTS blog_feed (
 id INTEGER PRIMARY KEY CHECK (id=1),
 url TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0,
 payload TEXT NOT NULL DEFAULT '[]',
 version INTEGER NOT NULL DEFAULT 1,
 last_sync TEXT,
 last_error TEXT NOT NULL DEFAULT '',
 last_checked INTEGER NOT NULL DEFAULT 0
)`)
 ]).catch(error=>{initialized.delete(db);console.error('Inicialização do blog:',error.message);throw new AppError('Não foi possível preparar o banco do blog. Confira o vínculo DB e execute npm run deploy na Cloudflare. Seu texto continua no editor.',503);}));
 return initialized.get(db);
}
