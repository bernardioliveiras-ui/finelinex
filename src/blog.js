import {AppError,url} from './validation.js';
import {escapeHTML as esc,renderArticleText} from '../public/blog-format.js';
const canonical='https://fineline3d.com.br';
function text(v,max,required=false){if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new AppError('Confira o título, resumo e conteúdo do artigo.');return v.trim();}
function validatePost(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AppError('Artigo inválido.');
 const p={title:text(v.title,180,true),slug:text(v.slug,100,true),excerpt:text(v.excerpt,320,true),content:text(v.content,40000,true),cover_image:url(v.cover_image||'',true),external_url:url(v.external_url||'')};
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))throw new AppError('Use letras minúsculas, números e hífens no link do artigo.');
 if(p.cover_image.length>960000)throw new AppError('Use uma capa de até 700 KB.');
 if(!['draft','publish','unpublish'].includes(v.action))throw new AppError('Escolha salvar rascunho, publicar ou retirar do site.');
 return p;
}
function adminPost(row){const draft=JSON.parse(row.draft);return {...draft,id:row.id,slug:row.slug,version:row.version,published:!!row.published,has_unpublished_changes:!!row.published&&row.published!==row.draft,updated_at:row.updated_at,published_at:row.published_at};}
function publicPost(row){return {...JSON.parse(row.published),slug:row.slug,published_at:row.published_at,updated_at:row.updated_at};}
function checkStorageSize(draft,published){
 // D1 limits a row to 2 MB. Reserve room for the id, slug, dates and metadata.
 const encoder=new TextEncoder();
 if(encoder.encode(draft).length+encoder.encode(published||'').length>1980000)throw new AppError('O tamanho do artigo e da capa ultrapassa o limite. Reduza a imagem de capa ou use um link HTTPS para ela. Seu texto não foi alterado.');
}
export async function listPublished(db,limit=100,offset=0){if(!db)return [];return (await db.prepare('SELECT slug,published,published_at,updated_at FROM blog_posts WHERE published IS NOT NULL ORDER BY published_at DESC,id DESC LIMIT ? OFFSET ?').bind(limit,offset).all()).results.map(publicPost);}
export async function blogAdmin(db,path,method,readBody){
 const id=path.match(/^\/api\/admin\/posts\/([a-f0-9-]{36})$/i)?.[1];
 if(path==='/api/admin/posts'&&method==='GET')return {posts:(await db.prepare('SELECT id,slug,draft,published,version,updated_at,published_at FROM blog_posts ORDER BY updated_at DESC').all()).results.map(row=>{const p=adminPost(row);delete p.content;delete p.cover_image;return p;})};
 if(id&&method==='GET'){const row=await db.prepare('SELECT * FROM blog_posts WHERE id=?').bind(id).first();if(!row)throw new AppError('Artigo não encontrado.',404);return {post:adminPost(row)};}
 if(!(path==='/api/admin/posts'&&method==='POST')&&!(id&&method==='PUT'))throw new AppError('Endereço não encontrado.',404);
 const body=await readBody(),post=validatePost(body),now=new Date().toISOString();
 const payload=JSON.stringify(post);
 if(!id){
  if(body.action==='unpublish')throw new AppError('Salve o artigo antes de retirá-lo do site.');
  const newId=crypto.randomUUID(),published=body.action==='publish';
  checkStorageSize(payload,published?payload:null);
  const result=await db.prepare('INSERT OR IGNORE INTO blog_posts(id,slug,draft,published,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?)').bind(newId,post.slug,payload,published?payload:null,now,now,published?now:null).run();
  if(!result.meta.changes)throw new AppError('Já existe um artigo com esse link. Escolha outro endereço.',409);
  return {post:adminPost(await db.prepare('SELECT * FROM blog_posts WHERE id=?').bind(newId).first())};
 }
 const row=await db.prepare('SELECT * FROM blog_posts WHERE id=?').bind(id).first();if(!row)throw new AppError('Artigo não encontrado.',404);
 if(post.slug!==row.slug)throw new AppError('O link permanece fixo depois de salvar para preservar os compartilhamentos.');
 if(!Number.isInteger(body.version)||body.version<1)throw new AppError('Reabra o artigo antes de salvar.');
 const published=body.action==='publish'?payload:body.action==='unpublish'?null:row.published;
 checkStorageSize(payload,published);
 const publishedAt=body.action==='publish'?(row.published_at||now):row.published_at;
 const result=await db.prepare('UPDATE blog_posts SET draft=?,published=?,published_at=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(payload,published,publishedAt,now,id,body.version).run();
 if(!result.meta.changes)throw new AppError('Outra sessão atualizou este artigo. Copie seu texto e reabra o artigo antes de salvar.',409);
 return {post:adminPost(await db.prepare('SELECT * FROM blog_posts WHERE id=?').bind(id).first())};
}
const formatDate=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date(value));
export function articleCards(posts){return posts.map(p=>`<article class="blog-card">${p.cover_image?`<a href="/blog/${p.slug}" tabindex="-1" aria-hidden="true"><img src="${esc(p.cover_image)}" alt="" loading="lazy" width="600" height="360"></a>`:''}<div class="blog-card-body"><time datetime="${esc(p.published_at)}">${esc(formatDate(p.published_at))}</time><h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p><a class="text-link" href="/blog/${p.slug}">Ler artigo <span aria-hidden="true">→</span></a></div></article>`).join('');}
function page(title,description,path,content,status=200,image=''){
 const address=canonical+path;
 return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Fine Line 3D</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(address)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(address)}"><meta property="og:type" content="${path.startsWith('/blog/')?'article':'website'}">${image&&!image.startsWith('data:')?`<meta property="og:image" content="${esc(image.startsWith('/')?canonical+image:image)}">`:''}${status!==200?'<meta name="robots" content="noindex">':''}<link rel="icon" href="/assets/logo.png"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/blog.css"><script src="/blog.js" defer></script></head><body><header class="blog-header"><div class="wrap"><a class="brand" href="/"><img src="/assets/logo.png" alt="Logo Fine Line 3D" width="52" height="52"><span>FINE LINE <b>3D</b></span></a><nav aria-label="Navegação"><a href="/">Início</a><a href="/blog">Blog</a><a href="/#orcamento">Solicitar orçamento</a></nav></div></header><main>${content}</main><footer class="footer"><div class="wrap"><p>Fine Line 3D · Impressão e modelagem sob medida.</p><a href="/">Voltar ao site</a></div></footer></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
export async function blogPublic(request,db){
 const u=new URL(request.url),path=u.pathname.replace(/\/$/,'')||'/';
 if(!['GET','HEAD'].includes(request.method))return new Response('Método não permitido.',{status:405,headers:{Allow:'GET, HEAD'}});
 if(path==='/sitemap.xml'){
  const rows=db?(await db.prepare('SELECT slug,published_at FROM blog_posts WHERE published IS NOT NULL ORDER BY published_at DESC LIMIT 45000').all()).results:[];
  const links=[{path:'/'},{path:'/blog'},...rows.map(p=>({path:'/blog/'+p.slug,date:p.published_at}))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${links.map(p=>`<url><loc>${canonical}${esc(p.path)}</loc>${p.date?`<lastmod>${esc(p.date.slice(0,10))}</lastmod>`:''}</url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
 }
 if(path==='/blog'){
  const raw=u.searchParams.get('pagina')||'1';if(!/^[1-9]\d{0,4}$/.test(raw))throw new AppError('Página inválida.');const current=Number(raw);
  const posts=await listPublished(db,13,(current-1)*12),hasNext=posts.length>12;
  const listing=articleCards(posts.slice(0,12))||'<p class="blog-empty">Estamos preparando novos conteúdos sobre impressão e modelagem 3D. Volte em breve.</p>';
  return page('Blog','Conteúdos da Fine Line 3D sobre impressão, modelagem e projetos sob medida.','/blog'+(current>1?'?pagina='+current:''),`<section class="section"><div class="wrap"><p class="eyebrow">CONHECIMENTO PARA O SEU PROJETO</p><h1>Blog Fine Line 3D.</h1><p class="lead">Ideias, materiais e orientações para tirar sua peça do papel.</p><div class="blog-grid">${listing}</div><nav class="blog-pagination" aria-label="Páginas do blog">${current>1?`<a href="/blog?pagina=${current-1}">← Anterior</a>`:''}${hasNext?`<a href="/blog?pagina=${current+1}">Próxima →</a>`:''}</nav></div></section>`);
 }
 const slug=path.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1];
 const row=slug&&db?await db.prepare('SELECT slug,published,published_at,updated_at FROM blog_posts WHERE slug=? AND published IS NOT NULL').bind(slug).first():null;
 if(!row)return page('Artigo não encontrado','Este artigo não está disponível.',path,'<section class="section"><div class="wrap"><h1>Artigo não encontrado.</h1><p>O conteúdo pode ter sido retirado do site.</p><a href="/blog">Ver os artigos publicados →</a></div></section>',404);
 const p=publicPost(row);
 return page(p.title,p.excerpt,'/blog/'+slug,`<article class="article-wrap"><a class="text-link" href="/blog">← Todos os artigos</a><header class="article-heading"><p class="eyebrow">BLOG FINE LINE 3D</p><h1>${esc(p.title)}</h1><p class="lead">${esc(p.excerpt)}</p><time datetime="${esc(p.published_at)}">Publicado em ${esc(formatDate(p.published_at))}</time><button type="button" class="blog-share" id="share-article">Copiar link do artigo</button><span id="share-feedback" role="status"></span></header>${p.cover_image?`<img class="article-cover" src="${esc(p.cover_image)}" alt="Capa de ${esc(p.title)}" width="1000" height="600">`:''}<div class="article-content">${renderArticleText(p.content)}</div>${p.external_url?`<p class="article-reference"><a href="${esc(p.external_url)}" target="_blank" rel="noopener noreferrer">Acessar link externo ↗</a></p>`:''}<aside class="article-cta"><h2>Seu próximo projeto começa aqui.</h2><p>Conte com a Fine Line 3D para modelar e produzir a sua peça.</p><a class="button" href="/#orcamento">Solicitar orçamento ↗</a></aside></article>`,200,p.cover_image);
}
