/** FINELINE 3D - Blog API para Cloudflare Workers + D1.
 *  Montar no Worker EXISTENTE antes da resposta ASSETS.
 *  IMPORTANTÍSSIMO: isAdmin deve verificar no SERVIDOR a sessão do administrador;
 *  o padrão fail-closed bloqueia todo CRUD se não for passado.
 */
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const error = (message, status = 400) => json({ ok: false, error: message }, status);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const selectCols = `id,slug,title,excerpt,body,cover_image_url AS coverImageUrl,status,published_at AS publishedAt,created_at AS createdAt,updated_at AS updatedAt`;

export function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
}
function clean(raw = {}, prior) {
  const title = String(raw.title ?? prior?.title ?? '').trim();
  const body = String(raw.body ?? prior?.body ?? '').trim();
  const excerpt = String(raw.excerpt ?? prior?.excerpt ?? '').trim();
  const status = String(raw.status ?? prior?.status ?? 'draft');
  const slug = slugify(raw.slug ?? prior?.slug ?? title);
  const coverImageUrl = String(raw.coverImageUrl ?? prior?.coverImageUrl ?? '').trim();
  if (!title || title.length > 150) throw new Error('Título obrigatório (até 150 caracteres).');
  if (!body || body.length > 30000) throw new Error('Conteúdo obrigatório (até 30.000 caracteres).');
  if (excerpt.length > 300) throw new Error('Resumo deve ter até 300 caracteres.');
  if (!slug) throw new Error('Informe um título ou slug válido.');
  if (!['draft', 'published'].includes(status)) throw new Error('Status inválido.');
  if (coverImageUrl) {
    let url; try { url = new URL(coverImageUrl); } catch { throw new Error('URL da capa inválida.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL da capa deve usar HTTPS ou HTTP.');
  }
  return { title, body, excerpt, slug, status, coverImageUrl: coverImageUrl || null };
}
async function parseJson(request) {
  if (!String(request.headers.get('content-type') || '').includes('application/json')) throw new Error('Envie application/json.');
  const size = Number(request.headers.get('content-length'));
  if (size > 100_000) throw new Error('O conteúdo excede o limite permitido.');
  let value; try { value = await request.json(); } catch { throw new Error('JSON inválido.'); }
  if (value == null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dados inválidos.');
  return value;
}
const now = () => new Date().toISOString();
function mappedDbError(err) {
  const msg = String(err?.message || err || '');
  if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(msg)) return error('Já existe um artigo com este endereço (slug).', 409);
  console.error('[fineline-blog]', msg);
  return error('Não foi possível salvar o artigo. Verifique a migração D1 e o log do Worker.', 500);
}

/**
 * @param {Request} request
 * @param {object} env Cloudflare Worker bindings (DB é D1)
 * @param {object} ctx Contexto Worker
 * @param {{isAdmin?: (req:Request,env:object,ctx:object)=>Promise<boolean>|boolean}} options
 * @returns {Promise<Response|null>} null para rotas não atendidas.
 */
export async function handleFinelineBlogApi(request, env, ctx, { isAdmin } = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const publicRoot = '/api/fineline/blog';
  const adminRoot = '/api/fineline/admin/blog';
  const isPublicPath = path === publicRoot || path.startsWith(publicRoot + '/');
  const isAdminPath = path === adminRoot || path.startsWith(adminRoot + '/');
  if (!isPublicPath && !isAdminPath) return null;

  if (!env?.DB || typeof env.DB.prepare !== 'function') return error('Banco D1 não configurado.', 503);
  if (isAdminPath) {
    let permitted = false;
    try { permitted = typeof isAdmin === 'function' && await isAdmin(request, env, ctx) === true; }
    catch (e) { console.error('[fineline-blog-auth]', String(e)); }
    if (!permitted) return error('Acesso exclusivo do administrador.', 403);
  }
  try {
    if (!isAdminPath && request.method === 'GET' && path === publicRoot) {
      const { results } = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts WHERE status='published' ORDER BY published_at DESC, created_at DESC LIMIT 100`).all();
      return json({ ok: true, posts: results || [] });
    }
    if (!isAdminPath && request.method === 'GET' && path.startsWith(publicRoot + '/')) {
      const slug = decodeURIComponent(path.slice(publicRoot.length + 1));
      if (!/^[a-z0-9-]{1,90}$/.test(slug)) return error('Endereço do artigo inválido.', 400);
      const post = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts WHERE slug=? AND status='published'`).bind(slug).first();
      return post ? json({ ok: true, post }) : error('Artigo não encontrado.', 404);
    }
    if (isAdminPath && request.method === 'GET' && path === adminRoot) {
      const { results } = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts ORDER BY updated_at DESC LIMIT 300`).all();
      return json({ ok: true, posts: results || [] });
    }
    if (isAdminPath && request.method === 'POST' && path === adminRoot) {
      let data; try { data = clean(await parseJson(request)); } catch(e) { return error(e.message); }
      const id = crypto.randomUUID(); const date = now();
      const publishedAt = data.status === 'published' ? date : null;
      await env.DB.prepare(`INSERT INTO fineline_blog_posts (id,slug,title,excerpt,body,cover_image_url,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,data.slug,data.title,data.excerpt,data.body,data.coverImageUrl,data.status,publishedAt,date,date).run();
      const post = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts WHERE id=?`).bind(id).first();
      return json({ ok: true, post }, 201);
    }
    if (isAdminPath && path.startsWith(adminRoot + '/')) {
      const id = path.slice(adminRoot.length + 1);
      if (!/^[0-9a-f-]{36}$/.test(id)) return error('Identificador de artigo inválido.');
      const prior = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts WHERE id=?`).bind(id).first();
      if (!prior) return error('Artigo não encontrado.', 404);
      if (request.method === 'PATCH' || request.method === 'PUT') {
        let data; try { data = clean(await parseJson(request), prior); } catch(e) { return error(e.message); }
        const date = now();
        const publishedAt = data.status === 'published' ? (prior.publishedAt || date) : null;
        await env.DB.prepare(`UPDATE fineline_blog_posts SET slug=?,title=?,excerpt=?,body=?,cover_image_url=?,status=?,published_at=?,updated_at=? WHERE id=?`)
          .bind(data.slug,data.title,data.excerpt,data.body,data.coverImageUrl,data.status,publishedAt,date,id).run();
        const post = await env.DB.prepare(`SELECT ${selectCols} FROM fineline_blog_posts WHERE id=?`).bind(id).first();
        return json({ ok:true, post });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM fineline_blog_posts WHERE id=?`).bind(id).run();
        return json({ ok:true });
      }
    }
    return error('Método não permitido.', 405);
  } catch(e) { return mappedDbError(e); }
}
